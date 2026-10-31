#!/bin/sh
# Render the home-screen icons from docs/ganesha.svg (square, no rounded
# corners; phones apply their own mask). Needs Google Chrome and macOS sips.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
sed 's/rx="16"/rx="0"/' "$ROOT/docs/ganesha.svg" > "$TMP/square.svg"
printf '<html><body style="margin:0"><img src="square.svg" width="512" height="512"></body></html>' > "$TMP/page.html"
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
  --allow-file-access-from-files --user-data-dir="$TMP/chrome" --window-size=512,512 \
  --screenshot="$TMP/icon-512.png" "file://$TMP/page.html" 2>/dev/null
mkdir -p "$ROOT/docs/icons"
cp "$TMP/icon-512.png" "$ROOT/docs/icons/icon-512.png"
for s in 192 180; do sips -Z $s "$TMP/icon-512.png" --out "$ROOT/docs/icons/icon-$s.png" >/dev/null; done
ls -la "$ROOT/docs/icons"
