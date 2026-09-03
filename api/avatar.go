package main

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"image"
	"image/color"
	"image/jpeg"
	"io"
	"net/http"
	"os"
	"path/filepath"

	"golang.org/x/image/draw"

	// Registered for their side effect: image.Decode can only recognise a
	// format whose decoder has been linked in.
	_ "image/gif"
	_ "image/png"

	_ "golang.org/x/image/webp"
)

const (
	// Refused before a single byte is examined. Phone photos land well under
	// this; anything above it is not a profile picture.
	maxAvatarBytes = 6 << 20

	// Stored square, at roughly three times the largest place it is drawn
	// (the 88px profile header), so it stays sharp on a retina screen without
	// shipping a photograph to every visitor.
	avatarSize = 256

	// A decompression bomb is a tiny file that claims enormous dimensions —
	// a few KB on the wire, gigabytes once decoded. The header is read first
	// precisely so this can be refused before the bitmap is allocated.
	maxSourcePixels = 40_000_000

	avatarURLPath = "/media/avatars/"
)

// The ground a transparent avatar is composited onto: the same ink the app is
// painted on, so a logo with a see-through corner looks deliberate instead of
// sitting on a black square.
var flattenTo = color.RGBA{R: 0x17, G: 0x13, B: 0x2A, A: 0xff}

var (
	errNotAnImage    = errors.New("that file is not an image we can read")
	errImageTooLarge = errors.New("that image's dimensions are too large")
)

// avatarURL turns a stored filename into something a browser can fetch.
//
// The column holds only the filename, so moving avatars to object storage
// later is a config change rather than an UPDATE over every row.
func (a *App) avatarURL(name *string) *string {
	if name == nil || *name == "" {
		return nil
	}
	url := a.Cfg.PublicBaseURL + avatarURLPath + *name
	return &url
}

func (a *App) handleUploadAvatar(w http.ResponseWriter, r *http.Request) {
	// The cap is applied to the body itself, so an enormous upload is cut off
	// as it arrives rather than after it has all been buffered.
	r.Body = http.MaxBytesReader(w, r.Body, maxAvatarBytes)

	file, _, err := r.FormFile("avatar")
	if err != nil {
		var tooBig *http.MaxBytesError
		if errors.As(err, &tooBig) {
			writeError(w, http.StatusRequestEntityTooLarge, "that image is bigger than 6MB")
			return
		}
		writeError(w, http.StatusBadRequest, "choose an image to upload")
		return
	}
	defer file.Close()

	raw, err := readAllLimited(file)
	if err != nil {
		writeError(w, http.StatusRequestEntityTooLarge, "that image is bigger than 6MB")
		return
	}

	encoded, err := squareJPEG(raw)
	switch {
	case errors.Is(err, errNotAnImage):
		writeError(w, http.StatusBadRequest,
			"that file is not an image we can read — try a JPEG, PNG, GIF or WebP")
		return
	case errors.Is(err, errImageTooLarge):
		writeError(w, http.StatusBadRequest, "that image is too many pixels to process")
		return
	case err != nil:
		writeError(w, http.StatusInternalServerError, "could not process that image")
		return
	}

	name, err := a.writeAvatar(encoded)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not save that image")
		return
	}

	userID := userIDFrom(r.Context())
	previous, err := a.setAvatarPath(r.Context(), userID, &name)
	if err != nil {
		// The file is already on disk but no row points at it. Take it back
		// out rather than leaving litter nobody can reach.
		a.removeAvatarFile(&name)
		writeError(w, http.StatusInternalServerError, "could not save that image")
		return
	}
	// Only once the new picture is the one of record. Best effort: a leftover
	// file is untidy, a missing current one is a broken profile.
	a.removeAvatarFile(previous)

	u, err := a.userByID(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load your profile")
		return
	}
	writeJSON(w, http.StatusOK, u)
}

func (a *App) handleDeleteAvatar(w http.ResponseWriter, r *http.Request) {
	userID := userIDFrom(r.Context())

	previous, err := a.setAvatarPath(r.Context(), userID, nil)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not remove the picture")
		return
	}
	a.removeAvatarFile(previous)

	u, err := a.userByID(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load your profile")
		return
	}
	writeJSON(w, http.StatusOK, u)
}

