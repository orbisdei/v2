# Orbis Dei

Catholic and Christian holy sites explorer — an interactive map with site detail pages, user accounts, and contributor tools.

**Live site:** https://orbisdei.org

## Tech Stack

- **Framework:** Next.js 16 (App Router), TypeScript 7, Tailwind CSS 4
- **Database & Auth:** Supabase (PostgreSQL, Google OAuth, Row Level Security)
- **Maps:** Leaflet + OpenStreetMap (no API key needed)
- **Image storage:** Cloudflare R2, served via images.orbisdei.org
- **AI:** Google Gemini for bulk site import; Parallel.ai for web-grounded holy site discovery
- **Mobile:** Android-first Expo (React Native) app in `mobile/`, sharing the Supabase backend and the `@orbisdei/shared` package with web
- **Deployment:** Vercel, auto-deploys from `main`

## Quick Start

```bash
# 1. Install dependencies (repo root — this also installs mobile + shared workspace deps)
npm install

# 2. Create .env.local with at least:
#    NEXT_PUBLIC_SUPABASE_URL=
#    NEXT_PUBLIC_SUPABASE_ANON_KEY=
#    (see CLAUDE.md for the full list — image storage, AI import, search console, etc.)

# 3. Run the development server
npm run dev

# 4. Open in your browser
open http://localhost:3000
```

There are no unit tests or linting commands configured beyond `npm run lint` (Next's built-in ESLint). `npm run build` is the most reliable way to catch type and build errors.

## Project Structure

```
app/                       # Next.js App Router pages (homepage, site/tag detail, admin, contribute, auth, API routes)
components/                # Shared React components (map, site cards, tag pills, admin UI, etc.)
components/admin/          # Admin-only components (site form, image uploader, tag picker)
lib/                       # Data access layer, Supabase queries, image storage, geocoding, hooks
context/                   # React context providers (user profile, site actions)
utils/supabase/            # Supabase client setup (browser, server, static)
packages/shared/           # @orbisdei/shared — pure TypeScript shared by web + mobile (types, geo, image URLs, etc.)
mobile/                    # Android-first Expo (React Native) app — npm workspace, see mobile/README.md
supabase/migrations/       # SQL migrations for the Supabase database
scripts/                   # Import/migration/reporting scripts (Python + Node + PowerShell)
prompts/                   # Discovery/AI prompt source of truth (see Known Gotchas in CLAUDE.md)
public/                    # Static assets
```

This app has grown well past its original prototype — it now has user accounts, contributor/admin review workflows, AI-assisted site discovery and bulk import, a mobile app, and a production Supabase backend. For the full (and much more detailed) map of the codebase — including the database schema, coding conventions, component reuse rules, and known gotchas — see **[CLAUDE.md](./CLAUDE.md)**, which is the authoritative reference kept up to date for anyone (human or AI) working in this repo.

## Mobile App

See [`mobile/README.md`](./mobile/README.md) for running the Expo app, its structure, and Google OAuth / production build setup.

## Deployment

Vercel auto-deploys on push to `main`. Preview deployments are off by default (every Vercel deployment re-prerenders the whole site/tag catalog, which is billed as ISR writes) — see the Deploy section of CLAUDE.md for how to opt a specific push into a preview build.

## Contributing

There's no formal contribution process yet. If you're working in this codebase, start with CLAUDE.md — it documents the patterns this project relies on (shared components, the single data-access layer, image handling conventions) so changes stay consistent with the rest of the app.
