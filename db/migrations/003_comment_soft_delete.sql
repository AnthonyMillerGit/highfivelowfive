-- 003_comment_soft_delete.sql
-- Comments thread, so a hard DELETE would cascade through parent_id and take
-- every reply with it — one person removing their comment would erase other
-- people's words. Instead we mark it and keep the row as a tombstone, so the
-- replies underneath still have something to hang from.
ALTER TABLE comments
    ADD COLUMN deleted_at TIMESTAMPTZ;

-- Nearly every read wants only the living comments on one list.
CREATE INDEX comments_list_alive_idx
    ON comments (list_id, created_at)
    WHERE deleted_at IS NULL;
