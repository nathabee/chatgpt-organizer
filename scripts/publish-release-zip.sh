#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

die() { echo "ERROR: $*" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || die "Missing command: $1"; }

need git
need gh

[[ -f VERSION ]] || die "VERSION file missing"
ver="$(tr -d ' \t\r\n' < VERSION)"
tag="v${ver}"

ZIP="release/chatgpt-organizer-${ver}.zip"
[[ -f "$ZIP" ]] || die "Missing $ZIP. Run: ./scripts/build-zip.sh"

# Clean tree guard (same reason as before)
[[ -z "$(git status --porcelain)" ]] || die "Working tree not clean. Commit/stash first."

gh auth status >/dev/null 2>&1 || die "gh not authenticated. Run: gh auth login"

HEAD_SHA="$(git rev-parse HEAD)"
HEAD_SHORT="$(git rev-parse --short HEAD)"

# Refuse to retag if a release already exists
RELEASE_EXISTS="no"
if gh release view "$tag" >/dev/null 2>&1; then
  RELEASE_EXISTS="yes"
fi

# Ensure tag points to HEAD
if git rev-parse "$tag" >/dev/null 2>&1; then
  TAG_SHA="$(git rev-parse "$tag^{commit}")"
  if [[ "$TAG_SHA" != "$HEAD_SHA" ]]; then
    if [[ "$RELEASE_EXISTS" == "yes" ]]; then
      die "Release already exists for $tag and tag points to a different commit. Bump version for a new release."
    fi
    git tag -f -a "$tag" -m "Release $tag ($HEAD_SHORT)" HEAD
  fi
else
  git tag -a "$tag" -m "Release $tag ($HEAD_SHORT)" HEAD
fi

# Push tag (safe force only if no release exists yet)
if [[ "$RELEASE_EXISTS" == "yes" ]]; then
  git push origin "$tag"
else
  git push origin "$tag" --force-with-lease
fi

NOTES=$'Chrome extension build.\n\n'"- Version: ${ver}"$'\n'"- Tag: ${tag}"$'\n'"- Commit: ${HEAD_SHORT}"$'\n'

if [[ "$RELEASE_EXISTS" == "yes" ]]; then
  echo "Release exists: $tag"
else
  gh release create "$tag" --title "$tag" --notes "$NOTES"
fi

gh release upload "$tag" "$ZIP" --clobber

echo "Done: uploaded $(basename "$ZIP") to release $tag."
