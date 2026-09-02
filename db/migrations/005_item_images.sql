-- 005_item_images.sql
--
-- An item can carry a picture. image_url is where it is now; image_source and
-- image_ref record where it CAME from, which is what makes the fill method
-- swappable later: a row filled by pasting a link can be replaced by one from
-- a provider without changing how anything reads it.
ALTER TABLE list_items
    ADD COLUMN image_url    TEXT,
    ADD COLUMN image_source TEXT,   -- 'link' | 'upload' | a provider name
    ADD COLUMN image_ref    TEXT;   -- provider's id, so the image can be refetched

-- Shape belongs to the LIST, not the item, and this is the important bit.
-- Posters are 2:3, album art is 1:1, a photo of a person is neither. Mixing
-- ratios inside one list makes the rows impossible to align. But a list is
-- almost always one KIND of thing, so the whole list picks a shape once and
-- every row lines up.
ALTER TABLE lists
    ADD COLUMN image_shape TEXT NOT NULL DEFAULT 'square'
        CHECK (image_shape IN ('square', 'poster', 'wide'));
