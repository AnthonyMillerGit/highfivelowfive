package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
)

// takePrompt is what a list demands of anyone answering it: whether the order
// is a ranking, and what its rows are called.
//
// It is loaded from the list being taken rather than from the original, which
// is the same thing — a take already had to match the original to exist.
type takePrompt struct {
	RootID int64     // what the new take will point at
	Ranked bool      // the taker does not get to decide this
	Labels []*string // one per row, in rank order
}

// takeTarget reads the prompt a list sets, and works out what a take on it
// should answer.
//
// A take on a take points at the original, not at the middle one. Chains would
// be unreadable and would quietly drain the count on the list that actually
// started it — the same reason replies to replies flatten into one level.
func (a *App) takeTarget(ctx context.Context, listID int64) (takePrompt, error) {
	var p takePrompt
	err := a.DB.QueryRow(ctx, `
		SELECT COALESCE(l.origin_id, l.id), l.is_ranked
		FROM lists l WHERE l.id = $1 AND l.is_public`, listID,
	).Scan(&p.RootID, &p.Ranked)
	if err != nil {
		return p, err
	}

	rows, err := a.DB.Query(ctx,
		`SELECT label FROM list_items WHERE list_id = $1 ORDER BY rank, id`, listID)
	if err != nil {
		return p, err
	}
	defer rows.Close()

	for rows.Next() {
		var label *string
		if err := rows.Scan(&label); err != nil {
			return p, err
		}
		p.Labels = append(p.Labels, label)
	}
	return p, rows.Err()
}

// checkTakeShape decides whether a submitted take honours the list it answers,
// returning what to tell the author, or "" if it does.
//
// The shape is the question; the row titles are the answer. So labels have to
// survive and titles never do. What "same shape" means depends on the kind of
// list, and that is read from the data exactly as the list page reads it: a
// label used more than once is a tier heading, and a tier holds as much as you
// put in it. A label used once is that row's own name, and those rows are
// fixed — ten years means ten films, in those years.
func checkTakeShape(originLabels []*string, items []itemRequest) string {
	seen := map[string]int{}
	for _, l := range originLabels {
		if l != nil {
			seen[*l]++
		}
	}
	grouped := false
	for _, n := range seen {
		if n > 1 {
			grouped = true
			break
		}
	}

	if grouped {
		for _, it := range items {
			if it.Label == nil || seen[*it.Label] == 0 {
				return "every row has to sit under one of the original's tiers"
			}
		}
		return ""
	}

	if len(items) != len(originLabels) {
		return fmt.Sprintf("this list has %d %s, so a take on it needs %d",
			len(originLabels), plural(len(originLabels), "row", "rows"), len(originLabels))
	}
	for i := range items {
		want, got := originLabels[i], items[i].Label
		if (want == nil) != (got == nil) || (want != nil && *want != *got) {
			return "a take has to keep the original's row labels"
		}
	}
	return ""
}

func plural(n int, one, many string) string {
	if n == 1 {
		return one
	}
	return many
}

func (a *App) handleCreateTake(w http.ResponseWriter, r *http.Request) {
	listID, err := strconv.ParseInt(chi.URLParam(r, "listID"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "bad list id")
		return
	}

	var req listRequest
	if err := decodeJSON(w, r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if msg := req.normalize(); msg != "" {
		writeError(w, http.StatusBadRequest, msg)
		return
	}

	prompt, err := a.takeTarget(r.Context(), listID)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "no such list")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not read that list")
		return
	}

	// Checked here and not only in the builder. The form makes the right shape
	// easy; this is what makes it true.
	if msg := checkTakeShape(prompt.Labels, req.Items); msg != "" {
		writeError(w, http.StatusBadRequest, msg)
		return
	}

	// Whether the order is a ranking belongs to the list being answered, so it
	// is taken from the prompt rather than believed from the request.
	req.IsRanked = &prompt.Ranked

	list, err := a.createListWithRetry(r.Context(), userIDFrom(r.Context()), req, &prompt.RootID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not save your take")
		return
	}
	writeJSON(w, http.StatusCreated, list)
}

// handleListTakes returns everyone's answers to one list.
func (a *App) handleListTakes(w http.ResponseWriter, r *http.Request) {
	listID, err := strconv.ParseInt(chi.URLParam(r, "listID"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "bad list id")
		return
	}

	takes, err := a.loadCards(r.Context(), listCardSelect+`
		WHERE l.origin_id = $1 AND l.is_public
		ORDER BY l.created_at DESC
		LIMIT 50`, listID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load the takes")
		return
	}
	writeJSON(w, http.StatusOK, takes)
}

// listRef assembles the pointer back to an origin from a LEFT JOIN that may
// have matched nothing. All three arrive together or not at all.
func listRef(username, slug, title *string) *ListRef {
	if username == nil || slug == nil || title == nil {
		return nil
	}
	return &ListRef{Username: *username, Slug: *slug, Title: *title}
}
