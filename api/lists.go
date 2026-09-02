package main

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

const (
	maxTitleLen = 200
	maxDescLen  = 2000
	maxNoteLen  = 1000
	maxItems    = 100
	previewSize = 3
)

type createItemRequest struct {
	Title string  `json:"title"`
	Note  *string `json:"note"`
}

type createListRequest struct {
	Title       string              `json:"title"`
	Description *string             `json:"description"`
	IsRanked    *bool               `json:"is_ranked"` // pointer: omitted means true
	Items       []createItemRequest `json:"items"`
}

// ---------------------------------------------------------------- create

func (a *App) handleCreateList(w http.ResponseWriter, r *http.Request) {
	var req createListRequest
	if err := decodeJSON(w, r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	req.Title = strings.TrimSpace(req.Title)
	if req.Title == "" || len(req.Title) > maxTitleLen {
		writeError(w, http.StatusBadRequest, "a title of 1-200 characters is required")
		return
	}
	if req.Description != nil && len(*req.Description) > maxDescLen {
		writeError(w, http.StatusBadRequest, "description must be under 2000 characters")
		return
	}
	if len(req.Items) == 0 {
		writeError(w, http.StatusBadRequest, "a list needs at least one item")
		return
	}
	if len(req.Items) > maxItems {
		writeError(w, http.StatusBadRequest, "a list can hold at most 100 items")
		return
	}
	for i := range req.Items {
		req.Items[i].Title = strings.TrimSpace(req.Items[i].Title)
		if req.Items[i].Title == "" || len(req.Items[i].Title) > maxTitleLen {
			writeError(w, http.StatusBadRequest, "every item needs a title of 1-200 characters")
			return
		}
		if req.Items[i].Note != nil && len(*req.Items[i].Note) > maxNoteLen {
			writeError(w, http.StatusBadRequest, "notes must be under 1000 characters")
			return
		}
	}

	userID := userIDFrom(r.Context())

	// The slug is derived from the title, so two lists named the same thing
	// race for it. insertList picks the first free slug inside its
	// transaction; if a concurrent create takes it between the check and the
	// insert, the unique constraint rejects us and we simply try again.
	var list List
	var err error
	for attempt := 0; attempt < 3; attempt++ {
		list, err = a.insertList(r.Context(), userID, req)
		if err == nil {
			break
		}
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			continue
		}
		break
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not save the list")
		return
	}

	writeJSON(w, http.StatusCreated, list)
}

// insertList writes the list and all its items, or nothing at all. Without a
// transaction a failure partway through would leave a titled list with half
// its items — visible to everyone and awkward to detect.
func (a *App) insertList(ctx context.Context, userID int64, req createListRequest) (List, error) {
	var list List

	tx, err := a.DB.Begin(ctx)
	if err != nil {
		return list, err
	}
	// Rollback after a successful Commit is a no-op, so this is safe to defer
	// unconditionally and guarantees we never leak an open transaction.
	defer tx.Rollback(ctx)

	slug, err := uniqueSlug(ctx, tx, userID, Slugify(req.Title))
	if err != nil {
		return list, err
	}

	isRanked := true
	if req.IsRanked != nil {
		isRanked = *req.IsRanked
	}

	err = tx.QueryRow(ctx, `
		INSERT INTO lists (user_id, title, slug, description, is_ranked)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, title, slug, description, is_ranked, created_at`,
		userID, req.Title, slug, req.Description, isRanked,
	).Scan(&list.ID, &list.Title, &list.Slug, &list.Description,
		&list.IsRanked, &list.CreatedAt)
	if err != nil {
		return list, err
	}

	// Rank comes from the order the client sent, not from the client itself —
	// so a caller cannot submit duplicate or negative ranks.
	list.Items = make([]ListItem, 0, len(req.Items))
	for i, it := range req.Items {
		var saved ListItem
		err = tx.QueryRow(ctx, `
			INSERT INTO list_items (list_id, rank, title, note)
			VALUES ($1, $2, $3, $4)
			RETURNING id, rank, title, note`,
			list.ID, i+1, it.Title, it.Note,
		).Scan(&saved.ID, &saved.Rank, &saved.Title, &saved.Note)
		if err != nil {
			return List{}, err
		}
		list.Items = append(list.Items, saved)
	}

	if err := tx.Commit(ctx); err != nil {
		return List{}, err
	}

	list.ItemCount = len(list.Items)
	return list, nil
}

