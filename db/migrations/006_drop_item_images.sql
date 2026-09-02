-- 006_drop_item_images.sql
--
-- Pictures are shelved until the experience is worth having, so the columns
-- come out rather than sitting unread. A column nothing writes is worse than
-- no column: it looks like a feature to whoever reads the schema next.
--
-- 005_item_images.sql stays in this directory on purpose. It is the record of
-- exactly what to add back, and re-applying it is a copy-paste away.
ALTER TABLE list_items
    DROP COLUMN image_url,
    DROP COLUMN image_source,
    DROP COLUMN image_ref;

ALTER TABLE lists
    DROP COLUMN image_shape;
