#!/bin/sh
# Render the home-screen icons from docs/ganesha.svg: the emblem in a light
# saffron on the theme's deep maroon, square (phones apply their own mask).
# Needs Google Chrome and macOS sips.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
{
  printf '<html><body style="margin:0;width:512px;height:512px;background:#7a2e12;display:flex;'
  printf 'align-items:center;justify-content:center;color:#f6dcc0">'
  sed 's/<svg /<svg width="340" height="381" /' "$ROOT/docs/ganesha.svg"
  printf '</body></html>'
} > "$TMP/page.html"
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
  --user-data-dir="$TMP/chrome" --window-size=512,512 \
  --screenshot="$TMP/icon-512.png" "file://$TMP/page.html" 2>/dev/null
mkdir -p "$ROOT/docs/icons"
cp "$TMP/icon-512.png" "$ROOT/docs/icons/icon-512.png"
for s in 192 180; do sips -Z $s "$TMP/icon-512.png" --out "$ROOT/docs/icons/icon-$s.png" >/dev/null; done
ls "$ROOT/docs/icons"
