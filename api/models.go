package main

import "time"

// User is the shape we send to clients. Note there is no PasswordHash field:
// it is impossible to leak a hash through this struct because it isn't in it.
type User struct {
	ID          int64     `json:"id"`
	Email       string    `json:"email"`
	Username    string    `json:"username"`
	DisplayName *string   `json:"display_name"`
	Bio         *string   `json:"bio"`
	CreatedAt   time.Time `json:"created_at"`
}

// Author is the slice of a user that appears next to their content.
type Author struct {
	Username    string  `json:"username"`
	DisplayName *string `json:"display_name"`
}

// Profile is a user's public page header. IsFollowing and IsSelf are answered
// relative to whoever is asking, so they are false for a signed-out visitor.
type Profile struct {
	Username       string  `json:"username"`
	DisplayName    *string `json:"display_name"`
	Bio            *string `json:"bio"`
	ListCount      int     `json:"list_count"`
	FollowerCount  int     `json:"follower_count"`
	FollowingCount int     `json:"following_count"`
	IsFollowing    bool    `json:"is_following"`
	IsSelf         bool    `json:"is_self"`
}

type ListItem struct {
	ID    int64   `json:"id"`
	Rank  int     `json:"rank"`
	Title string  `json:"title"`
	Note  *string `json:"note"`

	// Where the picture is now, and where it came from. Source and ref are
	// what let a link be swapped for an uploaded or provider-sourced image
	// later without anything downstream noticing.
	ImageURL    *string `json:"image_url"`
	ImageSource *string `json:"image_source"`
	ImageRef    *string `json:"image_ref"`
}

// List serves both shapes the UI needs, distinguished by which item slice is
// filled: Preview (first three, for cards in a grid or feed) or Items (all of
// them, for the list page). The empty one is omitted from the JSON.
type List struct {
	ID           int64      `json:"id"`
	Title        string     `json:"title"`
	Slug         string     `json:"slug"`
	Description  *string    `json:"description"`
	IsRanked     bool       `json:"is_ranked"`
	ImageShape   string     `json:"image_shape"`
	ItemCount    int        `json:"item_count"`
	CommentCount int        `json:"comment_count"`
	CreatedAt    time.Time  `json:"created_at"`
	Author       Author     `json:"author"`
	Preview      []ListItem `json:"preview,omitempty"`
	Items        []ListItem `json:"items,omitempty"`
}

// Comment is one entry in a list's discussion. Threading is one level deep:
// a reply always hangs off a top-level comment, never off another reply.
type Comment struct {
	ID        int64     `json:"id"`
	Body      *string   `json:"body"` // null once removed
	Deleted   bool      `json:"deleted"`
	CreatedAt time.Time `json:"created_at"`
	Author    *Author   `json:"author"` // null once removed
	ParentID  *int64    `json:"parent_id"`
	Replies   []Comment `json:"replies"`
}
