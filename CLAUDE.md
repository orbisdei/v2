# Orbis Dei

Catholic and Christian holy sites explorer — interactive map with site detail pages, user accounts, and contributor tools.

**Live site:** https://orbisdei.org

## Tech Stack

- **Framework**: Next.js 16 (App Router), TypeScript, Tailwind CSS
- **Database & Auth**: Supabase (PostgreSQL, Google OAuth, Row Level Security)
- **Maps**: Leaflet + OpenStreetMap (free, no API key)
- **Image Storage**: Cloudflare R2 (bucket: orbis-dei-images, served via images.orbisdei.org)
- **AI**: Google Gemini API (gemini-2.5-flash) for bulk site import; Parallel.ai Task API for web-grounded holy site discovery
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
  search/page.tsx             # Search page — uses SiteListRow for sites and TagListRow for tags, matching homepage patterns
  profile/page.tsx            # User profile (edit initials, About Me)
  about/page.tsx              # About page
  admin/                      # Admin pages
    page.tsx                  # Admin dashboard
    AdminClient.tsx           # Orchestrator; defines AdminSite, TagWithCount; contains ApprovalsPanel + UsersPanel
    SitesPanel.tsx            # Sites management table + SiteAccordionEditor
    TagsPanel.tsx             # Tags management table + TagExpandedRow
    shared.tsx                # Reusable table primitives (InlineEditCell, FeaturedCell, SortableHeader)
  contribute/new-site/        # Add new site form (server/client split)
    page.tsx                  # Server component (auth guard, role check, fetch tags)
    ContributeClient.tsx      # Client component — tab 1: single-site form; tabs 2–6: AI import (admin only, includes Parallel web search)
  tag/[slug]/                 # Tag pages (location + topic)
    page.tsx                  # Server component (hero image, description, auth)
    TagPageClient.tsx         # Client component (map, site list, child tags)
    edit/                     # Tag edit page
      page.tsx                # Server component (auth guard, role check)
      EditTagClient.tsx       # Edit form (name, desc, image, dedication)
  lists/page.tsx              # My Lists page (authenticated)
  list/[id]/                  # List detail page (public or authenticated)
    page.tsx                  # Server component (OG metadata, auth)
    ListDetailClient.tsx      # Client component (map, drag reorder, inline edit)
  user/[initials]/            # Public user profile
    page.tsx                  # Server component
    UserProfileClient.tsx     # Client component (profile info, public lists)
  api/
    upload-image/route.ts     # Image upload to Cloudflare R2
    import-sites/route.ts     # AI bulk import API (Gemini + Parallel.ai web search)
    parallel-status/route.ts  # Parallel.ai task status polling (GET, returns running/completed/error)
    publish-site-edit/route.ts # Admin publish edits
    update-tag/route.ts       # Direct tag update (admin) or pending submission (contributor)
    upload-tag-image/route.ts # Tag hero image upload to Cloudflare R2
    delete-tag/route.ts       # Delete topic tag (admin-only)
    generate-site-description/route.ts  # AI site description generation (Gemini)
    generate-tag-description/route.ts   # AI tag description generation (Gemini)
    send-photo-digest/route.ts          # Daily cron: email digest of sites without photos (Resend)
    mark-no-image/route.ts              # One-click: set has_no_image=true on a site (cron secret auth)
    email-image-import/route.ts         # External webhook — Cloudflare Email Workers forwards inbound photo emails here to auto-upload site images. No in-app callers; do NOT delete without coordinating with the Cloudflare email route.
