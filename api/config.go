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
