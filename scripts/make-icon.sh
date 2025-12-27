#!/bin/sh

# install first
# sudo apt update
# sudo apt install imagemagick


for s in 16 32 48 128; do
  convert assets/icon.svg -resize ${s}x${s} assets/icon-${s}.png
done