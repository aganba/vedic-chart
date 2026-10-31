"""Check the browser (JavaScript) calculations against the Python reference.

Runs both implementations on the same public test charts and compares every
field: numbers to within TOL, everything else exactly.
Usage: .venv/bin/python tools/parity.py      (also run by tests/test_parity.py)
"""
import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from app import astro  # noqa: E402

TOL = 1e-6
CASES = [  # public places and dates only
    {"date": "2000-01-01", "time": "06:30:00", "offset": 5.5, "lat": 13.0878, "lon": 80.2785, "ayanamsa": "true_chitra", "bhava": "equal_mid"},
    {"date": "1947-08-15", "time": "00:00:00", "offset": 5.5, "lat": 28.6139, "lon": 77.2090, "ayanamsa": "lahiri", "bhava": "sripati"},
    {"date": "1975-07-04", "time": "12:00:00", "offset": -4, "lat": 40.7128, "lon": -74.0060, "ayanamsa": "lahiri", "bhava": "placidus"},
    {"date": "1944-06-15", "time": "03:00:00", "offset": 2, "lat": 51.5074, "lon": -0.1278, "ayanamsa": "raman", "bhava": "sripati"},
    {"date": "2015-03-21", "time": "18:45:00", "offset": 11, "lat": -33.8688, "lon": 151.2093, "ayanamsa": "kp", "bhava": "placidus"},
    {"date": "2020-12-21", "time": "12:00:00", "offset": 0, "lat": 64.1466, "lon": -21.9426, "ayanamsa": "true_chitra", "bhava": "placidus"},
    {"date": "2021-06-21", "time": "12:00:00", "offset": 2, "lat": 69.6492, "lon": 18.9553, "ayanamsa": "true_chitra", "bhava": "equal_mid"},
    {"date": "1990-11-30", "time": "23:59:59", "offset": -3, "lat": -34.6037, "lon": -58.3816, "ayanamsa": "true_chitra", "bhava": "equal_mid"},
    {"date": "1900-02-28", "time": "05:00:00", "offset": -10.5, "lat": 21.3069, "lon": -157.8583, "ayanamsa": "lahiri", "bhava": "equal_mid"},
    {"date": "2010-05-05", "time": "14:20:00", "offset": 5.75, "lat": 27.7172, "lon": 85.3240, "ayanamsa": "true_chitra", "bhava": "sripati"},
]


def python_results():
    out = []
    for c in CASES:
        dt = datetime.fromisoformat(f"{c['date']}T{c['time']}")
        out.append(astro.compute_chart(dt, c["offset"], c["lat"], c["lon"], c["ayanamsa"], c["bhava"]))
    return json.loads(json.dumps(out))  # tuples -> lists, as JSON would


def js_results():
    proc = subprocess.run(["node", str(ROOT / "tools" / "parity.mjs")], input=json.dumps(CASES),
                          capture_output=True, text=True, check=True)
    return json.loads(proc.stdout)


def diff(a, b, path="", out=None):
    out = [] if out is None else out
    if isinstance(a, dict) and isinstance(b, dict):
        for k in sorted(set(a) | set(b)):
            if k not in a or k not in b:
                out.append(f"{path}.{k}: missing on {'python' if k not in a else 'js'} side")
            else:
                diff(a[k], b[k], f"{path}.{k}", out)
    elif isinstance(a, list) and isinstance(b, list):
        if len(a) != len(b):
            out.append(f"{path}: length {len(a)} != {len(b)}")
        for i, (x, y) in enumerate(zip(a, b)):
            diff(x, y, f"{path}[{i}]", out)
    elif isinstance(a, bool) or isinstance(b, bool):
        if a != b:
            out.append(f"{path}: {a!r} != {b!r}")
    elif isinstance(a, (int, float)) and isinstance(b, (int, float)):
        if abs(a - b) > TOL:
            out.append(f"{path}: {a!r} != {b!r}")
    elif a != b:
        out.append(f"{path}: {a!r} != {b!r}")
    return out


def main() -> int:
    py, js = python_results(), js_results()
    problems = []
    for i, (a, b) in enumerate(zip(py, js)):
        problems += diff(a, b, f"case{i}")
    for p in problems[:40]:
        print(p)
    print(f"{len(CASES)} charts compared, {len(problems)} differences")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
