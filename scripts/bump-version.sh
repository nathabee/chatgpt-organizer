#!/usr/bin/env bash
set -euo pipefail

BUMP="${1:-patch}"  # major | minor | patch
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

[[ -f VERSION ]] || { echo "VERSION file missing"; exit 1; }

old="$(tr -d ' \t\r\n' < VERSION)"
IFS=. read -r MA MI PA <<< "$old"

case "$BUMP" in
  major) MA=$((MA+1)); MI=0; PA=0 ;;
  minor) MI=$((MI+1)); PA=0 ;;
  patch) PA=$((PA+1)) ;;
  *)
    echo "Usage: $0 [major|minor|patch]"
    exit 1
    ;;
esac

new="${MA}.${MI}.${PA}"
echo "$new" > VERSION

# Update root manifest.json (source)
if [[ -f manifest.json ]]; then
  node -e '
    const fs = require("fs");
    const v = fs.readFileSync("VERSION","utf8").trim();
    const p = "manifest.json";
    const j = JSON.parse(fs.readFileSync(p,"utf8"));
    j.version = v;
    fs.writeFileSync(p, JSON.stringify(j, null, 2) + "\n");
  '
fi

# Update dist/manifest.json if it exists (built output)
#if [[ -f dist/manifest.json ]]; then
#  node -e '
#    const fs = require("fs");
#    const v = fs.readFileSync("VERSION","utf8").trim();
#    const p = "dist/manifest.json";
#    const j = JSON.parse(fs.readFileSync(p,"utf8"));
#    j.version = v;
#    fs.writeFileSync(p, JSON.stringify(j, null, 2) + "\n");
#  '
#fi

# Update package.json 
if [[ -f package.json ]]; then
  node -e '
    const fs = require("fs");
    const v = fs.readFileSync("VERSION","utf8").trim();
    const p = "package.json";
    const j = JSON.parse(fs.readFileSync(p,"utf8"));
    j.version = v;
    fs.writeFileSync(p, JSON.stringify(j, null, 2) + "\n");
  '
fi

# Update package.json 
if [[ -f demo/package.json ]]; then
  node -e '
    const fs = require("fs");
    const v = fs.readFileSync("VERSION","utf8").trim();
    const p = "demo/package.json";
    const j = JSON.parse(fs.readFileSync(p,"utf8"));
    j.version = v;
    fs.writeFileSync(p, JSON.stringify(j, null, 2) + "\n");
  '
fi

# Update src/shared/version.ts (for demo + any non-extension build)
node -e '
  const fs = require("fs");
  const v = fs.readFileSync("VERSION","utf8").trim();
  const p = "src/shared/version.ts";
  const out = `// src/shared/version.ts\n// Auto-generated. Do not edit by hand.\nexport const CGO_VERSION = "${v}";\n`;
  fs.writeFileSync(p, out);
'


git add VERSION manifest.json  demo/package.json package.json src/shared/version.ts  2>/dev/null || true
# git commit -m "chore(version): bump to ${new}"

echo "Bumped: $old -> $new"
echo "Staged version files. Commit when ready."
 
