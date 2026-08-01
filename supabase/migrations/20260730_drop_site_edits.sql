-- site_edits was always empty (the contributor insert path never set the
-- NOT NULL submitted_by column, so every attempted insert failed) and had no
-- admin review UI anywhere -- a completely dead review path. Contributor
-- site edits now flow through pending_submissions (type='site',
-- action='edit'), the same table tag edits already use, reviewed via
-- /admin/research.
drop table if exists public.site_edits;