components/
  Header.tsx                  # Nav bar — hamburger left, logo centered, avatar right
  Sidebar.tsx                 # Desktop homepage sidebar (search, topics, featured sites)

  # Map
  MapView.tsx                 # Leaflet map with clustering (client-only). Default fallback popup (HTML string) still exists for the admin coord-comparison mini-map; every user-facing map wires the `useLeafletPopupCard` hook instead.
  MapViewDynamic.tsx          # Dynamic import wrapper (no SSR). The single entry point for Leaflet.
  MapListSplitLayout.tsx      # "Left scrollable column + right sticky map" desktop wrapper (tag page, list detail).
  FullscreenMapOverlay.tsx    # Fixed-inset map overlay with close + optional search / below-search slots. Used on homepage, tag page, site detail, list detail mobile views.

  # Shared site card (mobile list rows, map popups, floating pin preview)
  SiteCard.tsx                # Single source of truth for the site-preview layout: thumbnail + SiteThumbnailActions / SiteTextBlock / clickable tag Links. Accepts `size: 'sm' | 'md'` (md = map popups, sm = lists) and optional `onClose` to render a close X overlay.
  SiteListRow.tsx             # Thin wrapper: SiteCard with bottom border (used in mobile map+list views, search results).
  SiteFloatingCard.tsx        # Thin wrapper: SiteCard inside a shadowed rounded panel + close button (mobile split-view floating pin preview).
  SiteTextBlock.tsx           # Name / location / description stack used by SiteCard. Changing spacing here propagates everywhere.
  SiteDescription.tsx         # `<p>` that runs `formatRichText` over a short_description string. Use everywhere descriptions are displayed.
  SiteThumbnailActions.tsx    # 3-button icon strip (visited / bookmark / directions) rendered beneath a thumbnail to form a composite block.
  SiteListItem.tsx            # Numbered site row (row number + thumbnail + text) for tag pages + list detail. Supports draggable/onRemove/rightActions.
  SiteGridCard.tsx            # 2-up grid discovery card (mobile homepage map view). Image-forward, no action overlays by design.
  SiteRowActions.tsx          # Desktop site-row action column (e.g. tag page desktop). Passed as `rightActions` to SiteListItem.
  SiteActionBar.tsx           # Site-detail header action bar (visited/bookmark/directions/edit).

  # User action circles
  VisitedCircle.tsx           # Green check circle when visited.
  BookmarkCircle.tsx          # Navy bookmark circle when on any list; opens SaveToListPanel.
  SaveToListPanel.tsx         # Popover for adding/removing a site across the user's lists.

  # Homepage / search / filter UI
  InterestFilter.tsx          # Segmented interest-level filter (global/regional/local/personal). Used on homepage, search, tag pages.
  SearchInput.tsx             # Search input with `variant: 'bordered' | 'shadow' | 'hero'` and optional `clearable`. Covers all 4 search call sites.
  FeaturedTopicPills.tsx      # Horizontal scrollable (or wrap) pill list of featured topic tags.
  MobileMapListToggle.tsx     # Floating map/list toggle pill (homepage mobile).
  EmptyState.tsx              # Icon + title + description + action slots.

  # Tag UI
  TagPill.tsx                 # Tag chip `<Link>` with `variant: 'location' | 'topic'` and `size: 'sm' | 'md'`.
  TagListRow.tsx              # Tag row with image, type badge, featured badge — used on search page.
  ChildTagPills.tsx           # Collapsible "Regions" / "Cities" lists shown on location tag pages (owns local show-all state).

  # Navigation + attribution
  BackLink.tsx                # `<Link>` (href) OR `<button>` (onClick) with ArrowLeft; `variant: 'dark' | 'light'`, `size: 'sm' | 'md'`.
  EditLink.tsx                # `<Link>` with Pencil icon for "Edit X" navy links.
  PendingEditBadge.tsx        # Small inline amber "Pending edit" label (replaces full-width beige banners).
  UserAvatar.tsx              # Avatar image OR initials-circle fallback on navy; size-driven.

  # List UI
  ListCard.tsx                # My Lists grid card (thumbnail strip, count, public badge).

  # Contributor notes (site detail)
  ContributorNotesSection.tsx # Self-contained: owns notes state, submit (admin direct / contributor via pending_submissions), delete, confirm. Size sm/md, className for layout.

  admin/
    SiteForm.tsx              # Shared form: Contribute, Edit, and Admin Import (inline in AdminClient). Never duplicate.
    ImageUploader.tsx         # Drag-reorder photo grid. Used inside SiteForm and in admin TagExpandedRow. `isAdmin` + `mode==='site'` unlocks the "has_no_image" checkbox.
    LinkListEditor.tsx        # Add/remove/reorder external links (with comment field).
    TagMultiSelect.tsx        # Multi-tag picker popover (admin sites table + SiteForm).
