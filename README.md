# Orbis Dei — Phase 1a

Explore Catholic holy sites and pilgrimage destinations on an interactive world map.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run the development server
npm run dev

# 3. Open in your browser
open http://localhost:3000
```

## Project Structure

```
orbis-dei/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout (HTML head, fonts, Leaflet CSS)
│   ├── page.tsx            # Homepage — map + sidebar
│   ├── not-found.tsx       # 404 page
│   ├── globals.css         # Tailwind + Leaflet style overrides
│   ├── site/[slug]/        # Individual site detail pages
│   │   ├── page.tsx        # Server component (SEO metadata)
│   │   └── SiteDetailClient.tsx  # Client component (images, map)
│   └── topic/[slug]/       # Topic pages (saints, themes)
│       └── page.tsx
├── components/
│   ├── Header.tsx          # Nav bar with Orbis Dei branding
│   ├── MapView.tsx         # Leaflet map with clustering
│   ├── MapViewDynamic.tsx  # Dynamic import wrapper (no SSR)
│   └── Sidebar.tsx         # Collapsible sidebar with search + browse
├── data/
│   └── sites.json          # Seed data (replace with your real data)
├── lib/
│   ├── data.ts             # Data access layer (swap for Supabase later)
│   └── types.ts            # TypeScript interfaces
└── public/                 # Static assets (images, favicon)
```

## Architecture Decisions

- **Next.js App Router** — Each site gets its own URL (`/site/fr-lisieux-basilica-st-therese-lisieux`), solving the bookmarking/sharing problem from the previous site.
- **Leaflet + OpenStreetMap** — Free map tiles, no API key needed. Google Maps links are stored per-site for navigation/directions.
- **JSON seed data** — Easy to edit during development. The `lib/data.ts` layer abstracts all data access; swapping to Supabase later only requires changing this one file.
- **Marker clustering** — Groups nearby pins at low zoom levels (matching the mockup's grouped pin display).

## Adding Your Own Sites

Edit `data/sites.json`. Each site needs:

```json
{
  "id": "url-friendly-slug",
  "name": "Display Name",
  "short_description": "A brief description shown in search results and map popups.",
  "latitude": 48.8530,
  "longitude": 2.3499,
  "google_maps_url": "https://maps.google.com/?q=...",
  "founded_date": "1345",
  "featured": false,
  "contributor": "Your Name",
  "updated_at": "2025-03-15T00:00:00Z",
  "images": [
    {
      "url": "https://upload.wikimedia.org/...",
      "caption": "Photo caption",
      "storage_type": "external",
      "display_order": 1
    }
  ],
  "links": [
    { "url": "https://example.com", "link_type": "Official Website" }
  ],
  "topic_ids": ["topic-slug"]
}
```

## Phase Roadmap

- [x] **Phase 1a** — Map with pins, site detail pages, topic pages, sidebar with search
- [ ] **Phase 1b** — Search page, responsive polish, "About" page
- [ ] **Phase 2** — Supabase backend, Google login, favorites, personal lists
- [ ] **Phase 3** — Contributor/admin workflows, photo uploads, approval queue
- [ ] **Phase 4** — Image carousel lightbox, nearby sites improvements, performance
