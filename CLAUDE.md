# Orbis Dei

Catholic and Christian holy sites explorer — interactive map with site detail pages, user accounts, and contributor tools.

**Live site:** https://orbisdei.org

## Tech Stack

- **Framework**: Next.js 16 (App Router), TypeScript, Tailwind CSS
- **Database & Auth**: Supabase (PostgreSQL, Google OAuth, Row Level Security)
- **Maps**: Leaflet + OpenStreetMap (free, no API key)
- **Image Storage**: Supabase Storage (bucket: site-images)
- **AI**: Google Gemini API (gemini-2.5-flash) for bulk site import
- **Deployment**: Vercel (auto-deploys from GitHub on push to main)
- **Environment**: Windows / PowerShell

## Verification

After making changes, run:
```bash
$env:PORT=3001; npm run dev
```
Then check the affected pages in the browser. There are no unit tests or linting commands configured.

## Project Structure

```
app/
  page.tsx                    # Homepage — map + sidebar (desktop) / split view (mobile)
  layout.tsx                  # Root layout, fonts, Leaflet CSS
  globals.css                 # Tailwind + Leaflet overrides
  site/[slug]/                # Site detail pages (own URLs for sharing/bookmarking)
    page.tsx                  # Server component (SEO metadata)
    SiteDetailClient.tsx      # Client component (images, map, actions)
    edit/page.tsx             # Edit site form (contributors + admins)
  topic/[slug]/page.tsx       # Topic pages
  search/page.tsx             # Search page
  profile/page.tsx            # User profile (edit initials, About Me)
  about/page.tsx              # About page
  admin/                      # Admin pages
    page.tsx                  # Admin dashboard
    import/page.tsx           # AI bulk import (Gemini-powered)
  contribute/new-site/        # Add new site form
  api/
    upload-image/route.ts     # Image upload to Supabase Storage
    import-sites/route.ts     # AI bulk import API (Gemini)
    publish-site-edit/route.ts # Admin publish edits
components/
  Header.tsx                  # Nav bar — hamburger left, logo centered, avatar right
  MapView.tsx                 # Leaflet map with clustering (client-only)
  MapViewDynamic.tsx          # Dynamic import wrapper (no SSR)
  SitePreviewCard.tsx         # Unified preview card (mobile bottom panel + Leaflet popups)
  Sidebar.tsx                 # Desktop sidebar (search, topics, featured sites)
  FavoriteButton.tsx          # Visited + bookmark circle buttons
  admin/SiteForm.tsx          # Shared form for contribute, edit, and admin import
lib/
  types.ts                    # TypeScript interfaces (LinkEntry, SiteFormValues, etc.)
  data.ts                     # ALL Supabase queries go here — single data access layer
  storage.ts                  # ALL image uploads go here — single function, swap point for future migration
utils/supabase/
  client.ts                   # Browser Supabase client (for client components)
  server.ts                   # Server Supabase client (for server components, uses cookies)
  static.ts                   # Static Supabase client (for generateStaticParams, no cookies)
```

## Database Schema (Supabase)

### Supabase MCP
A Supabase MCP server is connected and scoped to this project. Use it for schema queries, SQL execution, migrations, and TypeScript type generation instead of asking the user to run SQL in the dashboard. Always review destructive operations before executing.

### Core Tables
- **sites** — id (text slug), name, native_name, short_description, country (2-char code), region, municipality, latitude, longitude, google_maps_url, interest (global/regional/local/personal), featured (bool), contributor (text legacy), created_by (uuid → auth.users), created_at, updated_at
- **site_images** — id, site_id → sites, url, caption, storage_type (local/external), display_order
- **site_links** — id, site_id → sites, url, link_type (e.g. "Official Website"), comment
- **site_tags** — site_id → sites, tag_id → tags (many-to-many join)
- **tags** — id (text slug), name, description, image_url, featured (bool), type (country/region/municipality/topic), parent_tag_id, country_code

### User Tables
- **profiles** — id (uuid → auth.users), display_name, email, avatar_url, initials (3 chars, immutable), initials_display (unique, may have number suffix e.g. JMM1), about_me, role ('general'/'contributor'/'administrator'), created_at, updated_at
- **visited_sites** — id, user_id → auth.users, site_id, created_at. Unique(user_id, site_id)
- **user_lists** — id, user_id → auth.users, name, description, is_public (bool, default false), created_at, updated_at
- **user_list_items** — id, list_id → user_lists, site_id, added_at. Unique(list_id, site_id)