lib/
  types.ts                    # TypeScript interfaces (Site, Tag, UserListDetail, LinkEntry, SiteFormValues, etc.)
  data.ts                     # ALL Supabase queries go here — single data access layer
  storage.ts                  # ALL image uploads go here — uses Cloudflare R2 via S3-compatible API
  r2.ts                       # Cloudflare R2 S3 client initialization
  countries.ts                # ISO 3166-1 alpha-2 → country name lookup (getCountryName)
  interestFilter.ts           # Interest-level filtering utilities (types, filter helpers, smart defaults)
  richText.ts                 # formatRichText: newlines → <br>, [label](url) links, **bold**, *italic*
  hooks/
    useLeafletPopupCard.tsx   # Portals SiteCard (size='md') into Leaflet popup DOM. Used by every user-facing map.
utils/supabase/
  client.ts                   # Browser Supabase client (for client components)
  server.ts                   # Server Supabase client (for server components, uses cookies)
  static.ts                   # Static Supabase client (for generateStaticParams, no cookies)
```

## Database Schema (Supabase)

### Supabase MCP
A Supabase MCP server is connected and scoped to this project. Use it for schema queries, SQL execution, migrations, and TypeScript type generation instead of asking the user to run SQL in the dashboard. Always review destructive operations before executing.

### Core Tables
- **sites** — id (text slug), name, native_name, short_description, country (2-char code), region, municipality, latitude, longitude, google_maps_url, interest (global/regional/local/personal), featured (bool), has_no_image (bool, default false — admin-only flag meaning the site is confirmed to have no image, distinct from simply having no image yet), created_by (uuid → auth.users), created_at, updated_at
- **site_images** — id, site_id → sites, url, caption, storage_type (local/external), display_order
- **site_links** — id, site_id → sites, url, link_type (e.g. "Official Website"), comment
- **site_tags** — site_id → sites, tag_id → tags (many-to-many join)
- **site_config** — key (text PK), value (jsonb), updated_at, updated_by (uuid → auth.users). Admin-configurable app settings. RLS: public SELECT, admin-only INSERT/UPDATE. Current keys: `homepage_default_levels` (json array of interest levels), `location_tag_high_threshold` (number), `location_tag_low_threshold` (number).
- **tags** — id (text slug), name, description, image_url, featured (bool), type (country/region/municipality/topic), parent_tag_id, country_code, dedication (text, optional — shown on topic tag pages), created_by (uuid → auth.users)

### User Tables
- **profiles** — id (uuid → auth.users), display_name, email, avatar_url, initials (3 chars, immutable), initials_display (unique, may have number suffix e.g. JMM1), about_me, role ('general'/'contributor'/'administrator'), created_at, updated_at
- **visited_sites** — id, user_id → auth.users, site_id, created_at. Unique(user_id, site_id)
- **user_lists** — id, user_id → auth.users, name, description, is_public (bool, default false), created_at, updated_at
- **user_list_items** — id, list_id → user_lists, site_id, display_order, added_at. Unique(list_id, site_id)

### Public Profiles
- `/user/[initials_display]` — read-only public profile showing display name, avatar, about me, role, member-since date, visited count, and public lists
- Only shows information the user has explicitly made public (public lists, profile fields)
- Visited sites shown as count only, not as a list

### Contributor Tables
- **site_contributor_notes** — id, site_id, note, created_by (uuid → auth.users), created_at. **Publicly readable** (RLS allows anonymous SELECT). Contributors/admins can INSERT their own. Admins can DELETE any; note creators can DELETE their own.
- **site_edits** — id, site_id → sites, submitted_by (uuid), status ('pending'/'approved'/'rejected'), name, short_description, latitude, longitude, google_maps_url, images (jsonb), links (jsonb), reviewed_by (uuid), reviewed_at, review_note, created_at
- **pending_submissions** — id, type ('site'|'tag'|'note'), action ('create'|'edit'), payload (jsonb), submitted_by (uuid → auth.users), status ('pending'|'approved'|'rejected'), review_notes, created_at. Used for contributor tag edits and contributor note submissions awaiting admin review.

### Key RLS Policies
- Profiles: anyone can SELECT, users can UPDATE their own (but cannot change initials/initials_display)
- Visited/lists: users can only CRUD their own rows
- User lists: users see own + public lists
- Site edits: contributors see own, admins see all, only admins can UPDATE (approve/reject)
- site_contributor_notes: anyone can SELECT; contributors/admins can INSERT; admins can DELETE any, creators can DELETE own

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
- **`SiteCard`** — the single site-preview card used on map Leaflet popups (desktop, mobile fullscreen, list detail, tag pages), the mobile split-view `SiteFloatingCard`, and `SiteListRow`. Accepts `size: 'sm' | 'md'` and optional `onClose`. Any visual tweak to a site preview should happen here, not in a consumer. Do NOT re-introduce a `SitePreviewCard`/`SitePinCard` variant.
- **`SiteTextBlock`** — name / location / description stack. Used inside `SiteCard` but exported for any other place that needs the same typography. Spacing changes here propagate to every preview.
- **`SiteDescription`** — the ONLY correct way to render `short_description`; runs `formatRichText`. Never do `<p>{site.short_description}</p>` inline.
- **`SiteForm.tsx`** (in components/admin/) — shared form for Contribute page, Edit page, and Admin Import page. All three entry points use this one form. Never create a separate form.
- **`ImageUploader.tsx`** (in components/admin/) — used inside `SiteForm` for site photo management. Accepts `isAdmin`, `hasNoImage`, and `onHasNoImageChange` props. When `isAdmin` is true and `mode === 'site'`, renders a "Site does not have an image" checkbox (admin-only). Setting this flag clears all images after confirmation. `has_no_image` is only writable by admins; never include it in contributor submission payloads.
- **`MapViewDynamic.tsx`** — the single dynamic import wrapper for the Leaflet map.
- **`useLeafletPopupCard`** (`lib/hooks/useLeafletPopupCard.tsx`) — wire this into any map that shows site previews. It portals `SiteCard` (size="md") into the Leaflet popup DOM. Do NOT hand-roll an HTML-string popup body.
- **`InterestFilter.tsx`** — segmented button group for interest-level filtering. Used on homepage, search, and tag pages.
- **`SearchInput.tsx`** — every search input (homepage map + list view, fullscreen map overlay, search page mobile + desktop) goes through this component. Pick `variant: 'bordered' | 'shadow' | 'hero'` + optional `clearable`.
- **`FullscreenMapOverlay.tsx`** — every fullscreen map (homepage, tag page, site detail, list detail mobile) wraps the map in this overlay; it owns the fixed-inset + close X + optional search/belowSearch slots.
- **`SiteThumbnailActions.tsx`** — 3-button icon strip (visited/bookmark/directions) rendered beneath thumbnails; flush with `rounded-b-lg`. Already embedded inside `SiteCard` — don't render it again alongside a `SiteCard`.
- **`MapListSplitLayout.tsx`** — wrapper for the desktop "left scrollable column + right sticky map" pattern used by Tag pages and List detail pages.
- **`SiteListItem.tsx`** — numbered site row (row number, thumbnail, name, location subtitle, description) used on Tag pages and List detail pages. Accepts `draggable`/`onRemove`/`rightActions`.
- **`SiteGridCard.tsx`** — 2-up grid card (homepage mobile map view). Pure discovery — no action overlays by design.
- **`BackLink.tsx`** / **`EditLink.tsx`** — every back arrow and "Edit X" link. BackLink accepts href XOR onClick; EditLink renders Pencil + navy text.
- **`PendingEditBadge.tsx`** — small inline amber "Pending edit" label. Do NOT reintroduce full-width beige banners.
- **`TagPill.tsx`** — tag chip `<Link>` with `variant: 'location' | 'topic'` + `size: 'sm' | 'md'`.
- **`UserAvatar.tsx`** — avatar image or initials fallback; size-driven. Use this anywhere a profile circle appears.
- **`ChildTagPills.tsx`** — regions/cities lists on location tag pages. Owns its own show-all state.
- **`ContributorNotesSection.tsx`** — self-contained notes section for site detail (both mobile + desktop).
- **`MobileMapListToggle.tsx`** / **`FeaturedTopicPills.tsx`** / **`EmptyState.tsx`** — reusable homepage / list UI primitives.

If you think you need a new component, first scan `components/` for an existing one that does the same thing.

### Data access
- **All database reads/writes go through `lib/data.ts`** — never call Supabase directly from page or component files
- **All image operations go through `lib/storage.ts`** — centralized function for Cloudflare R2 uploads
- Use the correct Supabase client: `client.ts` for browser/client components, `server.ts` for server components (uses cookies), `static.ts` for `generateStaticParams` (no cookies)

### New page pattern
Admin and content pages follow this structure:
1. **Server component** (`page.tsx`) — auth check, metadata, fetch initial data via `lib/data.ts`
2. **Client component** (`*Client.tsx`) — state, UI, user interactions
3. Data fetching in server component, passed as props to client component

### API route pattern
API routes live in `app/api/`. They use the server Supabase client or service role client as needed. Return `NextResponse.json()`.

### Image storage
- Images are stored in Cloudflare R2 bucket `orbis-dei-images`, served via `images.orbisdei.org` (Cloudflare CDN)
- `lib/r2.ts` initializes the S3 client; `lib/storage.ts` has `uploadSiteImage` and `uploadTagImage`
- Upload functions do not require a Supabase client — they use the R2 S3 client directly
- API routes (`upload-image`, `upload-tag-image`) still use Supabase for auth/role checks, then call storage functions for the actual upload
- Env vars: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`
- Some older images may still reference Supabase Storage URLs (`*.supabase.co/storage/...`) until the migration script is run

