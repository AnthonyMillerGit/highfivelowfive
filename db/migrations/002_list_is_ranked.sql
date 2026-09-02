-- 002_list_is_ranked.sql
-- Lists stay freeform in length and topic. This flag only says whether the
-- ordering is *meaningful*:
--   true  -> "Top 5 Horror Movies"    render as 1. 2. 3. 4. 5.
--   false -> "My Mount Rushmore"      render as bullets; the four are equals
-- Either way list_items.rank still stores display order, so an unranked list
-- can be reordered and can later be switched to ranked without data loss.
ALTER TABLE lists
    ADD COLUMN is_ranked BOOLEAN NOT NULL DEFAULT true;
