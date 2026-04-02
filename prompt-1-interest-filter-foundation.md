# Prompt 1: Interest Filter — Foundation (DB, Types, Utilities)

## Overview
Add infrastructure for interest-level filtering across the site. This prompt covers: a new `site_config` table, utility functions, type updates, data layer additions, and CLAUDE.md documentation.

## IMPORTANT: Read CLAUDE.md first, then scan `lib/data.ts`, `lib/types.ts`, and `app/admin/AdminClient.tsx` before making changes.

---

## 1. SQL Migration (run via Supabase MCP — `execute_sql`)

Create the `site_config` table and seed initial values:

```sql
-- site_config: key-value store for admin-configurable settings
CREATE TABLE IF NOT EXISTS site_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- RLS: anyone can read, only administrators can write
ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read site_config"
  ON site_config FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert site_config"
  ON site_config FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'administrator')
  );

CREATE POLICY "Admins can update site_config"
  ON site_config FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'administrator')
  );

-- Seed initial values
INSERT INTO site_config (key, value) VALUES
  ('homepage_default_levels', '["global", "regional"]'::jsonb),
  ('location_tag_high_threshold', '25'::jsonb),
  ('location_tag_low_threshold', '10'::jsonb)
ON CONFLICT (key) DO NOTHING;
```

---

## 2. New file: `lib/interestFilter.ts`

Create this utility module:

```typescript
import type { Site, MapPin } from './types';

export type InterestLevel = 'global' | 'regional' | 'local' | 'personal';

export const INTEREST_HIERARCHY: InterestLevel[] = ['global', 'regional', 'local', 'personal'];
export const PUBLIC_LEVELS: InterestLevel[] = ['global', 'regional', 'local'];
export const ADMIN_LEVELS: InterestLevel[] = ['global', 'regional', 'local', 'personal'];

/**
 * Normalize a site's interest value. Treat null/undefined/invalid as 'local'.
 */
export function normalizeInterest(interest?: string | null): InterestLevel {
  if (interest && (INTEREST_HIERARCHY as string[]).includes(interest)) {
    return interest as InterestLevel;
  }
  return 'local';
}

/**
 * Filter an array of sites (or any object with an `interest` field) by active levels.
 */
export function filterByInterest<T extends { interest?: string | null }>(
  items: T[],
  activeLevels: Set<InterestLevel>,
): T[] {
  return items.filter((item) => activeLevels.has(normalizeInterest(item.interest)));
}

/**
 * Filter map pins by a set of allowed site IDs (derived from filtered sites).
 */
export function filterPinsBySiteIds(pins: MapPin[], allowedIds: Set<string>): MapPin[] {
  return pins.filter((pin) => allowedIds.has(pin.id));
}

/**
 * For location tag pages: compute the smart default filter levels.
 * - If global count >= highThreshold: show only Global
 * - If global+regional count >= lowThreshold: show Global + Regional
 * - Otherwise: show Global + Regional + Local (no filtering needed)
 */
export function computeLocationDefault(
  sites: { interest?: string | null }[],
  highThreshold: number,
  lowThreshold: number,
): InterestLevel[] {
  const globalCount = sites.filter((s) => normalizeInterest(s.interest) === 'global').length;
  const globalRegionalCount = sites.filter((s) =>
    ['global', 'regional'].includes(normalizeInterest(s.interest)),
  ).length;

  if (globalCount >= highThreshold) return ['global'];
  if (globalRegionalCount >= lowThreshold) return ['global', 'regional'];
  return ['global', 'regional', 'local'];
}

/**
 * Get the available levels for a user based on their role.
 * Non-admins never see 'personal'. Admins see all.
 */
export function getAvailableLevels(userRole?: string | null): InterestLevel[] {
  return userRole === 'administrator' ? ADMIN_LEVELS : PUBLIC_LEVELS;
}

/**
 * Remove personal sites for non-admin users. Always call this before any other filtering.
 */
export function stripPersonalSites<T extends { interest?: string | null }>(
  items: T[],
  userRole?: string | null,
): T[] {
  if (userRole === 'administrator') return items;
  return items.filter((item) => normalizeInterest(item.interest) !== 'personal');
}
```

---

## 3. Update `lib/types.ts`

Add `interest` to the `MapPin` interface:

```typescript
export interface MapPin {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  short_description: string;
  thumbnail_url?: string;
  interest?: string;  // ← ADD THIS
}
```

---

## 4. Update `lib/data.ts`

### 4a. Update `getMapPins()` to include `interest`

In the `getMapPins()` function, add `interest` to the select query and the returned object:

Change the select from:
```
'id, name, latitude, longitude, short_description, site_images(url, display_order)'
```
to:
```
'id, name, latitude, longitude, short_description, interest, site_images(url, display_order)'
```

And add `interest: row.interest as string | undefined` to the returned MapPin object.

### 4b. Add `getAppSettings()` function

Add these new functions to `lib/data.ts`:

```typescript
/** Fetch all site_config rows as a key→value map. */
export async function getAppSettings(): Promise<Record<string, unknown>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('site_config')
    .select('key, value');
  if (error) throw error;
  const settings: Record<string, unknown> = {};
  for (const row of data ?? []) {
    settings[row.key] = row.value;
  }
  return settings;
}

/** Fetch a single site_config value by key. Returns null if not found. */
export async function getAppSetting(key: string): Promise<unknown> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('site_config')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (error) throw error;
  return data?.value ?? null;
}
```

---

## 5. Update `CLAUDE.md`

### 5a. Add `site_config` to the Database Schema section

Under "### Core Tables", add:

```
- **site_config** — key (text PK), value (jsonb), updated_at, updated_by (uuid → auth.users). Admin-configurable app settings. RLS: public SELECT, admin-only INSERT/UPDATE. Current keys: `homepage_default_levels` (json array of interest levels), `location_tag_high_threshold` (number), `location_tag_low_threshold` (number).
```

### 5b. Add `InterestFilter` to the shared components note

Under "### CRITICAL: Never duplicate components", add:

```
- `InterestFilter.tsx` — segmented button group for interest-level filtering. Used on homepage, search, and tag pages. Accepts `activeLevels`, `onChange`, and `availableLevels` props.
```

### 5c. Add `interestFilter.ts` to the project structure

In the `lib/` section of the Project Structure, add:

```
  interestFilter.ts             # Interest-level filtering utilities (types, filter helpers, smart defaults)
```

### 5d. Add to the ## Tech Debt section at the bottom of CLAUDE.md:

```
- **Server-side interest filtering** — Currently, interest-level filtering is done client-side via `useMemo` in each page's client component. When the site count reaches thousands, move filtering into `lib/data.ts` query functions (add `interestLevels?: InterestLevel[]` param to `getAllSites()`, `getMapPins()`, `getSitesByTag()`, etc.) so that only matching rows are fetched from Supabase. The `lib/interestFilter.ts` utility and `InterestFilter` component are designed to support this migration with no UI changes needed.
```

### 5e. Add to the Project Structure under `app/admin/`:

```
    settings/page.tsx         # Admin settings (interest filter defaults, thresholds)
```

---

## 6. Verification

After all changes:
1. Run `$env:PORT=3001; npm run dev`
2. Confirm the app compiles without errors
3. Confirm `getMapPins()` now returns `interest` on each pin (check browser network tab or add a console.log)
4. Confirm `getAppSettings()` returns the three seeded keys
