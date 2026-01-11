#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

die() { echo "ERROR: $*" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || die "Missing command: $1"; }

need git
need gh

[[ -f VERSION ]] || die "VERSION file missing"
ver="$(tr -d ' \t\r\n' < VERSION)"
tag="v${ver}"

ZIP="release/chatgpt-organizer-demo-${ver}.zip"
[[ -f "$ZIP" ]] || die "Missing $ZIP. Run: ./demo/scripts/build-demo-zip.sh"

# clean tree guard (same style as your extension script)
[[ -z "$(git status --porcelain)" ]] || die "Working tree not clean. Commit/stash first."

gh auth status >/dev/null 2>&1 || die "gh not authenticated. Run: gh auth login"

# Require the release to exist (created by your existing publish script)
gh release view "$tag" >/dev/null 2>&1 || die "Release $tag not found. Create it first (publish extension release)."

gh release upload "$tag" "$ZIP" --clobber

echo "Done: uploaded $(basename "$ZIP") to release $tag."
