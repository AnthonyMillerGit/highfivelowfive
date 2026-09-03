-- 008_pinned_lists.sql
--
-- A profile is a wall of lists in the order they happened to be written, which
-- is rarely the order you would introduce yourself in. Pinning lets an author
-- put a few up front.
--
-- This is a column on lists rather than a table of its own because a pin
-- belongs to the list: a list has exactly one owner, and that owner is the
-- only person who can pin it. A join table would be the right shape for the
-- other feature — other people saving your lists — which this is not.
--
-- A timestamp rather than a position column. The order falls out of it (first
-- pinned sits first, pinning appends to the end) with no reordering to build,
-- and "when did this go up" is worth knowing later. If pins ever need dragging
-- into an arbitrary order, that is when a rank column earns its place.
ALTER TABLE lists
    ADD COLUMN pinned_at TIMESTAMPTZ;

-- Only pinned rows are ever looked up this way, and they are at most a handful
-- per author, so the index covers just them.
CREATE INDEX lists_pinned_idx
    ON lists (user_id, pinned_at)
    WHERE pinned_at IS NOT NULL;