### Image naming convention
- Site images: `sites/{site-id}/{NNN}.jpg` where NNN = zero-padded display_order + 1 (001, 002, 003...)
- Tag images: `tags/{tag-id}/hero.jpg`
- New uploads use a temporary timestamp key (`sites/{site-id}/{timestamp}.jpg`) which gets renamed to the canonical format when the site is saved via publish-site-edit
- `renameSiteImage()` in lib/storage.ts handles the R2 copy + delete + URL update
- `isR2Url()` checks whether a URL points to R2 (vs external/legacy Supabase)
- `deleteSiteImage()` removes an image from R2 by URL

### Mobile layout
- Homepage: Map/List toggle (default: Map) via `MobileMapListToggle`
  - **Map view**: `h-[38dvh]` map + scrollable content panel below (`SearchInput` + `FeaturedTopicPills` + 2-up grid of `SiteGridCard`). Toggle pill floats bottom-center over the map and hides while a floating pin card is open.
  - **List view**: "Discover" header with `MobileMapListToggle` top-right, `SearchInput` + `SlidersHorizontal` filter icon (navy dot when active differs from defaults), `FeaturedTopicPills`, all `visibleSites` as `SiteListRow` (featured first).
- Tag pages mobile: natural full-page scroll — no fixed-viewport split. Hero → back/edit row → (topic image) → title/description → child tags → site list.
- All other pages: single scrollable column, no side-by-side map.
- Header: hamburger left, logo centered, avatar right.
- Fullscreen map: `FullscreenMapOverlay` with X close (plus search slot on homepage), preserves scroll position behind.

