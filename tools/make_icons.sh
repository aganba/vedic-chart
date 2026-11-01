#!/bin/sh
# Render the app's images from docs/ganesha.svg, in a light saffron on the
# theme's deep maroon:
#   icons/icon-512|192|180.png  home-screen icons, square (phones apply their own mask)
#   favicon.svg, favicon.ico    browser-tab icon, a rounded tile (.ico holds 16, 32, 48 px)
#   og-image.png                1200x630 banner shown when the link is shared
# Needs Google Chrome, macOS sips, and Python with Pillow.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOCS="$ROOT/docs"
TMP="$(mktemp -d)"
MAROON="#7a2e12"
SAFFRON="#f6dcc0"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

shot() {  # shot <html> <png> <width> <height>
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --user-data-dir="$TMP/chrome" \
    --window-size="$3,$4" --screenshot="$2" "file://$1" 2>/dev/null
}

# The emblem's shapes, without the outer <svg> element.
sed -e '1d' -e '$d' "$DOCS/ganesha.svg" > "$TMP/shapes.svg"

# Home-screen icons
{
  printf '<html><body style="margin:0;width:512px;height:512px;background:%s;display:flex;' "$MAROON"
  printf 'align-items:center;justify-content:center;color:%s">' "$SAFFRON"
  sed 's/<svg /<svg width="340" height="381" /' "$DOCS/ganesha.svg"
  printf '</body></html>'
} > "$TMP/icon.html"
shot "$TMP/icon.html" "$TMP/icon-512.png" 512 512
mkdir -p "$DOCS/icons"
cp "$TMP/icon-512.png" "$DOCS/icons/icon-512.png"
for s in 192 180; do sips -Z $s "$TMP/icon-512.png" --out "$DOCS/icons/icon-$s.png" >/dev/null; done

# Browser-tab icon: the emblem fills more of the tile than on the home-screen
# icon, and its strokes are thickened, so it stays recognisable at 16 px.
{
  printf '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 112 112">\n'
  printf '<rect width="112" height="112" rx="22" fill="%s"/>\n' "$MAROON"
  printf '<g fill="%s" stroke="%s" stroke-width="2.4" stroke-linejoin="round" transform="translate(12.5 7) scale(0.87)">\n' "$SAFFRON" "$SAFFRON"
  cat "$TMP/shapes.svg"
  printf '</g>\n</svg>\n'
} > "$DOCS/favicon.svg"
printf '<html><body style="margin:0;background:transparent"><img src="%s" width="256" height="256"></body></html>' \
  "$DOCS/favicon.svg" > "$TMP/favicon.html"
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --user-data-dir="$TMP/chrome" \
  --default-background-color=00000000 --window-size=256,256 \
  --screenshot="$TMP/favicon-256.png" "file://$TMP/favicon.html" 2>/dev/null
python3 -c "
from PIL import Image
im = Image.open('$TMP/favicon-256.png').convert('RGBA')
im.save('$DOCS/favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])
"

# Share banner
{
  printf '<html><body style="margin:0;width:1200px;height:630px;background:%s;color:%s;' "$MAROON" "$SAFFRON"
  printf 'display:flex;align-items:center;gap:64px;padding:0 90px;box-sizing:border-box;'
  printf 'font-family:-apple-system,BlinkMacSystemFont,sans-serif">'
  sed 's/<svg /<svg width="300" height="336" style="flex:none" /' "$DOCS/ganesha.svg"
  printf '<div>'
  printf '<div style="font-size:88px;font-weight:700;letter-spacing:-1px;line-height:1">Vedic Chart</div>'
  printf '<div style="font-size:40px;font-weight:600;margin-top:14px;opacity:.85">வேத ஜாதகம்</div>'
  printf '<div style="font-size:34px;line-height:1.45;margin-top:40px">Panchangam · Tamil calendar<br>Festivals · Muhurtham<br>Birth charts · Dasha</div>'
  printf '<div style="font-size:26px;margin-top:36px;opacity:.75">Free · works offline · English &amp; தமிழ்</div>'
  printf '</div></body></html>'
} > "$TMP/og.html"
shot "$TMP/og.html" "$DOCS/og-image.png" 1200 630

ls "$DOCS/icons" "$DOCS/favicon.svg" "$DOCS/favicon.ico" "$DOCS/og-image.png"
