-- 004_follows.sql
-- Follows, not friendships: one-way, no request to accept, no state machine.
-- A follow is just an edge from one user to another.
CREATE TABLE follows (
    follower_id BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followee_id BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- The pair IS the identity, so following twice is impossible rather than
    -- merely guarded against. It also indexes "who does this user follow",
    -- which is the query the feed runs.
    PRIMARY KEY (follower_id, followee_id),

    CONSTRAINT no_self_follow CHECK (follower_id <> followee_id)
);

-- The primary key only helps in one direction; this covers "who follows this
-- user", needed for the follower count on a profile.
CREATE INDEX follows_followee_idx ON follows (followee_id);
