package main

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

const tokenLifetime = 7 * 24 * time.Hour

// contextKey is a private type so no other package can collide with our
// context key. Using a bare string here is a classic subtle bug.
type contextKey string

const userIDKey contextKey = "userID"

// ---------------------------------------------------------------- passwords

// HashPassword runs bcrypt over the plaintext. bcrypt is deliberately slow and
// salts each hash automatically, so two users with the same password get
// different hashes and brute-forcing a stolen database is expensive.
func HashPassword(plain string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.DefaultCost)
	return string(b), err
}

// CheckPassword re-hashes the attempt with the stored salt and compares.
// The plaintext password is never stored, so this is the only way to verify.
func CheckPassword(hash, plain string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(plain)) == nil
}

// ------------------------------------------------------------------- tokens

type Claims struct {
	UserID int64 `json:"uid"`
	jwt.RegisteredClaims
}

// issueToken builds a JWT: a JSON payload plus a signature made with our
// secret. Anyone can read the contents (it is only base64, not encrypted), but
// nobody can forge one without the secret. So never put anything private in it.
func (a *App) issueToken(userID int64) (string, error) {
	now := time.Now()
	claims := Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(tokenLifetime)),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).
		SignedString([]byte(a.Cfg.JWTSecret))
}

func (a *App) parseToken(tokenStr string) (*Claims, error) {
	claims := &Claims{}
	_, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (any, error) {
		// Pin the algorithm. Without this check an attacker could hand us a
		// token that says alg:"none" and we would happily trust it.
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(a.Cfg.JWTSecret), nil
	})
	if err != nil {
		return nil, err
	}
	if claims.UserID == 0 {
		return nil, errors.New("token has no user")
	}
	return claims, nil
}

// --------------------------------------------------------------- middleware

// RequireAuth wraps protected routes. It rejects the request before the
// handler runs, so handlers behind it can assume a logged-in user exists.
func (a *App) RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		header := r.Header.Get("Authorization")
		token, found := strings.CutPrefix(header, "Bearer ")
		if !found || token == "" {
			writeError(w, http.StatusUnauthorized, "missing bearer token")
			return
		}

		claims, err := a.parseToken(token)
		if err != nil {
			writeError(w, http.StatusUnauthorized, "invalid or expired token")
			return
		}

		// Stash the user id on the request context for downstream handlers.
		ctx := context.WithValue(r.Context(), userIDKey, claims.UserID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// userIDFrom pulls the id RequireAuth stored. Only safe behind RequireAuth.
func userIDFrom(ctx context.Context) int64 {
	id, _ := ctx.Value(userIDKey).(int64)
	return id
}
