# Orbis Dei — Mobile (Android-first)

Expo (React Native) app sharing the web app's Supabase backend. Lives in `mobile/` as an **npm workspace** of the repo root; nothing in the web app depends on it, but both consume the `@orbisdei/shared` package (`packages/shared`).

## Run it (development)

```bash
npm install            # at the REPO ROOT — one lockfile installs web + mobile + shared
cd mobile
cp .env.example .env   # fill in the Supabase URL + anon key from the web app's .env.local
npx expo start
```

Do not create a `mobile/package-lock.json` — the root lockfile owns all dependencies. `metro.config.js` carries the monorepo resolver config (workspace watch + app-first module resolution) needed for `@orbisdei/shared`. Web and mobile pin the same react version (19.x) so one hoisted copy serves both — keep them aligned when upgrading (see the repo CLAUDE.md gotchas).

Scan the QR code with the **Expo Go** app on an Android phone (same Wi-Fi), or press `a` with an Android emulator running. The map uses `react-native-maps`, which works in Expo Go on Android out of the box.

## Structure

```
src/
  app/                 # expo-router screens
    (tabs)/            # Map (home), Search, My Lists, Profile
    site/[id].tsx      # Site detail (gallery, visited toggle, save-to-list, directions, links, tags)
    tag/[slug].tsx     # Tag page (description + site list)
    list/[id].tsx      # List detail (metadata, owner attribution, sites — read-only)
    user/[initials].tsx # Public user profile (avatar, about, visited count, public lists)
  components/          # SiteCard, TagPill, InterestFilter, SaveToListPanel, FeaturedTopicPills — mobile counterparts of the web components
  lib/
    types.ts           # Re-export shim → @orbisdei/shared/src/types
    imageUrl.ts        # Re-export shim → @orbisdei/shared/src/imageUrl
    interestFilter.ts  # Re-export shim → @orbisdei/shared/src/interestFilter
    countries.ts       # Re-export shim → @orbisdei/shared/src/countries
    supabase.ts        # RN Supabase client (AsyncStorage session persistence)
    data.ts            # Mobile data layer — same query shapes as web lib/data.ts; rowToSite + select strings imported from @orbisdei/shared/src/siteRow
    auth.tsx           # AuthProvider: Google OAuth via system browser + deep link
    catalog.tsx        # CatalogProvider: loads site catalog + tags once, shared app-wide
    richText.tsx       # RN port of web formatRichText (bold/italic/links/newlines)
  hooks/
    useVisited.ts      # Port of the web useVisited hook
    useLists.ts        # Port of the web useLists hook (membership + toggle + create)
  constants/theme.ts   # Navy/gold brand palette
```

Map pins are clustered with `supercluster` (pure JS — recomputed per region change; cluster tap zooms in). The locate button uses `expo-location` foreground permission.

The catalog (sites + tags) is cached in AsyncStorage after every successful fetch, so the app launches browsable offline; a network refresh silently replaces the cache when connectivity returns.

**Convention:** all Supabase access goes through `src/lib/data.ts` (same rule as the web app's `lib/data.ts`). Code shared with the web app lives in `packages/shared` (`@orbisdei/shared`) — edit it there once; there are no copies to keep in sync. That package must stay pure TypeScript (no React/Next/RN imports).

## Google OAuth setup (required before sign-in works)

1. In the Supabase dashboard → Authentication → URL Configuration, add `orbisdei://auth/callback` to the Redirect URLs allowlist.
2. That's it for Expo Go / development. For a standalone production build, additionally create an **Android** OAuth client in Google Cloud Console (package `org.orbisdei.app` + your signing cert SHA-1) and add it to the Supabase Google provider config.

## Production build (later)

- `eas build --platform android` (needs an Expo account and the `eas-cli` npm package installed globally; EAS manages the keystore).
- **EAS builds do NOT see `mobile/.env`** (it's gitignored and never uploaded). The `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` values must be set as EAS environment variables (`eas env:create`, visibility plain) in BOTH the `preview` and `production` environments, or the built app crashes at launch with "supabaseUrl is required".
- `react-native-maps` uses Google Maps on Android: release builds need a Maps SDK key, injected via the `GOOGLE_MAPS_ANDROID_API_KEY` EAS environment variable (see `app.config.ts` — never commit the key; the repo is public). Restrict the key in Google Cloud to package `org.orbisdei.app` + the EAS keystore SHA-1 + Maps SDK for Android. Expo Go uses Expo's own key, so none of this affects development.
