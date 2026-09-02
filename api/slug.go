package main

import (
	"strings"
	"unicode"
)

const maxSlugLen = 60

// Slugify turns "Worst Album Closers of the 90s!" into
// "worst-album-closers-of-the-90s" for use in a URL.
func Slugify(title string) string {
	var b strings.Builder
	lastDash := true // leading dashes are suppressed

	for _, r := range strings.ToLower(title) {
		switch {
		case unicode.IsLetter(r) || unicode.IsDigit(r):
			b.WriteRune(r)
			lastDash = false
		case !lastDash:
			b.WriteRune('-')
			lastDash = true
		}
	}

	s := strings.Trim(b.String(), "-")
	if len(s) > maxSlugLen {
		s = strings.Trim(s[:maxSlugLen], "-")
	}
	// A title of pure punctuation or non-Latin script would slugify to
	// nothing; the row still needs a usable URL.
	if s == "" {
		s = "list"
	}
	return s
}