// uniqueSlug returns base, or base-2, base-3... — whichever this user has not
// used. One query fetches every slug already in the family rather than probing
// the database once per candidate.
func uniqueSlug(ctx context.Context, tx pgx.Tx, userID int64, base string) (string, error) {
	rows, err := tx.Query(ctx, `
		SELECT slug FROM lists
		WHERE user_id = $1 AND (slug = $2 OR slug LIKE $2 || '-%')`,
		userID, base)
	if err != nil {
		return "", err
	}
	defer rows.Close()

	taken := map[string]bool{}
	for rows.Next() {
		var s string
		if err := rows.Scan(&s); err != nil {
			return "", err
		}
		taken[s] = true
	}
	if err := rows.Err(); err != nil {
		return "", err
	}

	if !taken[base] {
		return base, nil
	}
	for n := 2; ; n++ {
		candidate := base + "-" + strconv.Itoa(n)
		if !taken[candidate] {
			return candidate, nil
		}
	}
}

// ------------------------------------------------------------------ read

// listCardSelect is the card shape the profile grid and the feed both render.
// Both read the same thing, so both build on the same SELECT — otherwise the
// two drift and a field added for one silently goes missing from the other.
const listCardSelect = `
	SELECT l.id, l.title, l.slug, l.description, l.is_ranked, l.created_at,
	       u.username, u.display_name,
	       (SELECT COUNT(*) FROM list_items li WHERE li.list_id = l.id),
	       (SELECT COUNT(*) FROM comments   c  WHERE c.list_id  = l.id AND c.deleted_at IS NULL)
	FROM lists l
	JOIN users u ON u.id = l.user_id
	`

// loadCards runs a listCardSelect-shaped query and fills in every card's
// preview. Two queries total, whatever the page size.
func (a *App) loadCards(ctx context.Context, sql string, args ...any) ([]List, error) {
	rows, err := a.DB.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	lists := []List{}
	byID := map[int64]int{} // list id -> index in lists, for attaching previews
	ids := []int64{}

	for rows.Next() {
		var l List
		if err := rows.Scan(&l.ID, &l.Title, &l.Slug, &l.Description, &l.IsRanked,
			&l.CreatedAt, &l.Author.Username, &l.Author.DisplayName,
			&l.ItemCount, &l.CommentCount); err != nil {
			return nil, err
		}
		l.Preview = []ListItem{}
		byID[l.ID] = len(lists)
		ids = append(ids, l.ID)
		lists = append(lists, l)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	if err := a.attachPreviews(ctx, ids, byID, lists); err != nil {
		return nil, err
	}
	return lists, nil
}

func (a *App) handleUserLists(w http.ResponseWriter, r *http.Request) {
	username := chi.URLParam(r, "username")

	lists, err := a.loadCards(r.Context(), listCardSelect+`
		WHERE u.username = $1 AND l.is_public
		ORDER BY l.created_at DESC
		LIMIT 50`, username)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load lists")
		return
	}

	// An empty result is ambiguous: the user has no lists, or there is no such
	// user. Only then is it worth a second query to tell those apart, so a
	// mistyped URL 404s instead of rendering as an empty profile.
	if len(lists) == 0 {
		var exists bool
		if err := a.DB.QueryRow(r.Context(),
			`SELECT EXISTS (SELECT 1 FROM users WHERE username = $1)`, username,
		).Scan(&exists); err != nil {
			writeError(w, http.StatusInternalServerError, "could not load lists")
			return
		}
		if !exists {
			writeError(w, http.StatusNotFound, "no such user")
			return
		}
	}

	writeJSON(w, http.StatusOK, lists)
}

// handleFeed returns lists from the people the caller follows.
//
// This is the whole feed: a join through follows, newest first. There is no
// activity table and no fan-out on write, because the only event the feed
// shows is "a list was published" — and lists already carry their own
// timestamp. That stays true until the feed needs to show something that is
// not a list.
func (a *App) handleFeed(w http.ResponseWriter, r *http.Request) {
	lists, err := a.loadCards(r.Context(), listCardSelect+`
		JOIN follows f ON f.followee_id = l.user_id
		WHERE f.follower_id = $1 AND l.is_public
		ORDER BY l.created_at DESC
		LIMIT 50`, userIDFrom(r.Context()))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load the feed")
		return
	}
	writeJSON(w, http.StatusOK, lists)
}