### Contributor Tables
- **site_contributor_notes** — id, site_id, note, created_by (uuid → auth.users), created_at
- **site_edits** — id, site_id → sites, submitted_by (uuid), status ('pending'/'approved'/'rejected'), name, short_description, latitude, longitude, google_maps_url, images (jsonb), links (jsonb), reviewed_by (uuid), reviewed_at, review_note, created_at

### Key RLS Policies
- Profiles: anyone can SELECT, users can UPDATE their own (but cannot change initials/initials_display)
- Visited/lists: users can only CRUD their own rows
- User lists: users see own + public lists
- Site edits: contributors see own, admins see all, only admins can UPDATE (approve/reject)

### Triggers
- on_auth_user_created → creates profile with auto-generated initials
- on_auth_user_created_lists → creates default "Favorites" and "Want to visit" lists

### DB Constraints
- Foreign keys on `sites.id` use `ON UPDATE CASCADE` to support ID renames.
- Supabase write operations (inserts, updates, deletes) require the **service role key**, not the anon key.
- The Supabase free tier pauses after 7 days of inactivity.

## Patterns — READ BEFORE CREATING NEW FILES

### CRITICAL: Never duplicate components
Before creating any new component, check if a shared component already exists. The codebase uses shared components deliberately:
- `SitePreviewCard` — used in mobile bottom panel, Leaflet popups (desktop + fullscreen), and sidebar
- `SiteForm.tsx` (in components/admin/) — shared form for Contribute page, Edit page, and Admin Import page. All three entry points use this one form. Never create a separate form.
- `MapViewDynamic.tsx` — the single dynamic import wrapper for the Leaflet map

If you think you need a new component, first scan `components/` for an existing one that does the same thing.

### Data access
- **All database reads/writes go through `lib/data.ts`** — never call Supabase directly from page or component files
- **All image operations go through `lib/storage.ts`** — single function to swap for future storage migration
- Use the correct Supabase client: `client.ts` for browser/client components, `server.ts` for server components (uses cookies), `static.ts` for `generateStaticParams` (no cookies)

### New page pattern
Admin and content pages follow this structure:
1. **Server component** (`page.tsx`) — auth check, metadata, fetch initial data via `lib/data.ts`
2. **Client component** (`*Client.tsx`) — state, UI, user interactions
3. Data fetching in server component, passed as props to client component

### API route pattern
API routes live in `app/api/`. They use the server Supabase client or service role client as needed. Return `NextResponse.json()`.

### Mobile layout
- Homepage: split view — map top (~40vh), scrollable content bottom
- All other pages: single scrollable column, no side-by-side map
- Header: hamburger left, logo centered, avatar right
- Fullscreen map: overlay with X close, preserves scroll position

### Map behavior
- **Desktop**: Leaflet popup uses SitePreviewCard via React createPortal
- **Mobile split view**: Pin tap shows SitePreviewCard in bottom panel (not a Leaflet popup)
- **Mobile fullscreen**: Leaflet popup uses SitePreviewCard via React createPortal (same as desktop)

### Image display
- Landscape/square photos (≥1:1): adaptive aspect ratio container, object-fit cover
- Portrait photos (<1:1): fixed container with blurred background fill
- Carousel uses crossfade transitions (300ms)

## User Roles

- **general**: browse, visited, lists
- **contributor**: all general + edit sites (with admin approval), upload photos, add notes
- **administrator**: all contributor + direct publish, bulk import, manage featured items

Admin profile ID: `659520ff-d073-4538-a006-b16ec3e674d3`

## Visual Design

- Navy (#1e1e5f) and gold (#c9950c) brand colors
- Serif font (Georgia) for headings, sans (Inter) for body
- 44px minimum tap targets on mobile
- All icons from lucide-react
- Visited state: green (#639922) circle with checkmark
- Bookmark state: navy (#1e1e5f) filled circle
- Featured badge: gold-tinted pill (#fef8e0 bg, #8a6d0b text)
- "Already in inventory" badge: amber-tinted (#fffcf5 bg, #854f0b text)

## Known Gotchas

- `.env.local` values may contain surrounding quotes — always `.Trim().Trim('"').Trim("'")` when parsing in PowerShell scripts
- PowerShell's `Invoke-RestMethod` can mangle auth headers — use `Invoke-WebRequest` with inline headers instead
- Leaflet requires `dynamic()` import with `ssr: false` — never import MapView directly in a server component
- The `comment` field on `site_links` / `LinkEntry` type must be preserved through the full edit flow (it was previously silently stripped)
- Nominatim reverse geocoding requires a 1.1-second delay between calls to respect rate limits

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
```

## Deploy
```powershell
function deploy($msg) { git add .; git commit -m "$msg"; git push origin main }
deploy "your commit message"
```
Vercel auto-deploys on push to main.