-- 010_takes.sql
--
-- A list stops being one person's opinion and becomes a question the site can
-- answer. "Top 5 Best Soft Drinks" is Jeff's ranking and also a prompt, and a
-- take is somebody else's answer to it.
--
-- A take is an ordinary list. It has its own author, title, items and
-- comments, and it lives on their profile like anything else they wrote. The
-- only thing that makes it a take is that it points at what it answers.
ALTER TABLE lists
    ADD COLUMN origin_id BIGINT REFERENCES lists(id) ON DELETE SET NULL;

-- SET NULL, deliberately. Deleting a list must not delete other people's work,
-- and refusing the delete would let one list hold its author hostage. So when
-- an original goes, its takes survive as the ordinary lists they always were —
-- what is lost is the connection, not the writing.
--
-- Takes are always looked up by what they answer, and most lists answer
-- nothing, so the index covers only the ones that do.
CREATE INDEX lists_origin_idx
    ON lists (origin_id)
    WHERE origin_id IS NOT NULL;