### Map behavior
- **Every user-facing map** (homepage desktop, homepage mobile fullscreen, tag pages, site detail, list detail, visited list) wires `useLeafletPopupCard`. Pin tap portals a `SiteCard` (size="md") into the Leaflet popup DOM — same layout on desktop and fullscreen mobile.
- **Mobile split view (homepage)**: Pin tap shows a floating `SiteFloatingCard` overlaid on the map area (bottom-2 left-2.5 right-2.5, z-[40]) — this is the ONE place a popup is rendered outside the Leaflet popup hook because the card needs to persist below the map without closing when the user scrolls the list.
- Admin coord-comparison mini-map (`SitesPanel`) is the only remaining user of `MapView.tsx`'s built-in HTML-string popup fallback.

### List detail page
- Desktop: `MapListSplitLayout` — left scrollable panel, right sticky map (popups via `useLeafletPopupCard`).
- Mobile: single column with floating "Show map" button → `FullscreenMapOverlay`-style overlay with its own popup hook instance.
- Owner can: inline-edit name/description (Pencil toggles), toggle public/private, drag-reorder sites (HTML5 drag with `GripVertical` handles on `SiteListItem`), remove sites.
- Non-owner sees read-only view with owner attribution via `UserAvatar` + `<Link>` to `/user/[initials_display]`.
- Map pins derived from current `sites` state (updates live as sites are reordered/removed). Server fetches `allTags` and passes to the client so popup cards can show tag chips.

