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

[[ -f VERSION ]] || die "VERSION file missing"
ver="$(tr -d ' \t\r\n' < VERSION)"
[[ -n "$ver" ]] || die "VERSION is empty"
tag="v${ver}"

# Guard: clean tree (so tags/releases map to a reproducible commit)
[[ -z "$(git status --porcelain)" ]] || die "Working tree not clean. Commit/stash first."

echo "=== CGO release-all ==="
echo "Version: $ver"
echo "Tag:     $tag"
echo

echo "== 1) Build extension zip =="
./scripts/build-zip.sh

echo
echo "== 2) Build demo zip =="
./demo/scripts/build-demo-zip.sh

echo
echo "== 3) Publish GitHub release + upload extension zip =="
./scripts/publish-release-zip.sh

echo
echo "== 4) Upload demo zip to same release =="
./demo/scripts/publish-demo-zip.sh

echo
echo "DONE: release-all completed for $tag"
