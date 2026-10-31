"""Generate docs/ganesha.svg: an abstract Ganesha built from Om, drawn as white
calligraphic brush strokes on a painted colour-block background.

Each stroke is a centre line (cubic Béziers) plus a width profile; the outline
is computed by offsetting the centre line along its normals, so strokes swell
and taper like a brush. Run:  python3 tools/make_emblem.py
"""
import math
import random
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "docs" / "ganesha.svg"
rng = random.Random(108)

# Centre lines in a 100x100 design space: lists of cubic segments (p0, c1, c2, p1).
STROKES = [
    # ears
    ("ear", [((27, 31), (10, 22), (-1, 48), (10, 61)), ((10, 61), (15, 67), (23, 66), (27, 61))], [(0, .8), (.45, 5.2), (1, .8)]),
    ("ear", [((73, 31), (90, 22), (101, 48), (90, 61)), ((90, 61), (86, 65.5), (80, 65.5), (76.5, 62))], [(0, .8), (.45, 5.2), (1, .8)]),
    # Om upper bowl (forehead)
    ("om", [((30, 31), (37, 21), (55, 22), (54, 35)), ((54, 35), (53, 44), (44, 47), (38, 47))], [(0, 1), (.35, 6.5), (.8, 4), (1, 2.2)]),
    # Om lower bowl (cheek)
    ("om", [((38, 47), (57, 46), (63, 61), (54, 70)), ((54, 70), (46, 78), (31, 75), (27, 65))], [(0, 2.2), (.4, 7.5), (1, .9)]),
    # Om tail as the trunk, ending in a curl
    ("om", [((49, 47.5), (62, 45), (73, 51), (71, 63)), ((71, 63), (69.5, 72), (61, 77), (63, 84)),
            ((63, 84), (64.5, 89), (71, 89), (71.5, 84))], [(0, 3), (.3, 6.5), (.75, 3.5), (1, .9)]),
    # tusk
    ("om", [((57.5, 55.5), (59.5, 57), (61.5, 58.5), (64, 60.5))], [(0, 3.4), (1, .6)]),
    # chandrabindu crescent (crown)
    ("om", [((55, 17.5), (61, 24.5), (71, 24.5), (78, 15.5))], [(0, .8), (.5, 4.6), (1, .8)]),
]
DOTS = [(66.5, 9.2, 3.3), (44, 33, 2.6)]  # chandrabindu dot, eye

# Painted background: (x, y, w, h, colour, opacity), my own arrangement.
BLOCKS = [
    (0, 0, 100, 100, "#3b1020", 1),
    (0, 0, 46, 38, "#a2311c", .95), (40, 0, 34, 30, "#d06a1f", .9), (70, 0, 30, 46, "#2c2b6e", .95),
    (0, 34, 30, 40, "#1f5a4a", .9), (26, 30, 48, 34, "#7a1830", .9), (68, 42, 32, 30, "#c9452a", .9),
    (0, 70, 42, 30, "#e0a33a", .85), (38, 62, 34, 38, "#4a2a6a", .9), (66, 68, 34, 32, "#a8571f", .9),
    (18, 18, 20, 22, "#e08a2c", .45), (56, 48, 22, 26, "#e0b040", .35), (8, 52, 26, 16, "#b8302a", .4),
]


def bezier(seg, t):
    (x0, y0), (x1, y1), (x2, y2), (x3, y3) = seg
    u = 1 - t
    x = u**3 * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t**3 * x3
    y = u**3 * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t**3 * y3
    return x, y


def sample(segments, per_seg=40):
    pts = []
    for i, seg in enumerate(segments):
        for k in range(per_seg + (1 if i == len(segments) - 1 else 0)):
            pts.append(bezier(seg, k / per_seg))
    return pts


def width_at(profile, t):
    for (t0, w0), (t1, w1) in zip(profile, profile[1:]):
        if t0 <= t <= t1:
            f = (t - t0) / (t1 - t0) if t1 > t0 else 0
            f = f * f * (3 - 2 * f)  # smoothstep for a natural swell
            return w0 + (w1 - w0) * f
    return profile[-1][1]


def outline(segments, profile):
    pts = sample(segments)
    # cumulative length for a uniform width parameter
    lengths = [0.0]
    for a, b in zip(pts, pts[1:]):
        lengths.append(lengths[-1] + math.dist(a, b))
    total = lengths[-1]
    left, right = [], []
    jitter = [rng.uniform(-.18, .18) for _ in pts]
    for i, (x, y) in enumerate(pts):
        a, b = pts[max(i - 1, 0)], pts[min(i + 1, len(pts) - 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        n = math.hypot(dx, dy) or 1
        nx, ny = -dy / n, dx / n
        w = max(.35, width_at(profile, lengths[i] / total) * (1 + jitter[i] * .5)) / 2
        left.append((x + nx * w, y + ny * w))
        right.append((x - nx * w, y - ny * w))
    poly = left + right[::-1]
    return "M" + " L".join(f"{x:.2f} {y:.2f}" for x, y in poly) + "Z"


def main() -> None:
    parts = [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="Om Ganesha">',
        '<defs><clipPath id="c"><rect width="100" height="100" rx="16"/></clipPath>',
        '<radialGradient id="v" cx="50%" cy="48%" r="62%"><stop offset="55%" stop-color="#000" stop-opacity="0"/>'
        '<stop offset="100%" stop-color="#000" stop-opacity=".45"/></radialGradient>',
        # streaky noise suggesting brushwork on canvas
        '<filter id="t" x="0" y="0" width="100%" height="100%">'
        '<feTurbulence type="fractalNoise" baseFrequency=".035 .6" numOctaves="3" seed="7"/>'
        '<feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.6 1.05"/></filter></defs>',
        '<g clip-path="url(#c)">',
    ]
    for x, y, w, h, colour, op in BLOCKS:
        parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{colour}" opacity="{op}"/>')
    parts.append('<rect width="100" height="100" filter="url(#t)" opacity=".38"/>')
    parts.append('<rect width="100" height="100" fill="url(#v)"/></g>')
    # artwork scaled into the frame with a margin
    parts.append('<g transform="translate(9 9) scale(.82)" fill="#fbf4e8" stroke="#fbf4e8" stroke-width=".5" stroke-linejoin="round">')
    for kind, segs, profile in STROKES:
        op = ' opacity=".92"' if kind == "ear" else ""
        parts.append(f'<path d="{outline(segs, profile)}"{op}/>')
    for cx, cy, r in DOTS:
        parts.append(f'<circle cx="{cx}" cy="{cy}" r="{r}"/>')
    parts.append("</g></svg>")
    OUT.write_text("\n".join(parts) + "\n")
    print(f"wrote {OUT} ({OUT.stat().st_size / 1024:.1f} KB)")


if __name__ == "__main__":
    main()
