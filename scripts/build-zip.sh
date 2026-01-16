#!/usr/bin/env bash
# scripts/build-zip.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

[[ -f VERSION ]] || { echo "VERSION file missing"; exit 1; }
ver="$(tr -d ' \t\r\n' < VERSION)"

# 1) Build
npm run build

# 2) Sanity check
[[ -d dist ]] || { echo "Missing dist/ (build failed?)"; exit 1; }
[[ -f dist/manifest.json ]] || { echo "Missing dist/manifest.json"; exit 1; }

# 3) Ensure dist manifest version matches VERSION (hard fail if not)
node -e '
  const fs=require("fs");
  const v=fs.readFileSync("VERSION","utf8").trim();
  const j=JSON.parse(fs.readFileSync("dist/manifest.json","utf8"));
  if (j.version !== v) {
    console.error(`dist/manifest.json version (${j.version}) != VERSION (${v}). Run scripts/bump-version.sh first.`);
    process.exit(1);
  }
'

# 4) Hard fail if sourcemaps are present in dist
if find dist -type f -name "*.map" -print -quit | grep -q .; then
  echo "ERROR: Sourcemap files (*.map) found in dist/. Do not upload these to Chrome Web Store."
  echo "Found:"
  find dist -type f -name "*.map" -print
  echo
  echo "Fix: disable sourcemaps in your build OR keep them but exclude from dist output."
  exit 1
fi

# 5) Create zip (exclude .map, and optionally svg)
OUT_DIR="release"
mkdir -p "$OUT_DIR"

ZIP_NAME="chatgpt-organizer-${ver}.zip"
ZIP_PATH="${OUT_DIR}/${ZIP_NAME}"

rm -f "$ZIP_PATH"

# zip dist contents (not the folder itself)
# Exclusions:
# - *.map : Chrome Web Store reviewers often reject sourcemaps in uploads
# - *.svg : optional (keep only if you really need it at runtime)
(
  cd dist
  zip -qr "../${ZIP_PATH}" . \
    -x "*.map" \
    -x "*.svg"
)

echo "Built: ${ZIP_PATH}"
ls -lh "$ZIP_PATH"

echo
echo "ZIP contents (top level):"
unzip -l "$ZIP_PATH" | sed -n '1,40p'
