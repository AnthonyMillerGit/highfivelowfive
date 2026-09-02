package main

import (
	"context"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Connect opens a pooled connection to Postgres and verifies it works.
// A pool (not a single connection) because every incoming HTTP request is its
// own goroutine — they need to borrow connections concurrently.
func Connect(ctx context.Context, databaseURL string) *pgxpool.Pool {
	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		log.Fatalf("db: bad DATABASE_URL: %v", err)
	}
	cfg.MaxConns = 10
	cfg.MaxConnLifetime = time.Hour

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		log.Fatalf("db: could not create pool: %v", err)
	}

	// NewWithConfig is lazy — it hasn't actually talked to Postgres yet.
	// Ping forces a real connection so a bad password fails at boot.
	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := pool.Ping(pingCtx); err != nil {
		log.Fatalf("db: could not reach Postgres: %v", err)
	}

	log.Println("db: connected")
	return pool
}
