# Orbis Dei

Catholic and Christian holy sites explorer — interactive map with site detail pages, user accounts, and contributor tools.

## Live Site
https://orbisdei.org (hosted on Vercel)

## Tech Stack
- **Framework**: Next.js 16 (App Router), TypeScript, Tailwind CSS
- **Database & Auth**: Supabase (PostgreSQL, Google OAuth, Row Level Security)
- **Maps**: Leaflet + OpenStreetMap (free, no API key)
- **Image Storage**: Supabase Storage (bucket: site-images). Migration to Cloudflare R2 planned.
- **AI**: Google Gemini API (gemini-2.5-flash) for bulk site import. Key: GEMINI_API_KEY
- **Deployment**: Vercel (auto-deploys from GitHub on push to main)

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
  SitePreviewCard.tsx         # Unified preview card (used in mobile bottom panel + Leaflet popups)
  Sidebar.tsx                 # Desktop sidebar (search, topics, featured sites)
  FavoriteButton.tsx          # Visited + bookmark circle buttons
lib/
  types.ts                    # TypeScript interfaces
  data.ts                     # Data access layer (Supabase queries)
  storage.ts                  # Image upload utility (single function to swap for R2 later)
utils/supabase/
  client.ts                   # Browser Supabase client (for client components)
  server.ts                   # Server Supabase client (for server components, uses cookies)
  static.ts                   # Static Supabase client (for generateStaticParams, no cookies)
```

## Database Schema (Supabase)

### Core Tables
- **sites** — id (text, slug), name, short_description, latitude, longitude, google_maps_url, featured (bool), contributor (text legacy), created_by (uuid → auth.users), created_at, updated_at
- **site_images** — id, site_id → sites, url, caption, storage_type (local/external), display_order
- **site_links** — id, site_id → sites, url, link_type (e.g. "Official Website")
- **site_tags** — site_id → sites, tag_id → tags (many-to-many join)
- **tags** — id (text, slug), name, description, image_url, featured (bool)

### User Tables
- **profiles** — id (uuid → auth.users), display_name, email, avatar_url, initials (3 chars, immutable), initials_display (unique, may have number appended e.g. JMM1), about_me, role ('general'/'contributor'/'administrator'), created_at, updated_at
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

## Key Architecture Decisions

### Data Access
- All Supabase queries go through lib/data.ts or direct supabase client calls
- Three Supabase clients: client.ts (browser), server.ts (request-scoped), static.ts (build-time)
- Image uploads go through lib/storage.ts (single function — swap for R2 later)

### Map Behavior
- **Desktop**: Leaflet popup uses SitePreviewCard via React createPortal
- **Mobile split view**: Pin tap shows SitePreviewCard in bottom panel (not a Leaflet popup)
- **Mobile fullscreen**: Leaflet popup uses SitePreviewCard via React createPortal (same as desktop)
- SitePreviewCard is a single shared component used in all three contexts

### Image Display
- Landscape/square photos (≥1:1): adaptive aspect ratio container, object-fit cover
- Portrait photos (<1:1): fixed container with blurred background fill technique
- Carousel uses crossfade transitions (300ms)

### User Roles
- **general**: browse, visited, lists
- **contributor**: all general + edit sites (with admin approval), upload photos, add notes
- **administrator**: all contributor + direct publish, bulk import, manage featured items

### Mobile Layout
- Homepage: split view — map top (~40vh), scrollable content bottom
- All other pages: single scrollable column, no side-by-side map
- Header: hamburger left, logo centered, avatar right
- Fullscreen map: overlay with X close, preserves scroll position

## Environment Variables
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Google Gemini (for AI bulk import)
GEMINI_API_KEY=

# Cloudflare R2 (not yet active — SSL issue pending)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=orbis-dei-images
R2_PUBLIC_URL=
```

## Conventions
- Navy (#1e1e5f) and gold (#c9950c) brand colors
- Serif font (Georgia) for headings, sans (Inter) for body
- 44px minimum tap targets on mobile
- All icons from lucide-react
- Visited state: green (#639922) circle with checkmark
- Bookmark state: navy (#1e1e5f) filled circle
- Featured badge: gold-tinted pill (#fef8e0 bg, #8a6d0b text)
- "Already in inventory" badge: amber-tinted (#fffcf5 bg, #854f0b text)

## Deploy
```powershell
function deploy($msg) { git add .; git commit -m "$msg"; git push origin main }
deploy "your commit message"
```
Vercel auto-deploys on push to main.

## Current Priorities (in order)
1. AI bulk import — /admin/import page using Gemini API
2. Advanced filtering — filter sites by tag, country, type on map and search
3. Tag page descriptions and images — improve tag/topic pages
4. List management page — view/edit/share/delete personal lists
5. Admin featured items dashboard
6. Admin approval queue page
7. Nearby sites on detail pages