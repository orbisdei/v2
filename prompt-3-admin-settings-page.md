# Prompt 3: Interest Filter — Admin Settings Page

## Overview
Create a new `/admin/settings` page where administrators can configure interest filter defaults and thresholds. Also create an API route for saving settings.

## IMPORTANT: Read CLAUDE.md first. Scan `app/admin/page.tsx`, `app/admin/AdminClient.tsx`, `lib/data.ts`, and `lib/interestFilter.ts` before making changes.

---

## 1. New API route: `app/api/update-settings/route.ts`

Create this route for saving settings. It should:

- Accept POST with JSON body: `{ key: string, value: unknown }`
- Verify the caller is an administrator (same auth pattern as other admin routes — use `createClient()` from `utils/supabase/server`, check `auth.getUser()`, then check `profiles.role = 'administrator'`)
- Use the **service role client** (`createServiceClient`) to upsert into `site_config`:
  ```sql
  INSERT INTO site_config (key, value, updated_at, updated_by)
  VALUES ($key, $value, now(), $userId)
  ON CONFLICT (key) DO UPDATE SET value = $value, updated_at = now(), updated_by = $userId
  ```
- Return `{ success: true }` on success, or `{ error: '...' }` with appropriate status codes (401, 403, 500)
- Validate that `key` is one of the known setting keys: `homepage_default_levels`, `location_tag_high_threshold`, `location_tag_low_threshold`. Reject unknown keys with 400.
- For `homepage_default_levels`: validate that value is an array of valid InterestLevel strings
- For threshold keys: validate that value is a positive integer

---

## 2. New page: `app/admin/settings/page.tsx` (server component)

Follow the standard page pattern:

```typescript
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import Header from '@/components/Header';
import SettingsClient from './SettingsClient';
import { getAppSettings } from '@/lib/data';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings — Admin — Orbis Dei',
};

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'administrator') redirect('/');

  const settings = await getAppSettings();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <SettingsClient settings={settings} />
    </div>
  );
}
```

---

## 3. New component: `app/admin/settings/SettingsClient.tsx`

A client component for the settings form.

### Layout:
- Max-width container (`max-w-2xl mx-auto px-4 py-8`)
- Page title: "Site Settings" (font-serif, text-2xl, font-bold, text-navy-900)
- Back link to `/admin` ("← Back to dashboard")
- A card (white bg, rounded-xl, border, p-6) titled "Interest Level Filtering"

### Card contents:

**Section 1: "Homepage Default Filter"**
- Label: "Which interest levels are shown by default on the homepage map"
- Use the same `InterestFilter` component from `components/InterestFilter.tsx`, but here it's used as a settings editor (not live filtering). Pass the current setting as `activeLevels` and update local state on change.
- Important: For the settings page, the `availableLevels` should be `PUBLIC_LEVELS` only (admins are configuring what PUBLIC visitors see by default — admin's own "Personal" button is always additive and not part of the default)
- Show the current saved value as `activeLevels`, allow toggling, and save on submit

**Section 2: "Location Tag Thresholds"**
- Two number inputs with labels:
  - "High threshold" — "Show only Global sites when a location tag has this many or more global-interest sites" — default 25
  - "Low threshold" — "Show Global + Regional when a location tag has this many or more combined global+regional sites" — default 10
- Each is a standard number input (`type="number"`, min 1, step 1)
- Style: `w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300`

**Save button:**
- At the bottom of the card: "Save settings" button (navy bg, white text, same style as other admin actions)
- On click, send each changed setting to `/api/update-settings` via separate POST calls
- Show a loading state while saving ("Saving…")
- Show a toast on success ("Settings saved") — use the same toast pattern as `AdminClient.tsx`
- Show error inline if any call fails

### State management:
```typescript
const [homepageLevels, setHomepageLevels] = useState<Set<InterestLevel>>(() => {
  const val = settings.homepage_default_levels;
  if (Array.isArray(val)) return new Set(val as InterestLevel[]);
  return new Set(['global', 'regional']);
});

const [highThreshold, setHighThreshold] = useState<number>(() => {
  const val = settings.location_tag_high_threshold;
  return typeof val === 'number' ? val : 25;
});

const [lowThreshold, setLowThreshold] = useState<number>(() => {
  const val = settings.location_tag_low_threshold;
  return typeof val === 'number' ? val : 10;
});
```

---

## 4. Add link to settings from Admin Dashboard

In `app/admin/AdminClient.tsx`, add a link to the settings page. Place it next to the existing "Import sites with AI" button in the header area:

```tsx
<div className="flex items-center justify-between mb-6">
  <h1 className="font-serif text-2xl font-bold text-navy-900">Admin Dashboard</h1>
  <div className="flex items-center gap-2">
    <Link
      href="/admin/settings"
      className="inline-flex items-center gap-1.5 border border-gray-200 text-navy-900 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
    >
      <Settings size={14} />
      Settings
    </Link>
    <Link
      href="/admin/import"
      className="inline-flex items-center gap-1.5 bg-navy-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-navy-700 transition-colors"
    >
      <Sparkles size={14} />
      Import sites with AI
    </Link>
  </div>
</div>
```

Add `Settings` to the lucide-react imports in AdminClient.

---

## 5. Verification

After all changes:
1. Run `$env:PORT=3001; npm run dev`
2. Navigate to `/admin/settings` as an admin user
3. Verify:
   - The page loads with current settings pre-populated
   - Homepage default levels show the correct segmented buttons (global + regional active by default)
   - Threshold inputs show 25 and 10
   - Toggling a level and clicking Save updates the setting (verify by refreshing the page)
   - Changing a threshold and clicking Save works
   - Toast appears on successful save
   - Non-admin users get redirected to `/`
4. Navigate to `/admin` and verify the "Settings" link appears next to "Import sites with AI"
5. Change the homepage default to Global only via settings, then navigate to `/` (homepage) — verify the filter defaults to Global only
6. Change the high threshold to something low (e.g. 3), then visit a location tag page — verify the smart default changes accordingly
