# Orbis Dei

Catholic holy sites explorer — interactive map with site detail pages.

## Tech Stack
- Next.js 15+ (App Router), TypeScript, Tailwind CSS
- NOTE: params in dynamic routes are async (Promise) — always `await params` before accessing slug
- Leaflet + OpenStreetMap for maps
- JSON seed data in data/sites.json (will migrate to Supabase)
- Data access abstracted through lib/data.ts

## Conventions
- All data access goes through lib/data.ts (single file to swap for Supabase later)
- MapView is client-only (dynamic import via MapViewDynamic.tsx)
- Site pages at /site/[slug], topic pages at /topic/[slug]
- Navy (#1e1e5f) and gold (#c9950c) brand colors
