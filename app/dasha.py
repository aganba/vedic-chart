"""Vimshottari dasha: mahadashas and antardashas (bhuktis).

A dasha year is measured by the Sun's sidereal motion: t years after birth is
the moment the Sun has moved t × 360° from its birth longitude. This matches
JHora's dates exactly (81/81 against a JHora printout); a fixed 365.24-day
year drifts by up to 4 days.
"""
from __future__ import annotations

import swisseph as swe

from .astro import NAK_SPAN, local_from_julday, planet_lon, wrap180

LORDS = ["ketu", "venus", "sun", "moon", "mars", "rahu", "jupiter", "saturn", "mercury"]
NAMES = {"ketu": "Ketu", "venus": "Venus", "sun": "Sun", "moon": "Moon", "mars": "Mars",
         "rahu": "Rahu", "jupiter": "Jupiter", "saturn": "Saturn", "mercury": "Mercury"}
YEARS = {"ketu": 7, "venus": 20, "sun": 6, "moon": 10, "mars": 7, "rahu": 18,
         "jupiter": 16, "saturn": 19, "mercury": 17}
TOTAL_YEARS = 120


def _solar_time(jd_birth: float, sun_birth: float, years: float) -> float:
    """Julian day when the Sun has advanced `years` × 360° since birth."""
    target = (sun_birth + years * 360) % 360
    jd = jd_birth + years * 365.2564
    for _ in range(30):
        d = wrap180(planet_lon(jd, swe.SUN)[0] - target)
        if abs(d) < 1e-8:
            break
        jd -= d / 0.9856
    return jd


def vimshottari(jd_birth: float, moon_lon: float, offset_hours: float) -> dict:
    """Mahadashas covering 120 years from the one running at birth, each with
    its nine antardashas. Dates are local (birth time zone) ISO strings.
    Requires the sidereal mode to be set (call inside astro's lock)."""
    nak = int(moon_lon // NAK_SPAN)
    elapsed = (moon_lon - nak * NAK_SPAN) / NAK_SPAN
    first = nak % 9
    sun_birth = planet_lon(jd_birth, swe.SUN)[0]
    when = lambda years: local_from_julday(_solar_time(jd_birth, sun_birth, years), offset_hours).isoformat()

    periods = []
    t = -elapsed * YEARS[LORDS[first]]  # years from birth to the first mahadasha's start
    for i in range(9):
        lord = LORDS[(first + i) % 9]
        length = YEARS[lord]
        sub, s = [], t
        for j in range(9):
            sub_lord = LORDS[(first + i + j) % 9]
            sub_len = length * YEARS[sub_lord] / TOTAL_YEARS
            sub.append({"lord": sub_lord, "name": NAMES[sub_lord], "start": when(s), "end": when(s + sub_len)})
            s += sub_len
        periods.append({"lord": lord, "name": NAMES[lord], "years": length,
                        "start": when(t), "end": when(t + length), "antardashas": sub})
        t += length
    return {"balance_years": (1 - elapsed) * YEARS[LORDS[first]], "mahadashas": periods}
