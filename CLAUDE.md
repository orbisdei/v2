# Orbis Dei

Catholic and Christian holy sites explorer — interactive map with site detail pages, user accounts, and contributor tools.

**Live site:** https://orbisdei.org

## Tech Stack

- **Framework**: Next.js 16 (App Router), TypeScript 7, Tailwind CSS 4
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

**Running in the cloud environment (no browser, no local dev server):**

1. `npx tsc --noEmit` type-checks, but is NOT sufficient on its own — Tailwind/PostCSS
   breakage and Next's TypeScript integration are invisible to it and only surface in a
   real build.
2. `npm run build` catches those. Needs `.env.local` with at least
   `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` plus placeholder values
   for the other vars (their clients are constructed at module scope, so page-data
   collection fails without them). Check the **exit code** — the build prints
   "✓ Compiled successfully" and can still fail at a later step, so grepping the output
   for that string will report a false pass.
   If Supabase's host isn't in the sandbox's network egress allowlist the build fails at
   prerendering `/` with "Host not in allowlist". That is environmental, not a code
   failure — everything before it still validated.
3. For anything **visual**, a build proves nothing. Get a preview deployment (below).

## Project Structure

```
app/
  page.tsx                    # Homepage — map + sidebar (desktop) / split view (mobile)
  layout.tsx                  # Root layout, fonts (Leaflet CSS is bundled with the map chunk via MapView imports)
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
    send-daily-health/route.ts          # Daily cron: site health email (Resend) — GSC search summary (lib/gsc.ts), TTFB probes, CrUX Core Web Vitals (lib/crux.ts), latest Lighthouse snapshot (daily_health_snapshots, written by the psi-daily GitHub Action), sites without photos
    mark-no-image/route.ts              # One-click: set has_no_image=true on a site (cron secret auth)
    map-pins/route.ts                   # Full map pin set, CDN-cached. Lets site detail pages prerender with only nearby pins (getNearbyMapPins) instead of the whole catalog; fetched client-side by useFullMapPins when a pannable map goes live.
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
  SiteCard.tsx                # Single source of truth for the site-preview layout: thumbnail + SiteThumbnailActions / SiteTextBlock / clickable tag Links. Accepts `size: 'sm' | 'md'` (md = map popups, sm = lists) and optional `onClose` to render a close X overlay. The ENTIRE card is one hyperlink to /site/{id} via an absolute-positioned Link; interactive children (close X, SiteThumbnailActions, tag pills, "+N more" popover) sit above it with pointer-events-auto + z-index.
  TagOverflowPopover.tsx      # "+N more" tag overflow popover used by SiteCard size='md' (portaled; desktop dropdown / mobile bottom sheet; outside-click handled internally).
  SiteListRow.tsx             # Thin wrapper: SiteCard with bottom border (used in mobile map+list views, search results).
  SiteFloatingCard.tsx        # Thin wrapper: SiteCard inside a shadowed rounded panel + close button (mobile split-view floating pin preview).
  SiteTextBlock.tsx           # Name / location / description stack used by SiteCard. Changing spacing here propagates everywhere.
  SiteDescription.tsx         # `<p>` that runs `formatRichText` over a short_description string. Use everywhere descriptions are displayed.
  SiteThumbnailActions.tsx    # 3-button icon strip (visited / bookmark / directions) rendered beneath a thumbnail to form a composite block.
  SiteListItem.tsx            # Numbered site row (row number + thumbnail + text) for tag pages + list detail. Supports draggable/onRemove/rightActions.
  SiteGridCard.tsx            # 2-up grid discovery card (mobile homepage map view). Image-forward, no action overlays by design.
  SiteRowActions.tsx          # Desktop site-row action column (e.g. tag page desktop). Passed as `rightActions` to SiteListItem.
  SiteActionBar.tsx           # Site-detail header action bar (visited/bookmark/directions/edit).

  SiteTypeLabel.tsx           # Inline icon + label for sites.type (Church/House/Landmark/Castle), shown next to the interest level on site detail. Exports SITE_TYPE_ICONS; MapView.tsx mirrors the same glyphs as raw SVG inside map pins — keep the two mappings in sync.

  # User action circles
  VisitedCircle.tsx           # Green check circle when visited.
  BookmarkCircle.tsx          # Navy bookmark circle when on any list; opens SaveToListPanel.
  SaveToListPanel.tsx         # Popover for adding/removing a site across the user's lists.

  # Homepage / search / filter UI
  InterestFilter.tsx          # Segmented interest-level filter (global/regional/local/topical). Used on homepage, search, tag pages. 'personal' is never offered — personal sites only surface inside a user's own lists.
  SearchInput.tsx             # Search input with `variant: 'bordered' | 'shadow' | 'hero'` and optional `clearable`. Covers all 4 search call sites.
  FeaturedTopicPills.tsx      # Horizontal scrollable (or wrap) pill list of featured topic tags.
  MobileMapListToggle.tsx     # Floating map/list toggle pill (homepage mobile).
  EmptyState.tsx              # Icon + title + description + action slots.

  # Tag UI
  TagPill.tsx                 # Tag chip `<Link>` with `variant: 'location' | 'topic'` and `size: 'sm' | 'md'`.
  SiteTagPills.tsx            # A site's full tag row: location tags sorted country → region → municipality, divider, then topic tags. Used by site detail (mobile + desktop). The mobile app mirrors this ordering inline in mobile/src/app/site/[id].tsx.
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
    LinkListEditor.tsx        # Add/remove/reorder external links (with comment field)
    CelebrationListEditor.tsx # Add/remove/reorder Notable Celebrations (date_label + description). Used in SiteForm (edit/contribute/import/approvals) and SiteAccordionEditor..
    TagMultiSelect.tsx        # Multi-tag picker popover (admin sites table + SiteForm).
packages/
  shared/                     # @orbisdei/shared npm workspace — pure TypeScript shared by web + mobile. src/{types,imageUrl,interestFilter,countries,siteRow}.ts (siteRow = rowToSite + SITE_SELECT/SITE_SUMMARY_SELECT). NO React/Next/RN imports allowed — both bundlers compile the raw .ts source (web via next.config.js transpilePackages, mobile via Metro).
lib/
  types.ts                    # Re-export shim → @orbisdei/shared/src/types (keeps @/lib/types imports working)
  imageUrl.ts                 # Re-export shim → @orbisdei/shared/src/imageUrl
  interestFilter.ts           # Re-export shim → @orbisdei/shared/src/interestFilter
  countries.ts                # Re-export shim → @orbisdei/shared/src/countries
  data.ts                     # ALL Supabase queries go here — single data access layer (rowToSite + select strings come from @orbisdei/shared/src/siteRow)
  storage.ts                  # ALL image uploads go here — uses Cloudflare R2 via S3-compatible API
  r2.ts                       # Cloudflare R2 S3 client initialization
  createSite.ts               # createSiteWithRelations: single client-side "create site + tags/links/celebrations/images + syncLocationTags" write path, shared by bulk-import publish (ContributeClient) and approvals publish (AdminClient). Also the editor-state converters used by ALL edit/create flows: linksToPayload/celebrationsToPayload (editor rows → insert/API rows), toLinkEntries/toCelebrationEntries (stored rows → editor rows), toSiteFormValues (any site-shaped record/payload → SiteFormValues).
  geocode.ts                  # reverseGeocode/forwardGeocode: the ONLY Nominatim call path (client + API routes). The 1.1s Nominatim pacing is enforced INSIDE these helpers — callers just call them.
  places.ts                   # googlePlacesLookup (free "Essentials ID Only" SKU, regionCode-biased) + buildMapsSearchUrl. The ONLY Google Places call path — used by migrateResearchFindings, import-sites, parallel-status.
  siteMatch.ts                # Duplicate-site detection shared by ALL import paths: namesMatch + findNearbySites/findDuplicate (a dup must be BOTH within ~1.1km AND similarly named). Never hand-roll proximity-only dedup.
  indexnow.ts                 # pingIndexNow: notifies Bing-family engines of changed URLs (server-only; key file lives in public/{key}.txt). Wired into publish-site-edit/update-tag/delete-tag routes; client create flows go through the notifyIndexNow server action in app/actions.ts.
  crux.ts                     # Server-only Chrome UX Report client — getCruxSummary(): real-user p75 Core Web Vitals for the origin (daily health email). Needs CRUX_API_KEY; degrades to 'no-key'/'no-data' statuses.
  gsc.ts                      # Server-only Google Search Console client (service-account JWT, zero deps) — getSearchHealthSummary() for the daily health email. Creds: GSC_CREDENTIALS env (JSON string) or the same gsc-credentials.json file scripts/gsc-report.mjs uses.
  richText.ts                 # formatRichText: newlines → <br>, [label](url) links, **bold**, *italic*
  cloudflareImageLoader.ts    # Custom next/image loader — routes next/image through cfImage
  mapPins.ts                  # siteToMapPin: derive MapPin from a summary Site (avoids double-serializing the catalog)
  hooks/
    useLeafletPopupCard.tsx   # Portals SiteCard (size='md') into Leaflet popup DOM. Used by every user-facing map. Opts {lazy} fetches card data from /api/site-card/[id] for pins not in the local site list.
    useMapFloatingCard.tsx    # Pin tap → SiteFloatingCard state (mobile split view + fullscreen overlays). Same {lazy} option.
    useSiteCard.ts            # Resolves {site, tags} for a site id from local props or lazily via /api/site-card/[id] (module-level cache)
    useFullMapPins.ts         # Site detail pages ship only nearby pins (getNearbyMapPins); this swaps in the full set from /api/map-pins once a pannable map is live (fullscreen open, or lg+ where the sticky map renders). Also exports useIsDesktopMap.
    useAuthUser.ts            # Module-singleton auth state — ONE getUser() + ONE onAuthStateChange shared by useProfile/useVisited/useLists
utils/supabase/
  client.ts                   # Browser Supabase client (for client components)
  server.ts                   # Server Supabase client (for server components, uses cookies)
  static.ts                   # Static Supabase client (for generateStaticParams, no cookies)
mobile/                       # Android-first Expo (React Native) app — an npm workspace sharing the same Supabase backend and the @orbisdei/shared package. See mobile/README.md. Still excluded from the web TS build via tsconfig "exclude" (removing that breaks the Vercel build). mobile/src/lib/{types,imageUrl,interestFilter,countries}.ts are one-line re-export shims of @orbisdei/shared (no more copies to keep in sync); mobile/src/lib/data.ts imports rowToSite + select strings from the same package.
```

