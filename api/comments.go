package main

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
)

const maxCommentLen = 2000

type createCommentRequest struct {
	Body     string `json:"body"`
	ParentID *int64 `json:"parent_id"`
}

// ---------------------------------------------------------------- create

func (a *App) handleCreateComment(w http.ResponseWriter, r *http.Request) {
	listID, err := strconv.ParseInt(chi.URLParam(r, "listID"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "bad list id")
		return
	}

	var req createCommentRequest
	if err := decodeJSON(w, r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	req.Body = strings.TrimSpace(req.Body)
	if req.Body == "" {
		writeError(w, http.StatusBadRequest, "a comment cannot be empty")
		return
	}
	if len(req.Body) > maxCommentLen {
		writeError(w, http.StatusBadRequest, "comments must be under 2000 characters")
		return
	}

	// The list must exist and be readable before anyone can comment on it.
	var exists bool
	if err := a.DB.QueryRow(r.Context(),
		`SELECT EXISTS (SELECT 1 FROM lists WHERE id = $1 AND is_public)`, listID,
	).Scan(&exists); err != nil {
		writeError(w, http.StatusInternalServerError, "could not post the comment")
		return
	}
	if !exists {
		writeError(w, http.StatusNotFound, "no such list")
		return
	}

	parentID, err := a.resolveParent(r, listID, req.ParentID)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	userID := userIDFrom(r.Context())

	var c Comment
	var body string
	var author Author
	err = a.DB.QueryRow(r.Context(), `
		WITH inserted AS (
			INSERT INTO comments (list_id, user_id, parent_id, body)
			VALUES ($1, $2, $3, $4)
			RETURNING id, body, parent_id, created_at, user_id
		)
		SELECT i.id, i.body, i.parent_id, i.created_at,
		       u.username, u.display_name, u.avatar_path
		FROM inserted i JOIN users u ON u.id = i.user_id`,
		listID, userID, parentID, req.Body,
	).Scan(&c.ID, &body, &c.ParentID, &c.CreatedAt, &author.Username,
		&author.DisplayName, &author.AvatarURL)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not post the comment")
		return
	}

	author.AvatarURL = a.avatarURL(author.AvatarURL)
	c.Body = &body
	c.Author = &author
	c.Replies = []Comment{}
	writeJSON(w, http.StatusCreated, c)
}

// resolveParent keeps threading exactly one level deep. Replying to a reply is
// a normal thing for people to try, so instead of rejecting it we re-point it
// at the top-level comment the conversation started from.
func (a *App) resolveParent(r *http.Request, listID int64, requested *int64) (*int64, error) {
	if requested == nil {
		return nil, nil
	}

	var parentOfParent *int64
	var parentListID int64
	err := a.DB.QueryRow(r.Context(),
		`SELECT parent_id, list_id FROM comments WHERE id = $1`, *requested,
	).Scan(&parentOfParent, &parentListID)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errors.New("the comment being replied to no longer exists")
	}
	if err != nil {
		return nil, errors.New("could not post the comment")
	}
	if parentListID != listID {
		return nil, errors.New("that comment belongs to a different list")
	}

	if parentOfParent != nil {
		return parentOfParent, nil // flatten a reply-to-a-reply
	}
	return requested, nil
}

// ------------------------------------------------------------------ read

func (a *App) handleListComments(w http.ResponseWriter, r *http.Request) {
	listID, err := strconv.ParseInt(chi.URLParam(r, "listID"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "bad list id")
		return
	}

	// One query for the whole thread. Ordered oldest first, which means a
	// parent is always seen before its replies and the tree can be assembled
	// in a single pass.
	rows, err := a.DB.Query(r.Context(), `
		SELECT c.id, c.body, c.parent_id, c.created_at, c.deleted_at IS NOT NULL,
		       u.username, u.display_name, u.avatar_path
		FROM comments c
		JOIN users u ON u.id = c.user_id
		WHERE c.list_id = $1
		ORDER BY c.created_at`, listID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load comments")
		return
	}
	defer rows.Close()

	ordered := []*Comment{}
	index := map[int64]*Comment{}

	for rows.Next() {
		c := &Comment{Replies: []Comment{}}
		var body string
		var author Author
		if err := rows.Scan(&c.ID, &body, &c.ParentID, &c.CreatedAt, &c.Deleted,
			&author.Username, &author.DisplayName, &author.AvatarURL); err != nil {
			writeError(w, http.StatusInternalServerError, "could not load comments")
			return
		}
		// A removed comment keeps its place in the thread but gives up its
		// text and its author — neither is sent to the client at all.
		if !c.Deleted {
			author.AvatarURL = a.avatarURL(author.AvatarURL)
			c.Body = &body
			c.Author = &author
		}
		ordered = append(ordered, c)
		index[c.ID] = c
	}
	if err := rows.Err(); err != nil {
		writeError(w, http.StatusInternalServerError, "could not load comments")
		return
	}

	roots := []Comment{}
	for _, c := range ordered {
		if c.ParentID == nil {
			continue
		}
		// A reply can never have children of its own, so a removed one is
		// holding nothing up — drop it rather than leaving a tombstone.
		if c.Deleted {
			continue
		}
		if parent, ok := index[*c.ParentID]; ok {
			parent.Replies = append(parent.Replies, *c)
		}
	}
	for _, c := range ordered {
		if c.ParentID != nil {
			continue
		}
		// A tombstone with nothing hanging off it is just noise — drop it.
		if c.Deleted && len(c.Replies) == 0 {
			continue
		}
		roots = append(roots, *c)
	}

	writeJSON(w, http.StatusOK, roots)
}

// ---------------------------------------------------------------- delete

func (a *App) handleDeleteComment(w http.ResponseWriter, r *http.Request) {
	commentID, err := strconv.ParseInt(chi.URLParam(r, "commentID"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "bad comment id")
		return
	}

	// The user_id check is part of the UPDATE rather than a separate read, so
	// there is no window between "is this yours" and "delete it".
	tag, err := a.DB.Exec(r.Context(), `
		UPDATE comments SET deleted_at = now()
		WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
		commentID, userIDFrom(r.Context()))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not remove the comment")
		return
	}
	if tag.RowsAffected() == 0 {
		// Same response whether it does not exist or belongs to someone else,
		// so this cannot be used to probe for other people's comment ids.
		writeError(w, http.StatusNotFound, "no such comment")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
