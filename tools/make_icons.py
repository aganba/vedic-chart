"""Draw the app icon (a South Indian chart grid) as PNGs in docs/icons/.
Run with any Python that has Pillow:  python3 tools/make_icons.py"""
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "docs" / "icons"
BG, LINE, MARK = (122, 46, 18), (246, 225, 200), (255, 180, 120)


def icon(size: int) -> Image.Image:
    img = Image.new("RGB", (size, size), BG)
    d = ImageDraw.Draw(img)
    m, w = size * 0.18, max(2, round(size * 0.035))
    cell = (size - 2 * m) / 4
    edges = [m + i * cell for i in range(5)]
    for i, p in enumerate(edges):
        inner = 0 < i < 4
        # outer lines span the grid; inner lines skip the merged centre
        for a, b in ((edges[0], edges[1]), (edges[3], edges[4])) if inner else ((edges[0], edges[4]),):
            d.line([(p, a), (p, b)], fill=LINE, width=w)
            d.line([(a, p), (b, p)], fill=LINE, width=w)
    d.line([(edges[1], edges[1]), (edges[3], edges[1])], fill=LINE, width=w)
    d.line([(edges[1], edges[3]), (edges[3], edges[3])], fill=LINE, width=w)
    d.line([(edges[1], edges[1]), (edges[1], edges[3])], fill=LINE, width=w)
    d.line([(edges[3], edges[1]), (edges[3], edges[3])], fill=LINE, width=w)
    # lagna mark in the Gemini (top-right) cell
    d.line([(edges[3], edges[0] + cell * 0.35), (edges[3] + cell * 0.35, edges[0])], fill=MARK, width=w)
    return img


OUT.mkdir(parents=True, exist_ok=True)
for s in (180, 192, 512):
    icon(s).save(OUT / f"icon-{s}.png")
print("icons written to", OUT)