## Database Schema (Supabase)

### Supabase MCP
A Supabase MCP server is connected and scoped to this project. Use it for schema queries, SQL execution, migrations, and TypeScript type generation instead of asking the user to run SQL in the dashboard. Always review destructive operations before executing.

### Core Tables
- **sites** — id (text slug), name, native_name, short_description, country (2-char code), region, municipality, latitude, longitude, google_maps_url, interest (browsable hierarchy global > regional > local > topical, plus 'personal' — a separate lists-only value stripped from all browse/search/map surfaces for everyone), type (site classification, nullable, CHECK-constrained: active-church | active-community | other-religious | heritage; replaces the old "Active Churches" tag — decision order is community > church > other-religious > heritage, activity before denomination; icons: Church/House/Landmark/Castle via SiteTypeLabel.tsx + matching map-pin glyphs in MapView.tsx — change both together), featured (bool), has_no_image (bool, default false — admin-only flag meaning the site is confirmed to have no image, distinct from simply having no image yet), created_by (uuid → auth.users), created_at, updated_at
- **site_images** — id, site_id → sites, url, caption, storage_type (local/external), display_order
- **site_links** — id, site_id → sites, url, link_type (e.g. "Official Website"), comment
- **site_celebrations** — id, site_id → sites, date_label (free text, e.g. "July 25-26"), description (e.g. "Grand Pardon"), display_order. "Notable Celebrations" shown on site detail pages above Links (web + mobile), hidden when empty; never shown in cards/previews. RLS mirrors site_links (public SELECT, admin ALL). Contributor edits (create or edit-existing-site) both flow through pending_submissions payload.celebrations.
- **site_tag_assignments** — site_id → sites, tag_id → tags (many-to-many join)
- **site_config** — key (text PK), value (jsonb), updated_at, updated_by (uuid → auth.users). Admin-configurable app settings. RLS: public SELECT, admin-only INSERT/UPDATE. Current keys: `homepage_default_levels` (json array of interest levels), `location_tag_high_threshold` (number), `location_tag_low_threshold` (number), `catalog_last_revalidated_at` (ISO timestamp — read/written by `lib/revalidate.ts`'s `maybeRevalidateCatalog` via the service-role client, since RLS restricts writes to admins; self-throttles the homepage/search `CATALOG_TAG` bust to at most once/hour instead of a Vercel cron, since Hobby only allows daily crons).
- **tags** — id (text slug), name, description, image_url, featured (bool), type (country/region/municipality/topic), parent_tag_id, country_code, dedication (text, optional — shown on topic tag pages), created_by (uuid → auth.users)
- **daily_health_snapshots** — id, day (date), kind (text, e.g. 'psi'), data (jsonb), created_at. Unique(day, kind). Metric snapshots for the daily health email; written only via service role (no RLS write policies — e.g. the psi-daily GitHub Action running scripts/psi-snapshot.mjs), public SELECT. Read via `getLatestHealthSnapshot` in lib/data.ts.
- **slug_redirects** — kind ('site'|'tag'), old_id, new_id, created_at. PK (kind, old_id). Old→new slug mappings for SEO 308 redirects; maintained ENTIRELY by DB triggers on sites/tags (rename records + flattens chains; insert reusing a deprecated id deletes the redirect so the new row wins; delete cleans up). RLS: public SELECT only, no write policies (trigger functions are SECURITY DEFINER). Consumed by `getSlugRedirect` in lib/data.ts on the miss path of site/tag pages, which call `permanentRedirect` BEFORE their Suspense boundary (after streaming starts, redirects/notFound degrade to 200 + noindex meta).

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
- **pending_submissions** — id, type ('site'|'tag'|'note'), action ('create'|'edit'), payload (jsonb), site_id (text, nullable — set on type='site' action='edit' rows so the reviewer/target-site lookup doesn't need to reach into payload), submitted_by (uuid → auth.users), status ('pending'|'approved'|'rejected'), review_notes, created_at. Contributor site creates, site edits (edits to an *existing* site — the payload carries a full proposed SiteFormValues-shaped snapshot, not a sparse diff), tag creates/edits, and note creates all funnel through here now. Reviewed at `/admin/research` (full SiteForm, warnings surfaced for research-originated rows) or the desktop Admin → Pending Approvals tab — the desktop tab does NOT handle type='site' action='edit' rows (guarded in AdminClient's handleApprove to fail loudly rather than silently no-op; only `/admin/research` knows how to publish one, via `/api/publish-site-edit`). (There used to be a separate `site_edits` table for this — it's gone; it was always empty because the contributor insert path never set its NOT NULL submitted_by column, so every insert silently failed and nothing was ever reviewable there.)
- **submission_review_deltas** — id, submission_id → pending_submissions, field, proposed_value, submitted_value, created_at. One row per field an admin actually changed between what a submission originally proposed and what got approved — written at approval time (ResearchClient's handleApprove, best-effort). Aggregate by `field` to see which fields the Discovery research pipeline gets wrong most often; join back to pending_submissions.submitted_by to isolate research-originated rows specifically. Admin-only RLS (current_user_role() = 'administrator').

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
- **`TagOverflowPopover.tsx`** — "+N more" tag overflow popover (portaled; desktop: fixed-positioned dropdown anchored to trigger; mobile: bottom sheet). Outside-click handled internally (checks both `anchorRef` and popover `contentRef`). Used by `SiteCard` `size='md'`: topic tag chips render in a single non-wrapping row via `MdTagRow`, and overflow tags collapse into a "+N more" button that opens this popover.

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
- **Uploads are normalized with sharp** (`normalizeUploadedImage` in lib/storage.ts): EXIF rotation baked in, longest edge capped at 2560px, metadata (incl. GPS) stripped, re-encoded as progressive JPEG. The stored R2 master is always a `.jpg`. Both `upload-image` and `upload-tag-image` routes run this; `lib/imageImport.ts` has its own sharp pass.
- **Display sizing via Cloudflare Image Transformations** (enabled on the `images.orbisdei.org` zone): NEVER render a raw R2 URL in an `<img>`. Wrap it with `cfImage(url, width)` from `lib/imageUrl.ts` (builds a `/cdn-cgi/image/...` URL; passes non-R2 hosts through untouched). Widths in use: 160 (list thumbs), 320 (SiteCard), 640 (grid/topic images/map popups), 1200 (OG images), 1600 (gallery/hero). `next/image` call sites route through the same builder automatically via the custom loader (`lib/cloudflareImageLoader.ts`, wired in next.config.js — Vercel's image optimizer is bypassed entirely).

### Image naming convention
- Both site and tag images share one versioned-key scheme (`versionedImageKey`/`putVersionedImage` in lib/storage.ts): `{sites|tags}/{id}/{timestamp}[-suffix].jpg`, uploaded with `CacheControl: public, max-age=31536000, immutable`. The filename is permanent from the moment it's uploaded and is never reused for different bytes — reordering/replacing an image always produces a new url, a guaranteed CDN/browser cache miss, instead of overwriting a year-cached key with different content (this was a real bug: reordering site photos rewrote the old positional `{NNN}.jpg` keys in place, and Cloudflare/browsers kept serving the pre-reorder bytes at that url for up to a year).
  - Site images: `sites/{site-id}/{timestamp}-{sanitized-original-filename}.jpg`. Display order lives entirely in `site_images.display_order` — the filename never encodes position, so reordering only touches the DB, never R2. Existing images at the old positional key still exist for sites not touched since this changed — run `/api/backfill-site-image-keys?secret=CRON_SECRET` (supports `&dryRun=1`, batches 40/call via `&limit=`, safe to re-run — already-migrated rows are auto-skipped) to re-key them.
  - Tag images: `tags/{tag-id}/{timestamp}-{w}x{h}.jpg` — the `-{w}x{h}` suffix lets the tag page reserve the hero image's box up front (no CLS) with no DB column; `parseTagImageDims()` (lib/lcpImages.ts) reads it back, `uploadTagImage(tagId, buf, w, h)` writes it (dims from `getImageDimensions()`). Legacy `hero.jpg` images fall back to natural height until re-keyed — run `/api/backfill-tag-image-dims?secret=CRON_SECRET` (supports `&dryRun=1`) once to migrate them.
- `renameSiteImage(oldUrl, newSiteId)` / `renameTagImage(oldUrl, newTagId)` in lib/storage.ts (thin wrappers over the shared `renameVersionedImage`) move an R2 object to a new id prefix on a site/tag slug rename — the versioned filename is preserved, only the prefix changes. Not used for normal edits/reorders (uploads already land at their final permanent key), only when the id itself changes.
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
- **Location tags** (country/region/municipality): auto-generated description based on site count; hero image from a random site photo with deterministic **weekly** rotation (hash of tagId + period index, `HERO_ROTATION_MS` in lib/data.ts); no creator attribution; child tags shown as collapsible region/city lists. The rotation period is an ISR cost lever, not a cosmetic choice — Vercel only skips billing a write when regenerated output is byte-identical, so a daily rotation forced a guaranteed daily rewrite of all ~370 location tag pages from crawler traffic alone. Don't shorten it back without knowing that.
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

- **`prompts/orbisdei-discovery-prompt.MD` has a second copy that must be updated by hand.**
  The nightly discovery skill actually runs from `~/.claude/skills/orbis-dei-discovery/`
  (`SKILL.md` + `references/output-schema.md` + `references/database-interaction.md`) —
  a separately-packaged, split-file copy, not a live import of the repo `.MD`. Editing
  the repo prompt alone does nothing to what the skill executes; editing the installed
  skill alone means the next person to read the repo (this is the source of truth for
  version history — see `prompts/discovery-prompt-CHANGELOG.md`) sees stale rules. Any
  change to Discovery's process, schema interactions, or output format needs both sides
  edited together — in the same sitting, not as a follow-up — and the repo `.MD`'s
  version number / changelog entry bumped either way. **A note like this one is not
  sufficient on its own to prevent drift** — see below. When editing either side, grep
  the other copy for the same term/column/query you just touched before calling the
  change done. (Found the hard way, twice: a `research_backlog.completed_at` migration
  updated the repo prompt to gate on the new column, but the installed skill silently
  kept using the old `status`-text pattern match through several nightly runs afterward
  — despite this exact gotcha already being written down — leaving `completed_at` NULL
  on every row those runs completed. Caught and fixed 2026-08-05: installed skill's
  Step 0 query and backlog-update SQL switched to `completed_at`, and the backlog rows
  this had already affected were backfilled by hand from their status-line timestamps.)
- **Tailwind is v4 — there is no `tailwind.config.js`.** The navy/gold palettes and font
  stacks are `@theme` custom properties at the top of `app/globals.css`; v4 ignores a JS
  config unless explicitly `@config`'d, so re-adding that file would silently do nothing.
  PostCSS uses `@tailwindcss/postcss` (not `tailwindcss` directly — that error message is
  the v3→v4 tell), and autoprefixer is gone because v4 prefixes itself. `globals.css`
  keeps a `border-color: var(--color-gray-200)` compatibility shim in `@layer base`: v4
  defaults borders to `currentcolor` and this codebase has ~199 bare `border` utilities,
  so removing the shim needs an explicit border color on every one of them.
- **TypeScript 7 requires `experimental.useTypeScriptCli: true` in next.config.js.** TS 7
  is the native/Go port and doesn't expose the programmatic compiler API Next.js drives
  by default; without the flag `next build` fails with "does not provide the compiler API
  required by Next.js". The flag is load-bearing, not cosmetic. Dependabot is configured
  to hold TypeScript majors back for this reason — every one so far has needed a config
  change to land.
- **`tsc --noEmit` passing does not mean the build passes.** Tailwind/PostCSS breakage and
  Next's TypeScript integration are both invisible to it. Only `npm run build` catches
  them, and both have reached main this way.
- **npm workspaces monorepo.** The repo root is both the web app AND the workspace root (`workspaces: ["mobile", "packages/*"]`) — deliberately, so the Vercel Root Directory setting never has to change. ONE lockfile at the root; always `npm install` from the repo root (this also installs mobile + shared deps). Never recreate `mobile/package-lock.json`.
- **`packages/shared` must stay pure TypeScript** — no React, Next, or React Native imports. Both bundlers compile its raw `.ts` source: web via `transpilePackages: ['@orbisdei/shared']` in next.config.js, mobile via Metro. A framework import there breaks one side or the other.
- **web + mobile pin the SAME react version (19.x) — keep it that way.** npm hoists one copy to root `node_modules` and both the Next build and the RN bundle resolve it (verified via expo export source-map inspection). If the versions ever diverge, npm nests a second react and Metro's hierarchical lookup can pull the wrong copy into the RN bundle — after any react upgrade on either side, re-verify with `npx expo export --source-maps` and check the map for a single `node_modules/react` path.

- **`proxy.ts` (Next 16's middleware) must NEVER use a catch-all matcher.** On Vercel it runs as a Node function BEFORE the CDN cache, so matching public routes puts a cold-startable lambda + Supabase `auth.getUser()` round trip in front of every prerendered page — this caused 4s+ TTFB on the static homepage. The matcher is scoped to routes whose server components read the session (`/admin`, `/contribute`, `/lists`, `/list/*`, site/tag edit pages). Public pages resolve auth client-side via ProfileContext.
- `createServiceClient` uses cookie-based SSR client — for `auth.admin` operations (like deleting users), use `createAdminClient()` which is a true service-role client without cookies
- `.env.local` values may contain surrounding quotes — always `.Trim().Trim('"').Trim("'")` when parsing in PowerShell scripts
- PowerShell's `Invoke-RestMethod` can mangle auth headers — use `Invoke-WebRequest` with inline headers instead
- Leaflet requires `dynamic()` import with `ssr: false` — never import MapView directly in a server component
- The `comment` field on `site_links` / `LinkEntry` type must be preserved through the full edit flow (it was previously silently stripped)
- Nominatim requires ~1.1s between calls — this pacing is built into lib/geocode.ts itself; do not add caller-side sleeps or bypass the helpers with raw Nominatim fetches
- `SiteAccordionEditor` in `SitesPanel.tsx` does NOT use the shared `SiteForm` component — it's a custom editor for a subset of fields. If you need to add a feature to site editing in the admin panel, check whether it belongs in `SiteForm` (which affects contribute/edit pages too) or `SiteAccordionEditor` (admin-only accordion)
- Parallel.ai Task API uses a two-phase flow on Vercel Hobby: `/api/import-sites` kicks off the task (~2s), then the browser polls `/api/parallel-status` every 5s until completion. This avoids the 10-second Hobby function timeout. Each poll is a fast GET (~1s).

## Tech Debt

- **Server-side interest filtering** — Currently, interest-level filtering is done client-side via `useMemo` in each page's client component. When the site count reaches thousands, move filtering into `lib/data.ts` query functions (add `interestLevels?: InterestLevel[]` param to `getAllSites()`, `getMapPins()`, `getSitesByTag()`, etc.) so that only matching rows are fetched from Supabase. The `lib/interestFilter.ts` utility and `InterestFilter` component are designed to support this migration with no UI changes needed.
- **`createServiceClient` doesn't actually bypass RLS.** It uses `createServerClient` from `@supabase/ssr` which reads auth cookies, so the user's JWT overrides the service role key. Fix: switch to `createClient` from `@supabase/supabase-js` (no cookies) for the service client. Current workaround: RLS DELETE policies added where needed (e.g. `tags` table).
- **Inline critical CSS when Next's `experimental.inlineCss` stabilizes.** PageSpeed flags the single ~11KB stylesheet as render-blocking (~170ms est. savings on mobile LCP/FCP). Next.js has an `experimental.inlineCss` flag in next.config.js that inlines it into the HTML and removes the round trip — adopt it once it's out of experimental. Cost: each prerendered page's HTML grows by the inlined CSS, which matters little at ~11KB.
- **Remaining PageSpeed items deliberately not taken** (mobile audit, Jul 2026): ~170KB "unused JavaScript" is mostly Google Tag Manager (~64KB) plus supabase-js, which loads on every page for auth state — fixing means lazy-loading GA after `load` and deferring auth resolution; "touch targets" on overlapping Leaflet map pins is inherent to a map UI (clustering already mitigates); OSM tile cache lifetimes and the Cloudflare beacon are third-party. The mobile homepage map's four initial OSM tiles are preloaded in `app/page.tsx` (`MOBILE_TILE_PRELOADS`) — update those URLs if the initial mobile center/zoom ever changes.
- **24h `export const revalidate` page timer is likely still over-validating ISR write units.** Now that edits are covered by ringfenced on-demand revalidation (`siteTag`/`tagTag` via `lib/revalidate.ts`) plus a self-throttled `CATALOG_TAG` bust for homepage/search (same file's `maybeRevalidateCatalog`, at most once/hour, triggered by the edit path itself rather than a cron — Vercel Hobby only allows daily crons), the 24h timer's only remaining job is catching drift those two don't (direct SQL/migrations that bypass the tracked mutation paths, and the tag hero image's rotation) — it's no longer the primary freshness mechanism. At ~870 pages (336 sites + 528 tags + home/search) all independently timing out and regenerating on next visit, this is still a meaningful, largely redundant cost. Investigate shrinking it: a much longer timer (e.g. 7 days) would likely cut this line further. Note the timer is cheaper than it looks now — Vercel doesn't bill a write when regenerated output is byte-identical, and the hero rotation that used to guarantee daily-changing output is now weekly. Check the real Vercel ISR write-unit graph before picking a new number.

### ISR payload rules (learned the expensive way)

ISR write units are billed per 8 KB of output, and **every deployment fully invalidates
the cache**, re-prerendering all ~870 pages. So the cost of a page is its serialized size
× how often it changes. Two rules follow:

- **Never serialize a catalog-wide lookup table into a per-entity page.** Tag pages once
  passed all ~530 tags (`getAllTags()`, 169 KB) into `TagPageClient`; they now get only
  the tags their own sites reference (`siteTags`, ~2.6 KB avg). Site pages once passed
  every map pin (99 KB); they now get `getNearbyMapPins()` — a ~1.5° box around the site,
  ~9 pins. Together that was 120 MB → 2.2 MB per build.
- **Fetch the rest on demand instead.** `/api/site-card/[id]` (popup card data) and
  `/api/map-pins` (full pin set, pulled by `lib/hooks/useFullMapPins.ts` when the
  fullscreen or desktop map goes interactive) are CDN-cached GETs that cost nothing at
  build time. Reach for this pattern before widening a page's props.

Fast Origin Transfer is the same bytes on a different meter — compute→edge — so it rises
and falls with the above, and doesn't need separate work.

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
GSC_CREDENTIALS=
CRUX_API_KEY=
DIGEST_EMAIL_TO=
CRON_SECRET=
SUPABASE_SERVICE_ROLE_KEY=
PARALLEL_API_KEY=
```

## Search Console Reporting

`node scripts/gsc-report.mjs [summary|queries|pages|inspect <url>|sitemaps]` — zero-dep CLI that pulls Google Search Console data (search analytics, URL inspection, sitemap status) for `sc-domain:orbisdei.org`. Auths with a Google service account key at `./gsc-credentials.json` (gitignored — NEVER commit) or `GSC_CREDENTIALS_FILE`. The service account email must be added as a user on the GSC property, and the Search Console API must be enabled in its Cloud project.

## Daily Health Email

`/api/send-daily-health` (Vercel cron, 09:00 UTC) emails a health overview via Resend: GSC search summary, TTFB probes, CrUX real-user Core Web Vitals, latest Lighthouse lab scores, and the sites-without-photos table. Each section degrades independently. Lab scores come from `.github/workflows/psi-daily.yml` (07:30 UTC), which runs `scripts/psi-snapshot.mjs` (zero-dep PageSpeed Insights runner) and upserts into `daily_health_snapshots`. GitHub Action secrets: `PSI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

## Deploy
```powershell
function deploy($msg) { git add .; git commit -m "$msg"; git push origin main }
deploy "your commit message"
```
Vercel auto-deploys on push to main.

### Preview deployments are OFF by default

Pushing a branch does **not** create a preview deployment. Every Vercel deployment fully
invalidates the ISR cache and re-prerenders the whole site/tag catalog, billed as ISR
writes — and preview URLs mostly go unopened, so `scripts/vercel-ignore-build.sh`
(wired via `ignoreCommand` in vercel.json) skips them. Production is never skipped.

**Do not "fix" a missing preview by disabling that script.** It's deliberate. Opt in per
deployment instead — any one of these:

```powershell
# 1. [preview] anywhere in the commit message (easiest from a cloud session)
git commit --allow-empty -m "preview for visual check [preview]"

# 2. push to a preview/* branch
git push origin HEAD:preview/tag-layout

# 3. from the Vercel CLI
vercel deploy --build-env FORCE_PREVIEW=1
```

Use option 1 when the user needs to *see* a change — an empty commit on the working
branch is enough, and the preview URL appears on the PR. A dashboard "Redeploy" may just
re-run the ignore step and skip again, so don't rely on it.

Pre-merge validation comes from `.github/workflows/pr-build.yml` (type check + real
`next build`) on every PR, which writes nothing to Vercel's cache. Its build step is
skipped unless `SUPABASE_URL` and `SUPABASE_ANON_KEY` exist in **both** the Actions and
Dependabot secret stores — Dependabot PRs cannot read Actions secrets.