### Admin Dashboard (`/admin`)

The admin dashboard is orchestrated by `AdminClient.tsx` which renders a sidebar with five sections: Pending Approvals, Users, Sites, Tags, and Site Settings. Each section is a separate component.

**Key admin files:**
- `app/admin/AdminClient.tsx` — orchestrator; defines types `AdminSite`, `TagWithCount`; contains `ApprovalsPanel` and `UsersPanel` inline; imports `SitesPanel` and `TagsPanel`
- `app/admin/SitesPanel.tsx` — full sites management table + `SiteAccordionEditor`
- `app/admin/TagsPanel.tsx` — full tags management table + `TagExpandedRow`
- `app/admin/shared.tsx` — reusable table primitives: `InlineEditCell`, `FeaturedCell`, `SortableHeader`

**SitesPanel architecture:**
- Spreadsheet-style table with inline-editable cells for: name, native_name, country, region, municipality, tags (via `TagMultiSelect` popover), description, interest, featured
- Inline edits save immediately to Supabase (no form submit needed)
- Filter pills: All, Unverified coords, Missing photos, Coords >500m off
- Expanding a row opens `SiteAccordionEditor` — a **custom form** (does NOT use `SiteForm`) with:
  - 50/50 split layout: form fields left, Leaflet mini-map right
  - Manages: coordinates, Google Maps URL, links, coordinate verification, photos
  - Coordinate candidates loaded from `coordinate_candidates` table
  - Saves via `/api/publish-site-edit`
  - AI description generation button (calls `/api/generate-site-description`)
  - Region auto-fill button (Nominatim reverse geocoding, saves directly)
- `SiteAccordionEditor` does NOT use `SiteForm` because it only manages a subset of fields; the rest are handled by inline cells in the table row

**TagsPanel architecture:**
- Spreadsheet-style table with inline-editable cells for: name, type (select), country_code, description, dedication, featured
- Filter pills: All, Topic, Location, Featured, No description, No image
- Bulk action: "Delete all orphaned location tags" (safe reverse-hierarchy order)
- Expanding a row opens `TagExpandedRow` with: image uploader, AI description generation button, delete button
- Tag field saves go directly to Supabase via `createClient()`

**ApprovalsPanel** (inline in AdminClient.tsx):
- Accordion list of pending submissions from `pending_submissions` table
- Site create submissions render a full `SiteForm` (shared component, `isEditMode` NOT passed — defaults to false, so auto-geocoding runs)
- Approve calls `/api/publish-site-edit`; reject updates submission status

**Shared table primitives (`shared.tsx`):**
- `InlineEditCell` — click-to-edit cell; supports text, textarea, select; auto-saves on blur/Enter; shows spinner during save
- `FeaturedCell` — star toggle with immediate save
- `SortableHeader` — column header with sort arrows

