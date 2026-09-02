-- 001_init.sql — the four nouns of High Five Low Five.
-- citext = case-insensitive text. Lets "Anthony@x.com" and "anthony@x.com"
-- collide on the UNIQUE constraint instead of creating two accounts.
CREATE EXTENSION IF NOT EXISTS citext;

-- ---------------------------------------------------------------- users
CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    email         CITEXT      NOT NULL UNIQUE,
    username      CITEXT      NOT NULL UNIQUE,   -- public handle, appears in URLs
    password_hash TEXT        NOT NULL,          -- bcrypt output, never the password
    display_name  TEXT,
    bio           TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]{3,30}$')
);

-- ---------------------------------------------------------------- lists
CREATE TABLE lists (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       TEXT        NOT NULL,
    slug        TEXT        NOT NULL,            -- URL piece: /u/anthony/top-5-horror
    description TEXT,
    is_public   BOOLEAN     NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- two users may both have "top-5-horror"; one user may not have it twice
    CONSTRAINT lists_user_slug_unique UNIQUE (user_id, slug)
);

CREATE INDEX lists_user_id_idx     ON lists (user_id);
CREATE INDEX lists_created_at_idx  ON lists (created_at DESC);

-- ----------------------------------------------------------- list_items
CREATE TABLE list_items (
    id         BIGSERIAL PRIMARY KEY,
    list_id    BIGINT      NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    rank       INTEGER     NOT NULL,             -- 1 = top of the list
    title      TEXT        NOT NULL,
    note       TEXT,                             -- optional "why this one"
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Deliberately NOT unique on (list_id, rank): reordering items would otherwise
-- trip the constraint mid-shuffle. We just sort by rank on read.
CREATE INDEX list_items_list_rank_idx ON list_items (list_id, rank);

-- ------------------------------------------------------------- comments
CREATE TABLE comments (
    id         BIGSERIAL PRIMARY KEY,
    list_id    BIGINT      NOT NULL REFERENCES lists(id)    ON DELETE CASCADE,
    user_id    BIGINT      NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    parent_id  BIGINT               REFERENCES comments(id) ON DELETE CASCADE,
    body       TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX comments_list_created_idx ON comments (list_id, created_at);
CREATE INDEX comments_parent_idx       ON comments (parent_id);
