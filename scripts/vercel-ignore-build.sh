#!/bin/sh
# Vercel "Ignored Build Step" (wired up via `ignoreCommand` in vercel.json).
#
# Exit 0 => skip the build.  Exit 1 => run the build.
#
# Why: every Vercel deployment fully invalidates the ISR cache, so each one
# re-prerenders all ~870 site/tag pages and bills the whole lot as ISR writes.
# Preview deployments are no exception. Dependabot opens the large majority of
# this project's deployments, and a preview URL for a dependency bump is not
# something anyone actually opens — so previews for those branches are skipped.
#
# Production is never skipped: a merge to main still builds and still validates
# the bump. If a bad bump breaks the build, that deployment fails and Vercel
# keeps serving the previous one, so the live site stays up either way.

if [ "$VERCEL_ENV" = "preview" ]; then
  case "$VERCEL_GIT_COMMIT_REF" in
    dependabot/*)
      echo "Skipping preview build for dependabot branch: $VERCEL_GIT_COMMIT_REF"
      exit 0
      ;;
  esac
fi

echo "Building: env=$VERCEL_ENV ref=$VERCEL_GIT_COMMIT_REF"
exit 1
