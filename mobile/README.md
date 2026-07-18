# Orbis Dei — Mobile (Android-first)

Expo (React Native) app sharing the web app's Supabase backend. Lives in `mobile/` inside the main repo; nothing in the web app depends on it.

## Run it (development)

```bash
cd mobile
npm install
cp .env.example .env   # fill in the Supabase URL + anon key from the web app's .env.local
npx expo start
```

Scan the QR code with the **Expo Go** app on an Android phone (same Wi-Fi), or press `a` with an Android emulator running. The map uses `react-native-maps`, which works in Expo Go on Android out of the box.

## Structure

```
src/
  app/                 # expo-router screens
    (tabs)/            # Map (home), Search, My Lists, Profile
    site/[id].tsx      # Site detail (gallery, visited toggle, directions, links, tags)
    tag/[slug].tsx     # Tag page (description + site list)
    list/[id].tsx      # List detail (read-only)
  components/          # SiteCard, TagPill, InterestFilter, SaveToListPanel — mobile counterparts of the web components
  lib/
    types.ts           # Copied verbatim from web lib/types.ts — keep in sync
    imageUrl.ts        # Copied verbatim (cfImage — Cloudflare Image Transformations)
    interestFilter.ts  # Copied verbatim
    countries.ts       # Copied verbatim
    supabase.ts        # RN Supabase client (AsyncStorage session persistence)
    data.ts            # Mobile data layer — mirrors web lib/data.ts query shapes
    auth.tsx           # AuthProvider: Google OAuth via system browser + deep link
    catalog.tsx        # CatalogProvider: loads site catalog + tags once, shared app-wide
    richText.tsx       # RN port of web formatRichText (bold/italic/links/newlines)
  hooks/
    useVisited.ts      # Port of the web useVisited hook
    useLists.ts        # Port of the web useLists hook (membership + toggle + create)
  constants/theme.ts   # Navy/gold brand palette
```

Map pins are clustered with `supercluster` (pure JS — recomputed per region change; cluster tap zooms in). The locate button uses `expo-location` foreground permission.

**Convention:** all Supabase access goes through `src/lib/data.ts` (same rule as the web app's `lib/data.ts`). The four "copied verbatim" files should be updated whenever their web counterparts change.

## Google OAuth setup (required before sign-in works)

1. In the Supabase dashboard → Authentication → URL Configuration, add `orbisdei://auth/callback` to the Redirect URLs allowlist.
2. That's it for Expo Go / development. For a standalone production build, additionally create an **Android** OAuth client in Google Cloud Console (package `org.orbisdei.app` + your signing cert SHA-1) and add it to the Supabase Google provider config.

## Production build (later)

- `npx eas build --platform android` (needs an Expo account; EAS manages the keystore).
- `react-native-maps` uses Google Maps on Android: a standalone build needs `android.config.googleMaps.apiKey` in `app.json` (free tier is fine at this scale). Expo Go uses Expo's own key, so this is only needed for release builds.