// attachPreviews fills in the first few items of every list in one round trip.
// ROW_NUMBER() partitions by list and numbers each list's items from its own
// rank 1, so a single WHERE clause keeps the top N of every list at once.
func (a *App) attachPreviews(ctx context.Context, ids []int64, byID map[int64]int, lists []List) error {
	if len(ids) == 0 {
		return nil
	}

	rows, err := a.DB.Query(ctx, `
		SELECT list_id, id, rank, title, note FROM (
			SELECT list_id, id, rank, title, note,
			       ROW_NUMBER() OVER (PARTITION BY list_id ORDER BY rank, id) AS rn
			FROM list_items
			WHERE list_id = ANY($1)
		) ranked
		WHERE rn <= $2
		ORDER BY list_id, rank`, ids, previewSize)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var listID int64
		var item ListItem
		if err := rows.Scan(&listID, &item.ID, &item.Rank, &item.Title, &item.Note); err != nil {
			return err
		}
		if i, ok := byID[listID]; ok {
			lists[i].Preview = append(lists[i].Preview, item)
		}
	}
	return rows.Err()
}
func (a *App) handleList(w http.ResponseWriter, r *http.Request) {
	username := chi.URLParam(r, "username")
	slug := chi.URLParam(r, "slug")

	var l List
	err := a.DB.QueryRow(r.Context(), `
		SELECT l.id, l.title, l.slug, l.description, l.is_ranked, l.created_at,
		       u.username, u.display_name,
		       (SELECT COUNT(*) FROM comments c WHERE c.list_id = l.id AND c.deleted_at IS NULL)
		FROM lists l
		JOIN users u ON u.id = l.user_id
		WHERE u.username = $1 AND l.slug = $2 AND l.is_public`,
		username, slug,
	).Scan(&l.ID, &l.Title, &l.Slug, &l.Description, &l.IsRanked, &l.CreatedAt,
		&l.Author.Username, &l.Author.DisplayName, &l.CommentCount)

	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "no such list")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load the list")
		return
	}

	rows, err := a.DB.Query(r.Context(), `
		SELECT id, rank, title, note FROM list_items
		WHERE list_id = $1 ORDER BY rank, id`, l.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load the list")
		return
	}
	defer rows.Close()

	l.Items = []ListItem{}
	for rows.Next() {
		var item ListItem
		if err := rows.Scan(&item.ID, &item.Rank, &item.Title, &item.Note); err != nil {
			writeError(w, http.StatusInternalServerError, "could not load the list")
			return
		}
		l.Items = append(l.Items, item)
	}
	if err := rows.Err(); err != nil {
		writeError(w, http.StatusInternalServerError, "could not load the list")
		return
	}
	l.ItemCount = len(l.Items)

	writeJSON(w, http.StatusOK, l)
}

// handleProfile returns the header of a user's public page.
//
// Runs behind OptionalAuth, so the caller may be nobody. The viewer-relative
// answers are computed in the same query rather than fetched separately: a
// zero user id simply never matches a follows row.
func (a *App) handleProfile(w http.ResponseWriter, r *http.Request) {
	username := chi.URLParam(r, "username")
	viewerID := userIDFrom(r.Context())

	var p Profile
	err := a.DB.QueryRow(r.Context(), `
		SELECT u.username, u.display_name, u.bio,
		       (SELECT COUNT(*) FROM lists   l WHERE l.user_id     = u.id AND l.is_public),
		       (SELECT COUNT(*) FROM follows f WHERE f.followee_id = u.id),
		       (SELECT COUNT(*) FROM follows f WHERE f.follower_id = u.id),
		       EXISTS (SELECT 1 FROM follows f
		               WHERE f.follower_id = $2 AND f.followee_id = u.id),
		       u.id = $2
		FROM users u WHERE u.username = $1`, username, viewerID,
	).Scan(&p.Username, &p.DisplayName, &p.Bio, &p.ListCount,
		&p.FollowerCount, &p.FollowingCount, &p.IsFollowing, &p.IsSelf)

	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "no such user")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load the profile")
		return
	}
	writeJSON(w, http.StatusOK, p)
}
