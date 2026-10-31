"""Generate docs/ganesha.svg: an abstract seated Ganesha built from Om, drawn as
calligraphic brush strokes in the page's accent colour (currentColor).

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
    # crown: three tiered arches and a flame finial
    [((36, 26), (43, 18), (57, 18), (64, 26))], [(0, .8), (.5, 4.2), (1, .8)],
    [((40.5, 19), (45.5, 13), (54.5, 13), (59.5, 19))], [(0, .7), (.5, 3.4), (1, .7)],
    [((44.5, 12.5), (47.5, 9), (52.5, 9), (55.5, 12.5))], [(0, .6), (.5, 2.6), (1, .6)],
    [((50, 8.5), (49, 6), (51, 4), (50, 1.5))], [(0, 2.2), (1, .4)],
    # ears (front-facing, symmetrical)
    [((36, 26), (20, 20), (12, 37), (21, 47)), ((21, 47), (25, 52), (31, 50), (33, 45)), ((33, 45), (34, 41.5), (30, 39.5), (29, 42.5))], [(0, .8), (.38, 5.5), (.8, 2.2), (1, .6)],
    [((64, 26), (80, 20), (88, 37), (79, 47)), ((79, 47), (75, 52), (69, 50), (67, 45)), ((67, 45), (66, 41.5), (70, 39.5), (71, 42.5))], [(0, .8), (.38, 5.5), (.8, 2.2), (1, .6)],
    # tilak and eyes
    [((50, 26.5), (50, 28), (50, 30), (50, 32))], [(0, .5), (.5, 2.2), (1, .5)],
    [((42, 37), (43.5, 35.5), (45.5, 35.5), (47, 37))], [(0, .4), (.5, 1.9), (1, .4)],
    [((58, 37), (56.5, 35.5), (54.5, 35.5), (53, 37))], [(0, .4), (.5, 1.9), (1, .4)],
    # trunk, flowing down through the Om and ending as its curling tail
    [((50, 38), (50, 46), (51, 52), (54, 57)), ((54, 57), (60, 64), (70, 66), (69, 78)),
     ((69, 78), (68, 88), (58, 92), (60, 99)), ((60, 99), (61.5, 104), (68, 104), (68, 99))],
    [(0, 3), (.3, 5.2), (.72, 3), (1, .8)],
    # Om "3" forming the body: upper bowl, lower bowl, and the stroke joining the trunk
    [((26, 52), (32, 43), (48, 45), (46, 56)), ((46, 56), (45, 63), (38, 65), (33, 65))], [(0, 1), (.35, 6), (.85, 3.5), (1, 2.2)],
    [((33, 65), (52, 64), (58, 80), (48, 90)), ((48, 90), (40, 98), (26, 95), (22, 86))], [(0, 2.2), (.4, 7), (1, .9)],
    [((40, 64.5), (46, 63), (51, 62), (55, 59.5))], [(0, 2.6), (1, 4)],
    # chandrabindu as a raised hand with a modak
    [((77, 66), (80.5, 72), (88, 72), (92, 65))], [(0, .8), (.5, 3.6), (1, .8)],
    # lotus seat
    [((20, 105), (40, 110.5), (64, 110.5), (84, 104.5))], [(0, .8), (.5, 3.4), (1, .8)],
]
STROKES = list(zip(STROKES[::2], STROKES[1::2]))
DOTS = [(84.5, 60, 2.7)]  # modak

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
