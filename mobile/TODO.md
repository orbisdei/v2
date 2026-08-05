# Orbis Dei Mobile — Backlog

Running todo list for the Expo (Android-first) app. Not scoped to any one feature — add to it
as work comes up, tick things off as they land.

Conventions that apply to everything below:

- All Supabase access goes through `src/lib/data.ts` (mirrors the web `lib/data.ts` rule).
- Anything genuinely shared with web belongs in `packages/shared` (`@orbisdei/shared`) and must
  stay **pure TypeScript** — no React / Next / React Native imports.
- Web and mobile pin the same react version (19.x). Keep them aligned on any upgrade.
- When a web feature and its mobile counterpart diverge, the web app is the reference
  implementation unless noted.

Status key: `[ ]` not started · `[~]` partial · `[x]` done

---

## 1. Around Me (this feature)

The app already has a locate button (`src/app/(tabs)/index.tsx` → `locateMe`), but it only
re-centres the map. Web is getting a ranked, distance-sorted result set; the app should match.

- [ ] Move distance helpers into `@orbisdei/shared` so web and mobile use one implementation
      (web currently has `haversineMeters` / `formatDistance` in `lib/geo.ts`)
- [ ] `unit` support in `formatDistance` (miles for `en-US` / `en-GB` / `my`, km elsewhere)
- [ ] Distance-sorted bottom sheet on the map tab, replacing recenter-only behaviour
- [ ] Radius ladder (5 → 25 → 100 km → anywhere), stopping at the first rung with 3+ results,
      always labelled — never show an empty nearby list
- [ ] Around Me opens all public interest levels, with a visible + reversible chip
- [ ] `distanceMeters` on the mobile `SiteCard` (matches the new web prop)
- [ ] User location dot + accuracy ring + radius ring on the `react-native-maps` map
- [ ] Blocked-permission state with a manual place fallback. `expo-location` already handles
      the request; today a denial only produces an `Alert` and a dead end
- [ ] Foreground location usage strings for the iOS build (see §7)

## 2. Topic filtering within a geography (this feature)

- [ ] Topic facet row on the tag page, scoped to the sites in that geography, counts included
- [ ] Multi-select union (OR) semantics, matching web
- [ ] Collapse single-site topics behind a "show all" sheet; the tail is long (France: 19 of 35
      topic tags have exactly one site)
- [ ] Search field in the "all topics" sheet — pill rows alone don't scale past ~15 topics
- [ ] Same facets over the Around Me result set ("Topics near you")
- [ ] Put the facet-derivation logic in `@orbisdei/shared` so both apps count identically

## 3. Web-parity gaps (verified, unrelated to the above)

Each of these exists on web and is missing or partial on mobile.

- [ ] **Tag page** (`src/app/tag/[slug].tsx`) has no map, no child-location pills
      (Regions / Cities), and no interest filter. Web has all three
- [ ] **Site detail** (`src/app/site/[id].tsx`) has no map and no nearby-sites list
- [ ] **Site detail** has no contributor notes section. These are publicly readable on web
- [ ] **List detail** (`src/app/list/[id].tsx`) is read-only by design for now — no inline
      name/description edit, no drag reorder, no public/private toggle, no remove-site
- [ ] **Search tab** has no interest filter and returns sites only — web also returns matching
      topic tags via `TagListRow`
- [ ] No visited-sites view. Web surfaces visited state on cards but also has a visited map
- [ ] No contributor or admin surfaces at all (add site, edit site, edit tag, approvals).
      Worth an explicit decision on whether these ever belong in the app

## 4. Platform + release

- [ ] First `eas build --platform android` has not been run yet
- [ ] EAS env vars set in **both** `preview` and `production`:
      `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`,
      `GOOGLE_MAPS_ANDROID_API_KEY` — a missing Supabase value crashes the app at launch
- [ ] Restrict the Maps SDK key to package `org.orbisdei.app` + the EAS keystore SHA-1
- [ ] Play Store listing: icon, feature graphic, screenshots, privacy policy URL
      (the privacy policy needs to cover location once §1 ships)
- [ ] Decide on iOS. `app.config.ts` currently configures Android only — iOS needs a Maps
      key, `NSLocationWhenInUseUsageDescription`, and an Apple developer account
- [ ] App version / build number strategy before the first public release

## 5. Robustness

- [ ] Catalog cache is read-only offline. Visited toggles and list edits made offline are lost —
      needs either a write queue or clear UI that the action requires connectivity
- [ ] No error boundary. A render throw in a screen currently takes down the tab
- [ ] No retry affordance on catalog fetch failure beyond restarting the app
- [ ] `tracksViewChanges={false}` is set on markers (good), but pin re-clustering on every
      region change hasn't been profiled on a low-end device
- [ ] No deep-link handling for `orbisdei.org` URLs — tapping a shared site link opens the
      browser rather than the app
- [ ] No share action on site detail

## 6. Quality

- [ ] No tests of any kind in `mobile/`
- [ ] No lint config specific to the RN app
- [ ] Accessibility pass: several `Pressable`s have no `accessibilityLabel`, and tap targets
      inside `SiteCard` have not been checked against the 44px rule the web app follows

## 7. Data quality (blocks clean topic UI on both platforms)

- [ ] **29 topic tags still have `name` identical to `id`** — they render as raw slugs
      (`maximilian-kolbe`, `catacombs`, `camillians`, `louis-zelie-martin`, …). Any UI that
      lists topic tags prominently, including §2, exposes this. Fix in the data, not the UI
