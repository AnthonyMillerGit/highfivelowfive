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
