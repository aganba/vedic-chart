"""Generate docs/ganesha.svg: an abstract seated Ganesha reduced to a few
calligraphic brush strokes (crown, ears, trunk, belly, a raised abhaya hand
and a hand holding a modaka, folded legs, seat), with the Om only
suggested by a chandrabindu tilak. Drawn in currentColor.

Each stroke is a centre line (cubic Béziers) plus a width profile; the outline
is computed by offsetting the centre line along its normals, so strokes swell
and taper like a brush. Run:  python3 tools/make_emblem.py
"""
import math
import random
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "docs" / "ganesha.svg"
rng = random.Random(108)

# Centre lines in a 100x112 design space: lists of cubic segments (p0, c1, c2, p1),
# each with a width profile [(t, width), ...] along its length.
VIEW_W, VIEW_H = 100, 112
STROKES = [
    # pointed crown: two sides meeting at the top, and its base band
    [((40, 23), (42, 16), (46, 12), (50, 7))], [(0, 3.6), (1, .6)],
    [((60, 23), (58, 16), (54, 12), (50, 7))], [(0, 3.6), (1, .6)],
    [((38, 25.5), (45, 22.5), (55, 22.5), (62, 25.5))], [(0, .8), (.5, 3), (1, .8)],
    # broad ears
    [((38, 27), (22, 20), (10, 36), (16, 50)), ((16, 50), (20, 58), (30, 58), (34, 50))], [(0, .8), (.4, 6.5), (1, 1.2)],
    [((62, 27), (78, 20), (90, 36), (84, 50)), ((84, 50), (80, 58), (70, 58), (66, 50))], [(0, .8), (.4, 6.5), (1, 1.2)],
    # tilak as a small chandrabindu: the only direct hint of the Om
    [((47, 29.5), (48.5, 31.5), (51.5, 31.5), (53, 29.5))], [(0, .4), (.5, 1.7), (1, .4)],
    # trunk: one bold curve down onto the belly, ending in a curl
    [((50, 34), (51, 46), (46, 52), (44, 60)), ((44, 60), (42, 68), (48, 74), (56, 74)),
     ((56, 74), (64, 74), (66, 66), (60, 64)), ((60, 64), (56, 63), (55, 68), (58, 69))],
    [(0, 5.5), (.35, 4.8), (.75, 2.2), (1, .7)],
    # tusk
    [((55, 42), (57, 44), (58.5, 46), (59.5, 49))], [(0, 2.6), (1, .5)],
    # full belly
    [((36, 56), (22, 64), (22, 88), (40, 94))], [(0, .8), (.5, 7), (1, 2)],
    [((64, 58), (80, 66), (80, 88), (62, 94))], [(0, .8), (.5, 6), (1, 2)],
    # right hand (viewer's left) raised in abhaya: three bold fingers and a palm
    # curving out into the thumb; no forearm, matching the weight of the ears
    [((10.6, 70), (10.4, 66), (10.3, 62), (10.4, 59.4))], [(0, 3.6), (1, 3.2)],
    [((14.2, 70), (14.2, 65.5), (14.2, 61.5), (14.3, 57.6))], [(0, 3.7), (1, 3.3)],
    [((17.8, 70), (18, 66), (18.1, 62), (18.2, 59.4))], [(0, 3.6), (1, 3.2)],
    [((6, 63.5), (6.4, 71.5), (9.5, 77.5), (13.8, 77.5)), ((13.8, 77.5), (18.5, 77.5), (21, 74.5), (20.6, 69.5))],
    [(0, 1.2), (.3, 5.2), (.75, 4.6), (1, 3)],
    # left hand (viewer's right) cupped beneath a modaka; the trunk curls towards it
    [((79.5, 73), (80.5, 80.5), (92.5, 80.5), (93.5, 73))], [(0, 1.2), (.5, 5.2), (1, 1.2)],
    [((86.5, 64.5), (86.5, 63), (86.5, 61.8), (86.6, 60.2))], [(0, 2.8), (1, .7)],
    # legs folded and crossed: each thigh runs out to the knee and the shin
    # tucks back under the belly, the feet crossing at the centre
    [((36, 93), (22, 93), (11, 99), (19, 102.5)), ((19, 102.5), (29, 106), (46, 104), (60, 99.5))],
    [(0, 2), (.3, 5.5), (.75, 3.6), (1, 1)],
    [((64, 93), (78, 93), (89, 99), (81, 102.5)), ((81, 102.5), (71, 106), (54, 104), (40, 99.5))],
    [(0, 2), (.3, 5.5), (.75, 3.6), (1, 1)],
    # lotus seat
    [((22, 108), (40, 111.5), (60, 111.5), (78, 108))], [(0, .6), (.5, 2.4), (1, .6)],
]
STROKES = list(zip(STROKES[::2], STROKES[1::2]))
DOTS = [(10.4, 59.4, 1.6), (14.3, 57.6, 1.65), (18.2, 59.4, 1.6), (86.5, 69.2, 5.2), (50, 4.2, 1.7), (43, 36.5, 1.6), (57, 36.5, 1.6), (50, 27.4, 1.0)]  # fingertips, modaka, finial, eyes, chandrabindu dot

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
    jitter = [rng.uniform(-.06, .06) for _ in pts]
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
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VIEW_W} {VIEW_H}" role="img" '
             'aria-label="Om Ganesha" fill="currentColor">']
    for segs, profile in STROKES:
        parts.append(f'<path d="{outline(segs, profile)}"/>')
    for cx, cy, r in DOTS:
        parts.append(f'<circle cx="{cx}" cy="{cy}" r="{r}"/>')
    parts.append("</svg>")
    OUT.write_text("\n".join(parts) + "\n")
    print(f"wrote {OUT} ({OUT.stat().st_size / 1024:.1f} KB)")


if __name__ == "__main__":
    main()
