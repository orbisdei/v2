-- ============================================================
-- Tag Page Experience Migration
-- Run in Supabase SQL editor.
-- ============================================================

-- 1. Add dedication column to tags
ALTER TABLE tags ADD COLUMN IF NOT EXISTS dedication TEXT;

-- 2. Update RLS on site_contributor_notes
--    Existing SELECT policy to drop (name from 001_initial_schema.sql):
--    "Contributor notes visible to contributors and admins"

DROP POLICY IF EXISTS "Contributor notes visible to contributors and admins" ON site_contributor_notes;

-- New: anyone can read all notes (public)
CREATE POLICY "Anyone can read contributor notes"
  ON site_contributor_notes FOR SELECT
  USING (true);

-- New: users can delete their own notes
CREATE POLICY "Users can delete own notes"
  ON site_contributor_notes FOR DELETE
  USING (auth.uid() = created_by);

-- New: admins can delete any note
CREATE POLICY "Admins can delete any note"
  ON site_contributor_notes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'administrator'
    )
  );
