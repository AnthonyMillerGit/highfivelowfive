package main

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/cors"
)

// App carries the shared dependencies every handler needs. Passing this around
// instead of using package-level globals keeps handlers testable.
type App struct {
	DB  *pgxpool.Pool
	Cfg Config
}

func main() {
	ctx := context.Background()
	cfg := LoadConfig()

	pool := Connect(ctx, cfg.DatabaseURL)
	defer pool.Close()

	app := &App{DB: pool, Cfg: cfg}

	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)                 // a panic returns 500, not a dead server
	r.Use(middleware.Timeout(30 * time.Second)) // no request hangs forever

	// The browser refuses cross-origin calls unless the server opts in.
	// Vite serves the React app on :5173, the API runs on :8081 — different
	// origins, so without this every fetch from the frontend fails.
	r.Use(cors.New(cors.Options{
		AllowedOrigins:   []string{cfg.CORSOrigin},
		AllowedMethods:   []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
	}).Handler)

	r.Get("/health", app.handleHealth)

	// Uploaded avatars. Everything under here was written by this server as a
	// JPEG it encoded itself, so there is no user-authored markup to be served
	// back and interpreted — nosniff keeps it that way for nothing.
	r.Handle("/media/*", http.StripPrefix("/media/",
		mediaHeaders(http.FileServer(http.Dir(cfg.MediaDir)))))

	// Public: anyone may sign up or sign in.
	r.Post("/api/auth/signup", app.handleSignup)
	r.Post("/api/auth/login", app.handleLogin)

	// Public reads: profiles and lists are readable without an account.
	r.Get("/api/users/{username}/lists", app.handleUserLists)
	r.Get("/api/users/{username}/lists/{slug}", app.handleList)
	r.Get("/api/lists/{listID}/comments", app.handleListComments)

	// Public, but better with a viewer: the profile reports whether the caller
	// already follows this person, which needs a name when there is one.
	r.Group(func(r chi.Router) {
		r.Use(app.OptionalAuth)
		r.Get("/api/users/{username}", app.handleProfile)
	})

	// Protected: everything in this group runs RequireAuth first.
	r.Group(func(r chi.Router) {
		r.Use(app.RequireAuth)
		r.Get("/api/auth/me", app.handleMe)
		r.Patch("/api/me", app.handleUpdateMe)
		r.Post("/api/me/avatar", app.handleUploadAvatar)
		r.Delete("/api/me/avatar", app.handleDeleteAvatar)
		r.Post("/api/lists", app.handleCreateList)
		r.Patch("/api/lists/{listID}", app.handleUpdateList)
		r.Delete("/api/lists/{listID}", app.handleDeleteList)
		r.Post("/api/lists/{listID}/pin", app.handlePinList)
		r.Delete("/api/lists/{listID}/pin", app.handleUnpinList)
		r.Post("/api/lists/{listID}/comments", app.handleCreateComment)
		r.Delete("/api/comments/{commentID}", app.handleDeleteComment)
		r.Get("/api/feed", app.handleFeed)
		r.Post("/api/users/{username}/follow", app.handleFollow)
		r.Delete("/api/users/{username}/follow", app.handleUnfollow)
	})

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
	}

	log.Printf("api: listening on http://localhost:%s", cfg.Port)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("api: %v", err)
	}
}

// handleHealth reports whether the API is up AND whether it can reach Postgres.
// A health check that only says "the web server is running" is close to useless;
// this one fails when the database is down, which is what you actually care about.
func (a *App) handleHealth(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()

	body := map[string]any{
		"status": "ok",
		"db":     "ok",
		"time":   time.Now().UTC().Format(time.RFC3339),
	}
	code := http.StatusOK

	if err := a.DB.Ping(ctx); err != nil {
		body["status"] = "degraded"
		body["db"] = "unreachable"
		code = http.StatusServiceUnavailable
	}

	writeJSON(w, code, body)
}

// mediaHeaders wraps the file server for uploaded media.
//
// The filename changes every time a picture does, so a cached copy can never
// be stale — which makes it safe to tell browsers to keep it forever.
func mediaHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		next.ServeHTTP(w, r)
	})
}
