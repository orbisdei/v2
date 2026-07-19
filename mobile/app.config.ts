// Dynamic Expo config: extends app.json and injects build-time values that
// must stay out of git (the repo is public).
//
// GOOGLE_MAPS_ANDROID_API_KEY — Google Maps SDK key for release builds.
//   Set it as an EAS environment variable (eas env:create) so EAS injects it
//   during prebuild; Expo Go development doesn't need it (Expo's own key is
//   used there). The key still ends up inside the APK manifest — that is how
//   the Maps SDK works — so its real protection is the Google Cloud
//   restrictions (package name + signing SHA-1 + Maps SDK for Android only),
//   not secrecy. Keeping it out of the repo avoids public-key scanner noise.

import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const mapsApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY;
  return {
    ...config,
    name: config.name ?? 'Orbis Dei',
    slug: config.slug ?? 'orbis-dei',
    android: {
      ...config.android,
      ...(mapsApiKey
        ? { config: { ...config.android?.config, googleMaps: { apiKey: mapsApiKey } } }
        : {}),
    },
  };
};
