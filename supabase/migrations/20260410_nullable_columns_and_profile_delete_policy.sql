-- 1. Allow nulling out created_by on sites
ALTER TABLE sites ALTER COLUMN created_by DROP NOT NULL;

-- 2. Allow nulling out created_by on tags
ALTER TABLE tags ALTER COLUMN created_by DROP NOT NULL;

-- 3. Allow nulling out submitted_by on site_edits
ALTER TABLE site_edits ALTER COLUMN submitted_by DROP NOT NULL;

-- 4. Allow nulling out submitted_by on pending_submissions
ALTER TABLE pending_submissions ALTER COLUMN submitted_by DROP NOT NULL;

-- 5. Allow nulling out created_by on site_contributor_notes
ALTER TABLE site_contributor_notes ALTER COLUMN created_by DROP NOT NULL;

-- 6. Allow nulling out reviewed_by on site_edits
ALTER TABLE site_edits ALTER COLUMN reviewed_by DROP NOT NULL;

-- 7. Allow nulling out updated_by on site_config
ALTER TABLE site_config ALTER COLUMN updated_by DROP NOT NULL;

-- 8. RLS policy: allow users to DELETE their own profile row
CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE
  USING (auth.uid() = id);
