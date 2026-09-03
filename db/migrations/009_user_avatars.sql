-- 009_user_avatars.sql
--
-- A profile picture. The column holds only the stored filename, never a full
-- URL: where avatars are served from is a deployment detail, and baking a host
-- into every row would turn "we moved the files" into an UPDATE over the
-- whole table. The API builds the URL from config on the way out.
--
-- NULL means no picture, which is not a missing value to be backfilled — it
-- is the normal state, and the monogram already covers it.
ALTER TABLE users
    ADD COLUMN avatar_path TEXT;
