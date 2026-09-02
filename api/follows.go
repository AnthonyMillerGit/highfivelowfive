package main

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
)

// handleFollow makes the caller a follower of {username}.
//
// Idempotent: following someone you already follow is a no-op rather than an
// error. The UI can fire this on a click without first checking state, and a
// double-click cannot produce a duplicate or a spurious failure.
func (a *App) handleFollow(w http.ResponseWriter, r *http.Request) {
	followeeID, ok := a.lookupUserID(w, r)
	if !ok {
		return
	}

	followerID := userIDFrom(r.Context())
	if followerID == followeeID {
		writeError(w, http.StatusBadRequest, "you cannot follow yourself")
		return
	}

	if _, err := a.DB.Exec(r.Context(), `
		INSERT INTO follows (follower_id, followee_id)
		VALUES ($1, $2)
		ON CONFLICT DO NOTHING`, followerID, followeeID); err != nil {
		writeError(w, http.StatusInternalServerError, "could not follow")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// handleUnfollow is the mirror, and equally idempotent: unfollowing someone
// you do not follow succeeds quietly.
func (a *App) handleUnfollow(w http.ResponseWriter, r *http.Request) {
	followeeID, ok := a.lookupUserID(w, r)
	if !ok {
		return
	}

	if _, err := a.DB.Exec(r.Context(),
		`DELETE FROM follows WHERE follower_id = $1 AND followee_id = $2`,
		userIDFrom(r.Context()), followeeID); err != nil {
		writeError(w, http.StatusInternalServerError, "could not unfollow")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// lookupUserID resolves the {username} in the path, writing the 404 itself so
// both handlers stay short. The bool says whether to keep going.
func (a *App) lookupUserID(w http.ResponseWriter, r *http.Request) (int64, bool) {
	var id int64
	err := a.DB.QueryRow(r.Context(),
		`SELECT id FROM users WHERE username = $1`, chi.URLParam(r, "username"),
	).Scan(&id)

	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "no such user")
		return 0, false
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not find that user")
		return 0, false
	}
	return id, true
}
