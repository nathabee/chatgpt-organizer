#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

die() { echo "ERROR: $*" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || die "Missing command: $1"; }

need git
need node
need npm
need zip
need gh

DOCS_COMMIT_MSG="${1:-}"

[[ -f VERSION ]] || die "VERSION file missing"
ver="$(tr -d ' \t\r\n' < VERSION)"
[[ -n "$ver" ]] || die "VERSION is empty"
tag="v${ver}"

echo "=== CGO release-all ==="
echo "Version: $ver"
echo "Tag:     $tag"
echo

# 0) Guard: refuse unrelated local changes (only allow docs demo paths to be touched by this script)
dirty_outside_allowed="$(
  git status --porcelain |
    awk '{
      p=$2;
      if (p ~ /^docs\/cgo-demo(\/|$)/) next;
      if (p == "docs/index.html") next;
      # ignore these if they appear as build byproducts
      if (p ~ /^(dist|demo\/dist|release)(\/|$)/) next;
      print;
    }'
)"
[[ -z "$dirty_outside_allowed" ]] || {
  echo "Unrelated local changes detected:"
  echo "$dirty_outside_allowed"
  die "Commit/stash these first, then rerun."
}

# 1) Build extension zip
echo "== 1) Build extension zip =="
./scripts/build-zip.sh

# 2) Build demo zip (also produces demo/dist)
echo
echo "== 2) Build demo zip =="
./demo/scripts/build-demo-zip.sh

# 3) Copy demo/dist -> docs/cgo-demo for GitHub Pages
echo
echo "== 3) Publish demo to GitHub Pages (docs/cgo-demo) =="
DEMO_DIST="demo/dist"
DOCS_DEMO="docs/cgo-demo"
[[ -d "$DEMO_DIST" ]] || die "Missing $DEMO_DIST (demo build failed?)"

rm -rf "$DOCS_DEMO"
mkdir -p "$DOCS_DEMO"
cp -a "$DEMO_DIST"/. "$DOCS_DEMO"/
echo "Copied demo build to $DOCS_DEMO"

# 4) Commit + push docs demo (only if changed)
echo
echo "== 4) Commit + push docs demo =="

git add -A -- docs/cgo-demo docs/index.html

if git diff --cached --quiet; then
  echo "No docs changes to commit."
else
  git commit -m "docs(demo): publish cgo-demo ${ver}"
  git push origin HEAD
  echo "Committed + pushed docs demo for ${ver}"
fi


# 5) Publish GitHub release + upload extension zip
echo
echo "== 5) Publish GitHub release + upload extension zip =="
./scripts/publish-release-zip.sh

# 6) Upload demo zip to same release
echo
echo "== 6) Upload demo zip to same release =="
./demo/scripts/publish-demo-zip.sh

echo
echo "DONE: release-all completed for $tag"
