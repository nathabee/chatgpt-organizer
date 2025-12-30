#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

[[ -f VERSION ]] || { echo "VERSION file missing"; exit 1; }
ver="$(tr -d ' \t\r\n' < VERSION)"
tag="v${ver}"

# Tag current HEAD
git tag -a "$tag" -m "Release $tag" HEAD

# Push commit + tag
git push origin HEAD
git push origin "$tag"

echo "Tagged + pushed: $tag"
