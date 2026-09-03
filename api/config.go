package main

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

// Config holds everything the API needs from the environment.
// Read once at startup so the rest of the code never touches os.Getenv.
type Config struct {
	DatabaseURL string
	Port        string
	JWTSecret   string
	CORSOrigin  string

	// Where uploaded pictures are written, and the origin they are served
	// from. These two are the whole seam between "avatars live on this disk"
	// and "avatars live in object storage" — nothing else knows the
	// difference, and no stored row mentions a host.
	MediaDir      string
	PublicBaseURL string
}

func LoadConfig() Config {
	// The API lives in api/ but .env sits at the project root, so try both.
	// godotenv never overwrites variables already set in the real environment,
	// which is what lets production ignore these files entirely.
	for _, path := range []string{".env", "../.env"} {
		if err := godotenv.Load(path); err == nil {
			log.Printf("config: loaded %s", path)
			break
		}
	}

	cfg := Config{
		DatabaseURL: os.Getenv("DATABASE_URL"),
		Port:        envOr("PORT", "8081"),
		JWTSecret:   os.Getenv("JWT_SECRET"),
		CORSOrigin:  envOr("CORS_ORIGIN", "http://localhost:5173"),

		// The API runs from api/, so the default puts media beside it at the
		// project root rather than inside the Go package.
		MediaDir:      envOr("MEDIA_DIR", "../media"),
		PublicBaseURL: envOr("PUBLIC_BASE_URL", "http://localhost:8081"),
	}

	// Fail loudly at boot rather than mysteriously on the first request.
	if cfg.DatabaseURL == "" {
		log.Fatal("config: DATABASE_URL is required")
	}
	if cfg.JWTSecret == "" {
		log.Fatal("config: JWT_SECRET is required")
	}
	return cfg
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
