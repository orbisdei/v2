# Prompt 2: Interest Filter — Component & Integration into All Views

## Overview
Create the `InterestFilter` segmented-button component and integrate it into every view that shows multiple sites: Homepage, Search, Tag pages. Also wire up URL persistence and map pin filtering.

## IMPORTANT: Read CLAUDE.md first. Scan `lib/interestFilter.ts` (created in Prompt 1), then scan all files you'll be modifying: `app/HomePageClient.tsx`, `app/page.tsx`, `app/search/SearchClient.tsx`, `app/search/page.tsx`, `app/tag/[slug]/TagPageClient.tsx`, `app/tag/[slug]/page.tsx`, `components/Sidebar.tsx`.

---

## 1. New component: `components/InterestFilter.tsx`

A segmented button group (like a horizontal radio group with joined buttons). **Do NOT create a separate file for this — it goes in `components/InterestFilter.tsx`.**

### Design spec:
- Horizontal row of joined buttons with `rounded-lg` on the outer edges, flat inner edges via `border` between segments
- Active segment: `bg-navy-900 text-white`
- Inactive segment: `bg-white text-gray-600 hover:bg-gray-50 border border-gray-200`
- Min height 40px on desktop, 44px on mobile (min-h-[44px] on mobile breakpoint)
- Each button toggles its level on/off independently (multi-select, not radio)
- Constraint: at least one level must remain active — clicking the last active button does nothing
- Font: `text-[13px] font-medium` (matches existing body text)
- Labels: capitalize each level name ("Global", "Regional", "Local", "Personal")

### Props:
```typescript
import type { InterestLevel } from '@/lib/interestFilter';

interface InterestFilterProps {
  activeLevels: Set<InterestLevel>;
  onChange: (levels: Set<InterestLevel>) => void;
  availableLevels: InterestLevel[];
  /** Total unfiltered count — when filtering hides some sites, show "X of Y" hint */
  totalCount?: number;
  /** Filtered count */
  filteredCount?: number;
  className?: string;
}
```

### Behavior:
- Render one button per `availableLevels` entry (in order: global, regional, local, personal)
- On click: toggle that level. If this would result in an empty set, do nothing.
- Below the buttons, show a subtle hint ONLY when filtering is active (filteredCount < totalCount):
  `"Showing {filteredCount} of {totalCount} sites"`
  Style: `text-[11px] text-gray-400 mt-1`

### Example render (non-admin):
```
┌──────────┬────────────┬─────────┐
│  Global  │  Regional  │  Local  │
└──────────┴────────────┴─────────┘
Showing 24 of 87 sites
```

---

## 2. Integration: Homepage (`app/page.tsx` + `app/HomePageClient.tsx`)

### 2a. Server component (`app/page.tsx`):

Add `getAppSettings` to the imports from `lib/data.ts` and fetch it in the `Promise.all`:

```typescript
const [allSites, allTags, featuredSites, mapPins, appSettings] = await Promise.all([
  getAllSites(),
  getAllTags(),
  getFeaturedSites(),
  getMapPins(),
  getAppSettings(),
]);
```

Also fetch the user role so we can pass it down:

```typescript
const supabase = await createClient();
const { data: { user: authUser } } = await supabase.auth.getUser();
let userRole: string | null = null;
if (authUser) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', authUser.id)
    .single();
  userRole = profile?.role ?? null;
}
```

Pass `appSettings` and `userRole` as new props to `HomePageClient`.

### 2b. Client component (`app/HomePageClient.tsx`):

Add new props to `HomePageClientProps`:
```typescript
appSettings: Record<string, unknown>;
userRole?: string | null;
```

Add imports:
```typescript
import InterestFilter from '@/components/InterestFilter';
import {
  type InterestLevel,
  filterByInterest,
  filterPinsBySiteIds,
  stripPersonalSites,
  getAvailableLevels,
} from '@/lib/interestFilter';
import { useSearchParams, useRouter } from 'next/navigation';
```

Add state and filtering logic near the top of the component:

