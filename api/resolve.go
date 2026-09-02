package main

import (
	"context"
	"errors"
	"io"
	"net"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"
)

const maxPageBytes = 512 * 1024 // enough for any <head>, far short of a whole video

// blockedIP rejects everything that is not a public internet address.
//
// This endpoint fetches a URL that a user typed, from inside our network. Left
// unguarded that is a server-side request forgery hole: someone pastes
// http://169.254.169.254/ or http://localhost:5432 and we happily fetch
// whatever is there and hand it back. Cloud metadata endpoints and internal
// services live at exactly these addresses.
func blockedIP(ip net.IP) bool {
	return ip.IsLoopback() || ip.IsPrivate() || ip.IsUnspecified() ||
		ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() ||
		ip.IsInterfaceLocalMulticast() || ip.IsMulticast()
}

// safeDial resolves the host itself, refuses any non-public address, and then
// connects to the specific IP it approved. Checking the name and then letting
// the stack resolve it again would leave a DNS-rebinding window between the
// two lookups.
func safeDial(ctx context.Context, network, addr string) (net.Conn, error) {
	host, port, err := net.SplitHostPort(addr)
	if err != nil {
		return nil, err
	}

	ips, err := net.DefaultResolver.LookupIPAddr(ctx, host)
	if err != nil {
		return nil, err
	}

	dialer := &net.Dialer{Timeout: 5 * time.Second}
	for _, ip := range ips {
		if blockedIP(ip.IP) {
			continue
		}
		conn, err := dialer.DialContext(ctx, network, net.JoinHostPort(ip.IP.String(), port))
		if err == nil {
			return conn, nil
		}
	}
	return nil, errors.New("address not allowed")
}

// fetchClient is separate from httpClient: it is the one that touches
// addresses a stranger chose, so it carries the guarded dialer and a redirect
// cap. Each redirect hop dials through safeDial too, so a redirect cannot be
// used to reach an internal address either.
var fetchClient = &http.Client{
	Timeout:   10 * time.Second,
	Transport: &http.Transport{DialContext: safeDial},
	CheckRedirect: func(r *http.Request, via []*http.Request) error {
		if len(via) >= 3 {
			return errors.New("too many redirects")
		}
		return nil
	},
}

var (
	ogImageRe = regexp.MustCompile(
		`(?is)<meta[^>]+(?:property|name)\s*=\s*["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["'][^>]*content\s*=\s*["']([^"']+)["']`)
	ogImageAltRe = regexp.MustCompile(
		`(?is)<meta[^>]+content\s*=\s*["']([^"']+)["'][^>]*(?:property|name)\s*=\s*["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["']`)
	youTubeIDRe = regexp.MustCompile(`^[A-Za-z0-9_-]{11}$`)
)

type resolveRequest struct {
	URL string `json:"url"`
}

type resolveResponse struct {
	ImageURL string `json:"image_url"`
	Kind     string `json:"kind"` // image | youtube | page — shown back to the user
}

// handleResolveImage turns whatever someone pasted into a picture.
//
// Three cases, in the order people actually paste things: a link straight to
// an image, a YouTube video, or any other page — for which we read the preview
// image the page advertises, the same one a chat app would show.
func (a *App) handleResolveImage(w http.ResponseWriter, r *http.Request) {
	var req resolveRequest
	if err := decodeJSON(w, r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	raw, ok := safeImageURL(req.URL)
	if !ok || raw == "" {
		writeError(w, http.StatusBadRequest, "paste an http or https link")
		return
	}

	parsed, err := url.Parse(raw)
	if err != nil {
		writeError(w, http.StatusBadRequest, "that link could not be read")
		return
	}

	if id := youTubeID(parsed); id != "" {
		writeJSON(w, http.StatusOK, resolveResponse{
			ImageURL: youTubeThumb(r.Context(), id),
			Kind:     "youtube",
		})
		return
	}

	found, kind, err := a.fetchImageFromURL(r.Context(), raw)
	if err != nil {
		writeError(w, http.StatusBadGateway, "could not get a picture from that link")
		return
	}
	writeJSON(w, http.StatusOK, resolveResponse{ImageURL: found, Kind: kind})
}

func (a *App) fetchImageFromURL(ctx context.Context, raw string) (string, string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, raw, nil)
	if err != nil {
		return "", "", err
	}
	// Some sites serve a bare 403 to a client with no User-Agent.
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; HighFiveLowFive/0.1)")
	req.Header.Set("Accept", "text/html,image/*;q=0.9,*/*;q=0.8")

	res, err := fetchClient.Do(req)
	if err != nil {
		return "", "", err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return "", "", errors.New("page returned an error")
	}

	contentType := res.Header.Get("Content-Type")

	// Already an image: use the final URL, which is what redirects resolved to.
	if strings.HasPrefix(contentType, "image/") {
		return res.Request.URL.String(), "image", nil
	}

	if !strings.Contains(contentType, "html") {
		return "", "", errors.New("that link is not a page or a picture")
	}

	body, err := io.ReadAll(io.LimitReader(res.Body, maxPageBytes))
	if err != nil {
		return "", "", err
	}

	for _, re := range []*regexp.Regexp{ogImageRe, ogImageAltRe} {
		if m := re.FindSubmatch(body); m != nil {
			// A page may advertise a relative preview image.
			abs, err := res.Request.URL.Parse(strings.TrimSpace(string(m[1])))
			if err != nil {
				continue
			}
			if clean, ok := safeImageURL(abs.String()); ok && clean != "" {
				return clean, "page", nil
			}
		}
	}
	return "", "", errors.New("no preview image on that page")
}

// youTubeID pulls the video id out of the several shapes of YouTube link.
func youTubeID(u *url.URL) string {
	host := strings.TrimPrefix(strings.ToLower(u.Hostname()), "www.")

	switch host {
	case "youtu.be":
		if id := strings.Trim(u.Path, "/"); youTubeIDRe.MatchString(id) {
			return id
		}
	case "youtube.com", "m.youtube.com", "music.youtube.com":
		if id := u.Query().Get("v"); youTubeIDRe.MatchString(id) {
			return id
		}
		for _, prefix := range []string{"/shorts/", "/embed/", "/live/"} {
			if strings.HasPrefix(u.Path, prefix) {
				id := strings.Trim(strings.TrimPrefix(u.Path, prefix), "/")
				if youTubeIDRe.MatchString(id) {
					return id
				}
			}
		}
	}
	return ""
}

// youTubeThumb prefers the full-resolution still, which does not exist for
// every video, and falls back to the one that always does.
func youTubeThumb(ctx context.Context, id string) string {
	maxres := "https://img.youtube.com/vi/" + id + "/maxresdefault.jpg"

	req, err := http.NewRequestWithContext(ctx, http.MethodHead, maxres, nil)
	if err == nil {
		if res, err := fetchClient.Do(req); err == nil {
			res.Body.Close()
			if res.StatusCode == http.StatusOK {
				return maxres
			}
		}
	}
	return "https://img.youtube.com/vi/" + id + "/hqdefault.jpg"
}