// setAvatarPath points the user at a new picture and reports the one it
// replaced, so the caller knows which file is now unreferenced.
func (a *App) setAvatarPath(ctx context.Context, userID int64, name *string) (*string, error) {
	var previous *string
	err := a.DB.QueryRow(ctx, `
		UPDATE users SET avatar_path = $2
		WHERE id = $1
		RETURNING (SELECT avatar_path FROM users WHERE id = $1)`,
		userID, name,
	).Scan(&previous)
	return previous, err
}

// squareJPEG turns whatever was uploaded into a small square JPEG.
//
// The re-encode is the point of this function, not a side effect of resizing.
// Nothing of the original file survives it: the EXIF block goes, which is
// where phones record where a photo was taken, and so does anything appended
// to a file crafted to be both a valid picture and a valid script. What
// reaches the disk is bytes this function produced.
func squareJPEG(raw []byte) ([]byte, error) {
	// The header alone, first. A few kilobytes can legitimately claim to be
	// 60,000 pixels square, and decoding it would allocate the whole bitmap
	// before there was anything to object to.
	cfg, _, err := image.DecodeConfig(bytes.NewReader(raw))
	if err != nil {
		return nil, errNotAnImage
	}
	if cfg.Width <= 0 || cfg.Height <= 0 || cfg.Width*cfg.Height > maxSourcePixels {
		return nil, errImageTooLarge
	}

	src, _, err := image.Decode(bytes.NewReader(raw))
	if err != nil {
		return nil, errNotAnImage
	}

	// The largest centred square of the original, so a portrait photo keeps
	// its middle instead of being squashed into a circle's worth of face.
	b := src.Bounds()
	side := min(b.Dx(), b.Dy())
	crop := image.Rect(0, 0, side, side).Add(image.Pt(
		b.Min.X+(b.Dx()-side)/2,
		b.Min.Y+(b.Dy()-side)/2,
	))

	dst := image.NewRGBA(image.Rect(0, 0, avatarSize, avatarSize))
	// JPEG cannot store transparency, so anything see-through has to land on
	// something. Painting the ground first means it lands on ours.
	draw.Draw(dst, dst.Bounds(), &image.Uniform{C: flattenTo}, image.Point{}, draw.Src)
	draw.CatmullRom.Scale(dst, dst.Bounds(), src, crop, draw.Over, nil)

	var out bytes.Buffer
	if err := jpeg.Encode(&out, dst, &jpeg.Options{Quality: 85}); err != nil {
		return nil, err
	}
	return out.Bytes(), nil
}

// writeAvatar puts the encoded picture on disk under a name of our choosing.
func (a *App) writeAvatar(data []byte) (string, error) {
	dir := a.avatarDir()
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}

	// The name is generated, never the one the browser sent. An uploaded
	// filename is attacker-controlled text, and text like "../../.env" has no
	// business deciding where a file lands. Random also means replacing a
	// picture changes its URL, so no cache anywhere can serve the old one.
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	name := hex.EncodeToString(buf) + ".jpg"

	if err := os.WriteFile(filepath.Join(dir, name), data, 0o644); err != nil {
		return "", err
	}
	return name, nil
}

// removeAvatarFile deletes a picture nothing points at any more. Failure is
// not worth reporting: the row is already correct, and a stray file is litter
// rather than a bug the person uploading can do anything about.
func (a *App) removeAvatarFile(name *string) {
	if name == nil || *name == "" {
		return
	}
	// Base() even though we wrote this name ourselves — the cost is nothing
	// and it means a bad row can never turn into a delete somewhere else.
	os.Remove(filepath.Join(a.avatarDir(), filepath.Base(*name)))
}

func (a *App) avatarDir() string {
	return filepath.Join(a.Cfg.MediaDir, "avatars")
}

// readAllLimited reads one byte past the cap, so "hit the limit" stays
// distinguishable from "happened to be exactly that long". The body is capped
// too; this guards the decoded multipart part behind it.
func readAllLimited(r io.Reader) ([]byte, error) {
	data, err := io.ReadAll(io.LimitReader(r, maxAvatarBytes+1))
	if err != nil {
		return nil, err
	}
	if len(data) > maxAvatarBytes {
		return nil, errors.New("avatar exceeds the size limit")
	}
	return data, nil
}
