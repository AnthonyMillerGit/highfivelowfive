package main

import (
	"net/http"
	"strings"
	"sync"
	"time"
)

const (
	searchCacheTTL = 15 * time.Minute
	searchCacheMax = 500
)

type cachedSearch struct {
	results []ImageResult
	stored  time.Time
}

// searchCache spares the upstream services repeat work: several people
// building "top 5 horror" lists will search the same handful of titles, and
// MusicBrainz in particular is a volunteer-run service we are a guest of.
type searchCache struct {
	mu      sync.Mutex
	entries map[string]cachedSearch
}

func newSearchCache() *searchCache {
	return &searchCache{entries: map[string]cachedSearch{}}
}

func (c *searchCache) get(key string) ([]ImageResult, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	e, ok := c.entries[key]
	if !ok || time.Since(e.stored) > searchCacheTTL {
		return nil, false
	}
	return e.results, true
}

func (c *searchCache) put(key string, results []ImageResult) {
	c.mu.Lock()
	defer c.mu.Unlock()
	// Crude but bounded: once it is full, drop everything rather than grow
	// without limit. The cost of a cold cache is one upstream call.
	if len(c.entries) >= searchCacheMax {
		c.entries = map[string]cachedSearch{}
	}
	c.entries[key] = cachedSearch{results: results, stored: time.Now()}
}

// registerProviders wires up whichever image sources are configured. Albums
// need no credentials at all; film does, so it simply is not offered when the
// key is absent rather than failing at search time.
func (a *App) registerProviders() {
	a.Providers = map[string]provider{"album": &musicBrainz{}}
	if a.Cfg.TMDBKey != "" {
		a.Providers["film"] = &tmdb{apiKey: a.Cfg.TMDBKey}
	}
	a.SearchCache = newSearchCache()
}

// handleImageSources tells the client which pickers to offer, so the UI never
// shows a source that cannot work.
func (a *App) handleImageSources(w http.ResponseWriter, r *http.Request) {
	type source struct {
		Name  string `json:"name"`
		Label string `json:"label"`
	}
	// Fixed order, so the picker's tabs do not shuffle between requests.
	out := []source{}
	for _, key := range []string{"film", "album"} {
		if p, ok := a.Providers[key]; ok {
			out = append(out, source{Name: p.name(), Label: p.label()})
		}
	}
	writeJSON(w, http.StatusOK, out)
}

// handleImageSearch proxies a search to one provider.
//
// It runs behind RequireAuth deliberately: this endpoint spends our API key
// and our goodwill with free services, so it is not left open to the internet.
func (a *App) handleImageSearch(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("provider")
	query := strings.TrimSpace(r.URL.Query().Get("q"))

	p, ok := a.Providers[name]
	if !ok {
		writeError(w, http.StatusBadRequest, "unknown image source")
		return
	}
	if query == "" {
		writeJSON(w, http.StatusOK, []ImageResult{})
		return
	}
	if len(query) > 100 {
		writeError(w, http.StatusBadRequest, "search is too long")
		return
	}

	key := name + "\x00" + strings.ToLower(query)
	if hit, ok := a.SearchCache.get(key); ok {
		writeJSON(w, http.StatusOK, hit)
		return
	}

	results, err := p.search(r.Context(), query)
	if err != nil {
		// The upstream service being down is not our caller's fault, and not
		// something they can fix — say so plainly rather than blaming them.
		writeError(w, http.StatusBadGateway, "that image source is not responding right now")
		return
	}

	a.SearchCache.put(key, results)
	writeJSON(w, http.StatusOK, results)
}
