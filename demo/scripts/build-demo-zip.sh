#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEMO_DIR="${ROOT_DIR}/demo"
cd "$ROOT_DIR"

[[ -f VERSION ]] || { echo "VERSION file missing"; exit 1; }
ver="$(tr -d ' \t\r\n' < VERSION)"

# 1) Build demo
( cd "$DEMO_DIR" && npm ci && npm run build )

# 2) Sanity check
[[ -d "$DEMO_DIR/dist" ]] || { echo "Missing demo/dist/ (build failed?)"; exit 1; }
[[ -f "$DEMO_DIR/dist/index.html" ]] || { echo "Missing demo/dist/index.html"; exit 1; }
[[ -d "$DEMO_DIR/dist/assets" ]] || { echo "Missing demo/dist/assets/"; exit 1; }

# 3) Create zip
OUT_DIR="release"
mkdir -p "$OUT_DIR"

ZIP_NAME="chatgpt-organizer-demo-${ver}.zip"
ZIP_PATH="${OUT_DIR}/${ZIP_NAME}"

rm -f "$ZIP_PATH"
( cd "$DEMO_DIR/dist" && zip -qr "../../${ZIP_PATH}" . )

echo "Built: ${ZIP_PATH}"
ls -lh "$ZIP_PATH"
