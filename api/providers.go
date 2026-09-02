package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

// ImageResult is one candidate picture offered to the person building a list.
// Ref is the provider's own id, kept so the image can be refetched later if the
// URL scheme changes or we decide to cache it ourselves.
type ImageResult struct {
	Ref      string `json:"ref"`
	Title    string `json:"title"`
	Subtitle string `json:"subtitle"`
	ImageURL string `json:"image_url"` // stored on the item
	ThumbURL string `json:"thumb_url"` // shown in the picker
}

type provider interface {
	name() string
	label() string
	search(ctx context.Context, query string) ([]ImageResult, error)
}

// Outbound calls get a short timeout: a slow third party must not hold an
// inbound request open, and the caller is a person waiting on a search box.
var httpClient = &http.Client{Timeout: 10 * time.Second}

// getJSON fetches and decodes, retrying the failures that are worth retrying.
//
// MusicBrainz in particular answers 503 fairly often under load, and that is a
// "come back in a moment", not a real failure. Retrying a couple of times with
// a growing pause turns most of those into a normal result instead of an error
// in front of somebody trying to pick an album cover. 4xx is never retried —
// a bad request stays bad.
func getJSON(ctx context.Context, rawURL string, headers map[string]string, into any) error {
	var lastErr error

	for attempt := 0; attempt < 3; attempt++ {
		if attempt > 0 {
			pause := time.Duration(attempt) * 400 * time.Millisecond
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(pause):
			}
		}

		req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
		if err != nil {
			return err
		}
		for k, v := range headers {
			req.Header.Set(k, v)
		}

		res, err := httpClient.Do(req)
		if err != nil {
			lastErr = err
			continue
		}

		switch {
		case res.StatusCode == http.StatusOK:
			defer res.Body.Close()
			return json.NewDecoder(res.Body).Decode(into)

		case res.StatusCode == http.StatusTooManyRequests,
			res.StatusCode >= 500:
			res.Body.Close()
			lastErr = fmt.Errorf("upstream returned %d", res.StatusCode)

		default:
			res.Body.Close()
			return fmt.Errorf("upstream returned %d", res.StatusCode)
		}
	}
	return lastErr
}

// ------------------------------------------------------- albums (no key)

// MusicBrainz asks for at most one request per second and a User-Agent that
// identifies the application. Both are conditions of use, not suggestions, so
// the gate is here rather than left to good behaviour upstream.
type musicBrainz struct {
	mu       sync.Mutex
	lastCall time.Time
}

const mbUserAgent = "HighFiveLowFive/0.1 ( https://github.com/AnthonyMillerGit/highfivelowfive )"

func (m *musicBrainz) name() string  { return "album" }
func (m *musicBrainz) label() string { return "Album" }

func (m *musicBrainz) wait() {
	m.mu.Lock()
	defer m.mu.Unlock()
	if gap := time.Since(m.lastCall); gap < time.Second {
		time.Sleep(time.Second - gap)
	}
	m.lastCall = time.Now()
}

func (m *musicBrainz) search(ctx context.Context, query string) ([]ImageResult, error) {
	m.wait()

	endpoint := "https://musicbrainz.org/ws/2/release-group?fmt=json&limit=12&query=" +
		url.QueryEscape(query)

	var payload struct {
		Groups []struct {
			ID           string `json:"id"`
			Title        string `json:"title"`
			FirstRelease string `json:"first-release-date"`
			ArtistCredit []struct {
				Name string `json:"name"`
			} `json:"artist-credit"`
		} `json:"release-groups"`
	}
	if err := getJSON(ctx, endpoint, map[string]string{"User-Agent": mbUserAgent}, &payload); err != nil {
		return nil, err
	}

	results := make([]ImageResult, 0, len(payload.Groups))
	for _, g := range payload.Groups {
		artist := ""
		if len(g.ArtistCredit) > 0 {
			artist = g.ArtistCredit[0].Name
		}
		if year, _, ok := strings.Cut(g.FirstRelease, "-"); ok && artist != "" {
			artist += " · " + year
		}

		// Not every release group has cover art, and asking would cost one
		// request each. The URL is offered as-is and the picker quietly drops
		// any tile whose image fails to load.
		results = append(results, ImageResult{
			Ref:      g.ID,
			Title:    g.Title,
			Subtitle: artist,
			ImageURL: "https://coverartarchive.org/release-group/" + g.ID + "/front-500",
			ThumbURL: "https://coverartarchive.org/release-group/" + g.ID + "/front-250",
		})
	}
	return results, nil
}

// --------------------------------------------------------- film (key needed)

type tmdb struct{ apiKey string }

func (t *tmdb) name() string  { return "film" }
func (t *tmdb) label() string { return "Film & TV" }

func (t *tmdb) search(ctx context.Context, query string) ([]ImageResult, error) {
	endpoint := "https://api.themoviedb.org/3/search/movie?include_adult=false&api_key=" +
		url.QueryEscape(t.apiKey) + "&query=" + url.QueryEscape(query)

	var payload struct {
		Results []struct {
			ID          int    `json:"id"`
			Title       string `json:"title"`
			ReleaseDate string `json:"release_date"`
			PosterPath  string `json:"poster_path"`
		} `json:"results"`
	}
	if err := getJSON(ctx, endpoint, nil, &payload); err != nil {
		return nil, err
	}

	results := make([]ImageResult, 0, len(payload.Results))
	for _, m := range payload.Results {
		if m.PosterPath == "" {
			continue // a result with no poster is no use here
		}
		year, _, _ := strings.Cut(m.ReleaseDate, "-")
		results = append(results, ImageResult{
			Ref:      fmt.Sprintf("%d", m.ID),
			Title:    m.Title,
			Subtitle: year,
			ImageURL: "https://image.tmdb.org/t/p/w500" + m.PosterPath,
			ThumbURL: "https://image.tmdb.org/t/p/w185" + m.PosterPath,
		})
		if len(results) == 12 {
			break
		}
	}
	return results, nil
}
