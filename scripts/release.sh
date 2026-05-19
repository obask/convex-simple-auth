#!/usr/bin/env bash
# Build and force-push the `dist` branch.
#
# Consumers install with:
#   pnpm add github:obask/convex-simple-auth#dist
#
# The dist branch contains the compiled `dist/` directory committed alongside
# `scripts/`, `templates/`, `package.json`, and the README, so installers don't
# need a build step.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "[release] Working tree is dirty. Commit or stash first." >&2
  exit 1
fi

SOURCE_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
SOURCE_SHA="$(git rev-parse --short HEAD)"
DIST_BRANCH="dist"

echo "[release] Building from $SOURCE_BRANCH @ $SOURCE_SHA"
pnpm run clean
pnpm run build

# Stash the built dist/ outside the worktree so we can hop branches cleanly.
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cp -R dist "$TMP/dist"

# Recreate the dist branch from scratch (orphan = no history bloat).
git checkout --orphan "$DIST_BRANCH-tmp"
git rm -rf --quiet . || true

# Copy built output + everything consumers need.
cp -R "$TMP/dist" ./dist
git checkout "$SOURCE_BRANCH" -- scripts templates package.json README.md LICENSE 2>/dev/null || \
  git checkout "$SOURCE_BRANCH" -- scripts templates package.json README.md

git add dist scripts templates package.json README.md
[ -f LICENSE ] && git add LICENSE || true

git commit -m "build: release from $SOURCE_BRANCH @ $SOURCE_SHA"

# Replace the remote dist branch.
git branch -D "$DIST_BRANCH" 2>/dev/null || true
git branch -m "$DIST_BRANCH"
git push -f origin "$DIST_BRANCH"

# Return to the source branch.
git checkout "$SOURCE_BRANCH"

echo "[release] Pushed $DIST_BRANCH."
echo "[release] Install in consumers with:"
echo "          pnpm add github:obask/convex-simple-auth#dist"
