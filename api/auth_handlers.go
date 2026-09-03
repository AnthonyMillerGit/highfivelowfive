package main

import (
	"context"
	"errors"
	"net/http"
	"regexp"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// Mirrors the CHECK constraint in 001_init.sql. Validating in both places is
// intentional: the app gives a friendly message, the database guarantees truth.
var usernameRe = regexp.MustCompile(`^[a-zA-Z0-9_]{3,30}$`)

const minPasswordLen = 8

type signupRequest struct {
	Email    string `json:"email"`
	Username string `json:"username"`
	Password string `json:"password"`
}

type loginRequest struct {
	// Accepts either an email or a username, so people don't have to remember
	// which one they signed up with.
	Identifier string `json:"identifier"`
	Password   string `json:"password"`
}

type authResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

// ------------------------------------------------------------------ signup

func (a *App) handleSignup(w http.ResponseWriter, r *http.Request) {
	var req signupRequest
	if err := decodeJSON(w, r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	req.Email = strings.TrimSpace(req.Email)
	req.Username = strings.TrimSpace(req.Username)

	if !strings.Contains(req.Email, "@") || len(req.Email) < 3 {
		writeError(w, http.StatusBadRequest, "a valid email is required")
		return
	}
	if !usernameRe.MatchString(req.Username) {
		writeError(w, http.StatusBadRequest,
			"username must be 3-30 characters: letters, numbers, underscore")
		return
	}
	if len(req.Password) < minPasswordLen {
		writeError(w, http.StatusBadRequest, "password must be at least 8 characters")
		return
	}

	hash, err := HashPassword(req.Password)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create account")
		return
	}

	var u User
	err = a.DB.QueryRow(r.Context(), `
		INSERT INTO users (email, username, password_hash)
		VALUES ($1, $2, $3)
		RETURNING id, email, username, display_name, bio, created_at`,
		req.Email, req.Username, hash,
	).Scan(&u.ID, &u.Email, &u.Username, &u.DisplayName, &u.Bio, &u.CreatedAt)

	if err != nil {
		// 23505 is Postgres's unique_violation. The constraint name tells us
		// which field collided, so we can say something actionable.
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			field := "email"
			if strings.Contains(pgErr.ConstraintName, "username") {
				field = "username"
			}
			writeError(w, http.StatusConflict, "that "+field+" is already taken")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not create account")
		return
	}

	a.respondWithToken(w, u)
}

// ------------------------------------------------------------------- login

func (a *App) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := decodeJSON(w, r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	req.Identifier = strings.TrimSpace(req.Identifier)

	var u User
	var hash string
	err := a.DB.QueryRow(r.Context(), `
		SELECT id, email, username, display_name, bio, avatar_path, created_at, password_hash
		FROM users
		WHERE email = $1 OR username = $1`,
		req.Identifier,
	).Scan(&u.ID, &u.Email, &u.Username, &u.DisplayName, &u.Bio, &u.AvatarURL,
		&u.CreatedAt, &hash)

	if errors.Is(err, pgx.ErrNoRows) {
		// Burn roughly the same time bcrypt would have taken on a real user, so
		// response timing cannot be used to discover which accounts exist.
		_ = CheckPassword("$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy", req.Password)
		writeError(w, http.StatusUnauthorized, "incorrect login or password")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not sign in")
		return
	}

	u.AvatarURL = a.avatarURL(u.AvatarURL)

	if !CheckPassword(hash, req.Password) {
		// Same message as "no such user" on purpose: never confirm which half
		// of the credentials was wrong.
		writeError(w, http.StatusUnauthorized, "incorrect login or password")
		return
	}

	a.respondWithToken(w, u)
}

// ---------------------------------------------------------------------- me

// handleMe returns the logged-in user. The frontend calls this on page load to
// turn a stored token back into a user, rather than trusting cached data.
func (a *App) handleMe(w http.ResponseWriter, r *http.Request) {
	u, err := a.userByID(r.Context(), userIDFrom(r.Context()))
	if err != nil {
		writeError(w, http.StatusUnauthorized, "not signed in")
		return
	}
	writeJSON(w, http.StatusOK, u)
}

func (a *App) userByID(ctx context.Context, id int64) (User, error) {
	var u User
	err := a.DB.QueryRow(ctx, `
		SELECT id, email, username, display_name, bio, avatar_path, created_at
		FROM users WHERE id = $1`, id,
	).Scan(&u.ID, &u.Email, &u.Username, &u.DisplayName, &u.Bio,
		&u.AvatarURL, &u.CreatedAt)
	// The column holds a filename; everything outside this package wants a URL.
	u.AvatarURL = a.avatarURL(u.AvatarURL)
	return u, err
}

func (a *App) respondWithToken(w http.ResponseWriter, u User) {
	token, err := a.issueToken(u.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not issue token")
		return
	}
	writeJSON(w, http.StatusOK, authResponse{Token: token, User: u})
}
