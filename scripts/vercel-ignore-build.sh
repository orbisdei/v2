#!/bin/sh
# Vercel "Ignored Build Step" (wired up via `ignoreCommand` in vercel.json).
#
# Exit 0 => skip the build.  Exit 1 => run the build.
#
# Preview deployments are OFF by default. Every Vercel deployment fully
# invalidates the ISR cache, so each one re-prerenders the whole site/tag
# catalog and bills all of it as ISR writes — and preview URLs for this
# project go unopened the large majority of the time. Pre-merge validation
# comes from the GitHub Actions build check instead (.github/workflows/
# pr-build.yml), which type-checks and builds without writing to Vercel's
# cache at all.
#
# Production is NEVER skipped: any merge to main builds and deploys normally.
#
# To get a preview deployment on purpose, any one of these works:
#
#   1. Put [preview] anywhere in the commit message:
#        git commit --allow-empty -m "check tag page layout [preview]"
#
#   2. Push a branch named preview/<something>:
#        git push origin HEAD:preview/tag-layout
#
#   3. Deploy from the CLI with the build env var set:
#        vercel deploy --build-env FORCE_PREVIEW=1
#
# (A "Redeploy" from the Vercel dashboard may also re-run this script and get
# skipped again — use one of the three above rather than relying on it.)

build() {
  echo "Building: env=$VERCEL_ENV ref=$VERCEL_GIT_COMMIT_REF ($1)"
  exit 1
}

# Production, and anything that isn't a preview, always builds.
[ "$VERCEL_ENV" != "preview" ] && build "not a preview deployment"

# --- Explicit opt-ins for a preview build ---

[ "$FORCE_PREVIEW" = "1" ] && build "FORCE_PREVIEW=1"

case "$VERCEL_GIT_COMMIT_MESSAGE" in
  *"[preview]"*) build "[preview] in commit message" ;;
esac

case "$VERCEL_GIT_COMMIT_REF" in
  preview/*) build "preview/* branch" ;;
esac

echo "Skipping preview build for $VERCEL_GIT_COMMIT_REF."
echo "Want one? Use [preview] in the commit message, a preview/* branch, or"
echo "vercel deploy --build-env FORCE_PREVIEW=1 (see scripts/vercel-ignore-build.sh)."
exit 0
