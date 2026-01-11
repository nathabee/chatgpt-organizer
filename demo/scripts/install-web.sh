#!/usr/bin/env bash
 
 # install this script in ~beelab/delivery, beelab beeing installin ~beelab/beelab

# scripts/install-web.sh
set -euo pipefail

# first unzip
rm  -r ./cgo-demo
unzip chatgpt-organizer-demo.zip -d ./cgo-demo

# clean old web path 
rm -rf ../beelab/web/public/cgo-demo
mkdir -p ../beelab/web/public/cgo-demo
cp -a ./cgo-demo ../beelab/web/public/

ls ../beelab/web/public/cgo-demo/