```typescript
const searchParams = useSearchParams();
const router = useRouter();

// Available levels based on role
const availableLevels = useMemo(() => getAvailableLevels(userRole), [userRole]);

// Default levels from settings, falling back to ['global', 'regional']
const defaultLevels = useMemo((): InterestLevel[] => {
  const fromSettings = appSettings?.homepage_default_levels;
  if (Array.isArray(fromSettings)) return fromSettings as InterestLevel[];
  return ['global', 'regional'];
}, [appSettings]);

// Initialize from URL params or settings default
const [activeLevels, setActiveLevels] = useState<Set<InterestLevel>>(() => {
  const param = searchParams.get('levels');
  if (param) {
    const parsed = param.split(',').filter((l) => availableLevels.includes(l as InterestLevel)) as InterestLevel[];
    if (parsed.length > 0) return new Set(parsed);
  }
  return new Set(defaultLevels);
});

// Sync URL when filter changes (shallow replace, no scroll)
const handleFilterChange = useCallback((levels: Set<InterestLevel>) => {
  setActiveLevels(levels);
  const sorted = [...levels].sort((a, b) =>
    (['global', 'regional', 'local', 'personal'].indexOf(a)) -
    (['global', 'regional', 'local', 'personal'].indexOf(b))
  );
  const params = new URLSearchParams(searchParams.toString());
  params.set('levels', sorted.join(','));
  router.replace(`?${params.toString()}`, { scroll: false });
}, [router, searchParams]);

// Strip personal sites for non-admins, then filter by active levels
const visibleSites = useMemo(() => {
  const stripped = stripPersonalSites(allSites, userRole);
  return filterByInterest(stripped, activeLevels);
}, [allSites, userRole, activeLevels]);

const strippedAllSites = useMemo(() => stripPersonalSites(allSites, userRole), [allSites, userRole]);

// Filter map pins to match visible sites
const visiblePinIds = useMemo(() => new Set(visibleSites.map((s) => s.id)), [visibleSites]);
const visiblePins = useMemo(() => filterPinsBySiteIds(mapPins, visiblePinIds), [mapPins, visiblePinIds]);

// Also filter featured sites
const visibleFeaturedSites = useMemo(() => {
  const stripped = stripPersonalSites(featuredSites, userRole);
  return filterByInterest(stripped, activeLevels);
}, [featuredSites, userRole, activeLevels]);
```

Now use `visibleSites` instead of `allSites` wherever sites are listed, `visiblePins` instead of `mapPins` for all `MapViewDynamic` pin props, and `visibleFeaturedSites` instead of `featuredSites`.

**Pass `visibleSites` to the `Sidebar` component instead of `allSites` for the `sites` prop**, and pass `visibleFeaturedSites` for the `featuredSites` prop. Keep passing the full `allTags` unchanged. **Do NOT modify `Sidebar.tsx` internally** — it already takes `sites` and `featuredSites` as props and will naturally show only filtered content.

**Desktop map overlay filter:** Inside the desktop layout section, add the `InterestFilter` as a floating overlay inside the map container (the `div.flex-1.relative` that wraps `MapViewDynamic`):

```tsx
<div className="flex-1 relative">
  <MapViewDynamic
    pins={visiblePins}
    // ... existing props
  />
  {/* Interest filter — floating on map, top-left */}
  <div className="absolute top-3 left-3 z-[400]">
    <InterestFilter
      activeLevels={activeLevels}
      onChange={handleFilterChange}
      availableLevels={availableLevels}
      totalCount={strippedAllSites.length}
      filteredCount={visibleSites.length}
    />
  </div>
  {/* existing fullscreen button stays */}
</div>
```

**Mobile layout filter:** In the mobile layout, place the `InterestFilter` just below the drag handle div, above the scrollable content. It should NOT be inside the map viewport (too small). Place it as a `shrink-0` section:

```tsx
{/* Drag handle */}
<div className="shrink-0 flex justify-center py-2 bg-white border-b border-gray-100">
  <div className="w-10 h-1 bg-gray-300 rounded-full" />
</div>

{/* Interest filter — below drag handle on mobile */}
<div className="shrink-0 px-3 py-2 bg-white border-b border-gray-100">
  <InterestFilter
    activeLevels={activeLevels}
    onChange={handleFilterChange}
    availableLevels={availableLevels}
    totalCount={strippedAllSites.length}
    filteredCount={visibleSites.length}
  />
</div>
```

Also update the mobile `MapViewDynamic` to use `visiblePins`, and the fullscreen map overlays (both desktop and mobile) to also use `visiblePins`.

**Ensure the search-related `useMemo` hooks that reference `allSites` continue to search against ALL sites** (not filtered ones) — search results should search broadly but still respect personal-site hiding. So `mapSearchResults` and `mobileSearchResults` should filter from `strippedAllSites`, not `visibleSites`.

---

## 3. Integration: Search page (`app/search/page.tsx` + `app/search/SearchClient.tsx`)

### 3a. Server component (`app/search/page.tsx`):

Fetch user role the same way as homepage. Pass `userRole` to `SearchClient`.

### 3b. Client component (`app/search/SearchClient.tsx`):

Add `userRole` to props. Add the same imports for `InterestFilter`, `interestFilter` utils, `useSearchParams`, `useRouter`.

Default active levels: all public levels (global + regional + local). No settings dependency needed here.

Apply `stripPersonalSites` to `allSites` first, then `filterByInterest` for the displayed list. The text search `useMemo` should search within `strippedAllSites` (not filtered), then the results get intersected with `activeLevels` for display.

Place the `InterestFilter` component inline below the search bar, above results:

**Mobile:** Below the navy search hero section, above the "Holy sites" heading:
```tsx
<div className="px-3 py-2 bg-white border-b border-gray-100">
  <InterestFilter ... />
</div>
```

**Desktop:** Same placement works — below the search input area, above results.

---

## 4. Integration: Tag pages (`app/tag/[slug]/page.tsx` + `app/tag/[slug]/TagPageClient.tsx`)

### 4a. Server component (`app/tag/[slug]/page.tsx`):

