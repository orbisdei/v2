-- ============================================================
-- Orbis Dei — Admin Dashboard Schema
-- Run this in the Supabase SQL editor.
-- ============================================================

-- 1. Add coordinates_verified column to sites
ALTER TABLE sites ADD COLUMN IF NOT EXISTS coordinates_verified boolean NOT NULL DEFAULT false;

-- 2. Create coordinate_candidates table
CREATE TABLE IF NOT EXISTS coordinate_candidates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id text NOT NULL REFERENCES sites(id) ON UPDATE CASCADE ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('google_places', 'opencage', 'nominatim')),
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  raw_response jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(site_id, source)
);

-- 3. RLS policies for coordinate_candidates

ALTER TABLE coordinate_candidates ENABLE ROW LEVEL SECURITY;

-- Public SELECT
CREATE POLICY "coordinate_candidates_select_public"
  ON coordinate_candidates
  FOR SELECT
  USING (true);

-- INSERT restricted to administrators
CREATE POLICY "coordinate_candidates_insert_admin"
  ON coordinate_candidates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'administrator'
    )
  );

-- UPDATE restricted to administrators
CREATE POLICY "coordinate_candidates_update_admin"
  ON coordinate_candidates
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'administrator'
    )
  );

-- DELETE restricted to administrators
CREATE POLICY "coordinate_candidates_delete_admin"
  ON coordinate_candidates
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'administrator'
    )
  );

-- 4. Backfill: mark sites with a non-null google_maps_url as verified
UPDATE sites
SET coordinates_verified = true
WHERE google_maps_url IS NOT NULL
  AND google_maps_url <> '';