### Image display
- Wide photos (ratio > 4:3): adaptive aspect ratio container, object-fit cover
- Narrow/square photos (ratio ≤ 4:3): fixed container with blurred background fill
- Carousel uses crossfade transitions (300ms)

### Tag Pages
- **Location tags** (country/region/municipality): auto-generated description based on site count; hero image from a random site photo with deterministic daily rotation (hash of tagId + day index); no creator attribution; child tags shown as collapsible region/city lists
- **Topic tags**: curated `image_url` floated left on desktop (fixed 280px height, auto width capped at 280px square, object-cover) / centered on mobile; manual `description`; creator attribution shown; optional `dedication` shown if present; no hero banner
- **Site rows on tag pages (mobile)**: simplified rows with no inline `SiteRowActions` buttons — visited state shown on thumbnail only; location subtitle shown for topic tags
- **Tag editing**: `/tag/[slug]/edit` page — admins publish directly via `/api/update-tag`; contributors submit via `pending_submissions` (type='tag', action='edit') for admin review; location tags are admin-only to edit; topic tag deletion (admin-only) via `/api/delete-tag`
- **Contributor notes on site detail**: publicly visible to all users (anonymous included); contributors/admins can add notes — contributors go through `pending_submissions` (type='note', action='create'); admins insert directly; creator and admin can delete

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

- `createServiceClient` uses cookie-based SSR client — for `auth.admin` operations (like deleting users), use `createAdminClient()` which is a true service-role client without cookies
- `.env.local` values may contain surrounding quotes — always `.Trim().Trim('"').Trim("'")` when parsing in PowerShell scripts
- PowerShell's `Invoke-RestMethod` can mangle auth headers — use `Invoke-WebRequest` with inline headers instead
- Leaflet requires `dynamic()` import with `ssr: false` — never import MapView directly in a server component
- The `comment` field on `site_links` / `LinkEntry` type must be preserved through the full edit flow (it was previously silently stripped)
- Nominatim reverse geocoding requires a 1.1-second delay between calls to respect rate limits
- `SiteAccordionEditor` in `SitesPanel.tsx` does NOT use the shared `SiteForm` component — it's a custom editor for a subset of fields. If you need to add a feature to site editing in the admin panel, check whether it belongs in `SiteForm` (which affects contribute/edit pages too) or `SiteAccordionEditor` (admin-only accordion)
- Parallel.ai Task API uses a two-phase flow on Vercel Hobby: `/api/import-sites` kicks off the task (~2s), then the browser polls `/api/parallel-status` every 5s until completion. This avoids the 10-second Hobby function timeout. Each poll is a fast GET (~1s).

## Tech Debt

- **Server-side interest filtering** — Currently, interest-level filtering is done client-side via `useMemo` in each page's client component. When the site count reaches thousands, move filtering into `lib/data.ts` query functions (add `interestLevels?: InterestLevel[]` param to `getAllSites()`, `getMapPins()`, `getSitesByTag()`, etc.) so that only matching rows are fetched from Supabase. The `lib/interestFilter.ts` utility and `InterestFilter` component are designed to support this migration with no UI changes needed.
- **`createServiceClient` doesn't actually bypass RLS.** It uses `createServerClient` from `@supabase/ssr` which reads auth cookies, so the user's JWT overrides the service role key. Fix: switch to `createClient` from `@supabase/supabase-js` (no cookies) for the service client. Current workaround: RLS DELETE policies added where needed (e.g. `tags` table).

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=
GOOGLE_PLACES_API_KEY=
OPENCAGE_API_KEY=
UNSPLASH_ACCESS_KEY=
RESEND_API_KEY=
DIGEST_EMAIL_TO=
CRON_SECRET=
SUPABASE_SERVICE_ROLE_KEY=
PARALLEL_API_KEY=
```

## Deploy
```powershell
function deploy($msg) { git add .; git commit -m "$msg"; git push origin main }
deploy "your commit message"
```
Vercel auto-deploys on push to main.