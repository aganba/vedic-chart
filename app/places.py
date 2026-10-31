"""Offline place autocomplete over GeoNames (cities with population >= 1000).

Data: https://download.geonames.org/export/dump/ (CC BY 4.0) in data/:
cities1000.txt, admin1CodesASCII.txt, countryInfo.txt.
"""
from __future__ import annotations

import bisect
import math
import threading
import unicodedata
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"
_lock = threading.Lock()
_index: tuple[list[str], list[int], list[dict]] | None = None


def normalize(s: str) -> str:
    s = unicodedata.normalize("NFKD", s)
    s = "".join(ch for ch in s if not unicodedata.combining(ch)).lower()
    return " ".join("".join(ch if ch.isalnum() else " " for ch in s).split())


def _load() -> tuple[list[str], list[int], list[dict]]:
    countries = {}
    for line in (DATA / "countryInfo.txt").read_text(encoding="utf-8").splitlines():
        if line and not line.startswith("#"):
            cols = line.split("\t")
            countries[cols[0]] = cols[4]
    admin1 = {}
    for line in (DATA / "admin1CodesASCII.txt").read_text(encoding="utf-8").splitlines():
        cols = line.split("\t")
        if len(cols) >= 2:
            admin1[cols[0]] = cols[1]

    places, pairs = [], []
    with open(DATA / "cities1000.txt", encoding="utf-8") as f:
        for line in f:
            c = line.rstrip("\n").split("\t")
            name, ascii_name, alternates = c[1], c[2], c[3]
            region = admin1.get(f"{c[8]}.{c[10]}", "")
            country = countries.get(c[8], c[8])
            label = ", ".join(x for x in (name, region, country) if x)
            idx = len(places)
            places.append({"name": label, "city": name, "lat": float(c[4]), "lon": float(c[5]),
                           "population": int(c[14] or 0), "region": normalize(f"{region} {country}")})
            keys = {normalize(name), normalize(ascii_name)}
            for alt in alternates.split(","):
                # Skip codes (BLR), links and non-Latin scripts the user wouldn't type.
                if len(alt) >= 3 and alt.isascii() and not alt.isupper() and "http" not in alt \
                        and not any(ch.isdigit() for ch in alt):
                    keys.add(normalize(alt))
            pairs.extend((k, idx) for k in keys if k)
    pairs.sort()
    return [k for k, _ in pairs], [i for _, i in pairs], places


def _get_index():
    global _index
    with _lock:
        if _index is None:
            _index = _load()
        return _index


def preload() -> None:
    threading.Thread(target=_get_index, daemon=True).start()


def search(query: str, limit: int = 8) -> list[dict]:
    """Prefix search on place names (and alternate names). Extra
    comma-separated parts narrow by state/country, e.g. "salem, tamil"."""
    parts = [normalize(p) for p in query.split(",")]
    head, filters = parts[0], [p for p in parts[1:] if p]
    if len(head) < 2:
        return []
    keys, ids, places = _get_index()
    lo = bisect.bisect_left(keys, head)
    hi = bisect.bisect_left(keys, head + "￿")
    # Shortest matching key per place (prefers "bangalore" over "bang galloleu").
    best: dict[int, str] = {}
    for i in range(lo, hi):
        if ids[i] not in best or len(keys[i]) < len(best[ids[i]]):
            best[ids[i]] = keys[i]

    def score(i: int) -> float:
        primary = normalize(places[i]["city"]).startswith(head)
        exact = best[i] == head or normalize(places[i]["city"]) == head
        return math.log10(places[i]["population"] + 10) + primary + exact

    matches = [i for i in best if all(f in places[i]["region"] for f in filters)]
    matches.sort(key=score, reverse=True)
    out = []
    for i in matches[:limit]:
        p = places[i]
        # Show the old/alternate name only when it's exactly what was typed.
        via_alias = not normalize(p["city"]).startswith(head) and best[i] == head
        out.append({"name": p["name"], "lat": p["lat"], "lon": p["lon"],
                    "also": query.split(",")[0].strip().title() if via_alias else None})
    return out
