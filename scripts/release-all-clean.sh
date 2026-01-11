#!/usr/bin/env bash
set -euo pipefail


echo "This script is called in cae release-all.sh failed, first repair the problem that produced error then run this"


# 1) See exactly what’s dirty
git status --porcelain

# 2) Stage + commit ONLY the chmod (mode) changes
git add demo/scripts/*.sh
git commit -m "clean tree before release"

# 3) Now the publish script will pass its clean-tree guard
./demo/scripts/publish-demo-zip.sh
