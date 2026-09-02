-- 007_item_labels.sql
--
-- Some lists have rows with a fixed identity: a year, a letter, a position on
-- the floor. The row is not "number three", it is "1994" — and what the author
-- fills in is which film won that year.
--
-- So an item can carry a label, shown where the rank number would go. Three
-- ways a row can be marked, in order: its own label, else its rank number if
-- the list is ranked, else a bullet.
ALTER TABLE list_items
    ADD COLUMN label TEXT;
