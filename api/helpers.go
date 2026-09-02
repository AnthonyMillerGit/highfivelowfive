package main

import (
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
)

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("writeJSON: %v", err)
	}
}

// writeError keeps every failure response the same shape, so the frontend can
// always read err.error rather than guessing per-endpoint.
func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

// decodeJSON reads a request body into dst with two guardrails:
// a 1MB cap (so nobody can exhaust memory by POSTing a huge body) and
// DisallowUnknownFields (so a typo'd key is an error, not a silent zero value).
func decodeJSON(w http.ResponseWriter, r *http.Request, dst any) error {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)

	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()

	if err := dec.Decode(dst); err != nil {
		return err
	}
	// A second value in the body means the client sent something unexpected.
	if err := dec.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return errors.New("body must contain a single JSON object")
	}
	return nil
}
