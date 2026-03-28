-- ============================================================
-- Add ON UPDATE CASCADE to all FK constraints on sites.id
-- ============================================================
-- Each constraint is dropped and immediately re-added.
-- ON DELETE behavior is left at its current default (NO ACTION).
-- Safe to run on a live database — no data is modified.
-- ============================================================

BEGIN;

-- site_images
ALTER TABLE public.site_images
  DROP CONSTRAINT site_images_site_id_fkey,
  ADD  CONSTRAINT site_images_site_id_fkey
    FOREIGN KEY (site_id) REFERENCES public.sites(id)
    ON UPDATE CASCADE;

-- site_links
ALTER TABLE public.site_links
  DROP CONSTRAINT site_links_site_id_fkey,
  ADD  CONSTRAINT site_links_site_id_fkey
    FOREIGN KEY (site_id) REFERENCES public.sites(id)
    ON UPDATE CASCADE;

-- site_tag_assignments
ALTER TABLE public.site_tag_assignments
  DROP CONSTRAINT site_tag_assignments_site_id_fkey,
  ADD  CONSTRAINT site_tag_assignments_site_id_fkey
    FOREIGN KEY (site_id) REFERENCES public.sites(id)
    ON UPDATE CASCADE;

-- site_contributor_notes
ALTER TABLE public.site_contributor_notes
  DROP CONSTRAINT site_contributor_notes_site_id_fkey,
  ADD  CONSTRAINT site_contributor_notes_site_id_fkey
    FOREIGN KEY (site_id) REFERENCES public.sites(id)
    ON UPDATE CASCADE;

-- site_edits (site_id is nullable)
ALTER TABLE public.site_edits
  DROP CONSTRAINT site_edits_site_id_fkey,
  ADD  CONSTRAINT site_edits_site_id_fkey
    FOREIGN KEY (site_id) REFERENCES public.sites(id)
    ON UPDATE CASCADE;

-- pending_submissions (site_id is nullable)
ALTER TABLE public.pending_submissions
  DROP CONSTRAINT pending_submissions_site_id_fkey,
  ADD  CONSTRAINT pending_submissions_site_id_fkey
    FOREIGN KEY (site_id) REFERENCES public.sites(id)
    ON UPDATE CASCADE;

COMMIT;

-- Verify: all six should now show ON UPDATE CASCADE
SELECT
  tc.table_name      AS child_table,
  kcu.column_name    AS fk_column,
  rc.update_rule     AS on_update,
  rc.delete_rule     AS on_delete
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON rc.unique_constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'sites'
ORDER BY child_table;