Fetch `getAppSettings()` and pass as `appSettings` prop to `TagPageClient`.

### 4b. Client component (`TagPageClient.tsx`):

Add `appSettings` to `TagPageClientProps`.

Import `InterestFilter` and all filter utilities.

**Compute default levels based on tag type:**

```typescript
const availableLevels = useMemo(() => getAvailableLevels(userRole), [userRole]);

const defaultLevels = useMemo((): InterestLevel[] => {
  if (isTopic) {
    // Topic tags: show all levels by default (no filtering)
    return [...availableLevels];
  }
  // Location tags: use smart threshold-based default
  const highThreshold = (typeof appSettings?.location_tag_high_threshold === 'number')
    ? appSettings.location_tag_high_threshold
    : 25;
  const lowThreshold = (typeof appSettings?.location_tag_low_threshold === 'number')
    ? appSettings.location_tag_low_threshold
    : 10;
  return computeLocationDefault(sites, highThreshold, lowThreshold);
}, [isTopic, sites, availableLevels, appSettings]);
```

Apply `stripPersonalSites` then `filterByInterest` to create `visibleSites`. Derive `visiblePins` from `visibleSites` using `filterPinsBySiteIds`.

**Desktop tag page (right map panel):** Float the `InterestFilter` at top-left of the map container, exactly like homepage:

```tsx
<div className="hidden lg:block lg:w-1/2 xl:w-[55%] sticky top-0 h-[calc(100dvh-56px)] relative">
  <MapViewDynamic pins={visiblePins} ... />
  <div className="absolute top-3 left-3 z-[400]">
    <InterestFilter ... />
  </div>
</div>
```

**Mobile tag page:** Place the `InterestFilter` inline between the "X Results / View on map" bar and the scrollable site list. Add it inside the sticky top section:

```tsx
{/* Results count + View on map */}
<div className="flex items-center justify-between px-[14px] pt-[12px] pb-[8px] border-b border-gray-200">
  <span ...>{visibleSites.length} ...</span>
  <button ...>View on map</button>
</div>

{/* Interest filter */}
<div className="px-3 py-2 bg-white border-b border-gray-100">
  <InterestFilter ... />
</div>
```

Update the results count to show `visibleSites.length` instead of `sites.length`.

Use `visibleSites` in the site list rendering and `visiblePins` in the map.

**Fullscreen map overlay on mobile tag pages:** Also show the `InterestFilter` floating at top of the fullscreen map (alongside the search bar and close button). Position it below the search bar row:

```tsx
{mapFullscreen && (
  <div className="fixed inset-0 z-50">
    <MapViewDynamic pins={visiblePins} ... />
    <div className="absolute top-0 left-0 right-0 z-[500] p-3 flex flex-col gap-2">
      {/* Existing close button + search row */}
      <div className="flex items-center gap-2">
        <button ...>X</button>
        <input ... />
      </div>
      {/* Filter */}
      <InterestFilter ... />
    </div>
    {/* existing search results dropdown */}
  </div>
)}
```

---

## 5. Important details

### URL persistence
- Use `?levels=global,regional` query param on all three page types (homepage, search, tag)
- On filter change, use `router.replace()` with `{ scroll: false }` to avoid page jump
- On page load, read from URL params first; if not present, use the default for that view

### Map pin filtering
- Do NOT pass `interest` filter to `MapView.tsx` or modify it — filter the pins BEFORE passing them as props
- All map instances (inline, fullscreen) should receive the already-filtered `visiblePins`

### Sidebar (homepage)
- **Do NOT modify `Sidebar.tsx`** — pass it `visibleSites` and `visibleFeaturedSites` from the parent
- The sidebar's internal search should still work against visible sites only (which is correct — it searches the `sites` prop)

### Featured sites
- On homepage, featured sites should also be filtered by interest level (use `filterByInterest` on the `featuredSites` prop after `stripPersonalSites`)

### `useSearchParams` requires Suspense
- Wrap any component that uses `useSearchParams()` in a `<Suspense>` boundary if not already wrapped, to avoid the Next.js build warning. The simplest approach is to wrap the client component import in the server component with `<Suspense fallback={null}>`.

---

## 6. Verification

After all changes:
1. Run `$env:PORT=3001; npm run dev`
2. **Homepage:** Verify the segmented filter appears floating on the desktop map (top-left). Toggle buttons and confirm:
   - Site list in sidebar updates
   - Map pins update (some disappear/appear)
   - URL updates with `?levels=...`
   - Refreshing the page preserves the filter state from URL
3. **Homepage mobile:** Verify filter appears below drag handle, above content. Same toggle behavior.
4. **Search page:** Verify filter appears below search bar. Toggle and confirm results filter.
5. **Tag page (Italy or another location tag with many sites):** Verify smart default kicks in (likely shows only Global for a large country). Toggle and confirm.
6. **Tag page (topic tag):** Verify all levels are active by default.
7. **Non-admin view:** Verify "Personal" button does NOT appear. Verify any personal-interest sites are completely hidden.
8. **Admin view:** Verify "Personal" button appears as a fourth segment.
