"""Shadbala (six-fold planetary strength) per Brihat Parashara Hora Shastra,
following Jagannatha Hora's conventions. All values are in virupas
(shashtiamsas); 60 virupas = 1 rupa.
"""
from __future__ import annotations

import math

import swisseph as swe

PLANETS7 = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"]
PID = {"sun": swe.SUN, "moon": swe.MOON, "mars": swe.MARS, "mercury": swe.MERCURY,
       "jupiter": swe.JUPITER, "venus": swe.VENUS, "saturn": swe.SATURN}

# Deep exaltation points (sidereal longitude).
EXALTATION = {"sun": 10, "moon": 33, "mars": 298, "mercury": 165, "jupiter": 95, "venus": 357, "saturn": 200}
# Moolatrikona sign and degree range within it.
MOOLATRIKONA = {"sun": (4, 0, 20), "moon": (1, 3, 30), "mars": (0, 0, 12), "mercury": (5, 15, 20),
                "jupiter": (8, 0, 10), "venus": (6, 0, 15), "saturn": (10, 0, 20)}
SIGN_LORD = ["mars", "venus", "mercury", "moon", "sun", "mercury",
             "venus", "mars", "jupiter", "saturn", "saturn", "jupiter"]
# Natural relationships: friends, enemies (the rest are neutral).
NATURAL = {
    "sun": ({"moon", "mars", "jupiter"}, {"venus", "saturn"}),
    "moon": ({"sun", "mercury"}, set()),
    "mars": ({"sun", "moon", "jupiter"}, {"mercury"}),
    "mercury": ({"sun", "venus"}, {"moon"}),
    "jupiter": ({"sun", "moon", "mars"}, {"mercury", "venus"}),
    "venus": ({"mercury", "saturn"}, {"sun", "moon"}),
    "saturn": ({"mercury", "venus"}, {"sun", "moon", "mars"}),
}
# Saptavargaja points by compound relationship.
VARGA_POINTS = {"mt": 45, "own": 30, "great_friend": 22.5, "friend": 15, "neutral": 7.5,
                "enemy": 3.75, "great_enemy": 1.875}

MALE, NEUTER, FEMALE = {"sun", "mars", "jupiter"}, {"mercury", "saturn"}, {"moon", "venus"}
# Dig bala: house (1/4/7/10) where each planet is strongest.
DIG_STRONG = {"sun": 10, "mars": 10, "jupiter": 1, "mercury": 1, "moon": 4, "venus": 4, "saturn": 7}
NAISARGIKA = {"sun": 60.0, "moon": 51.43, "venus": 42.86, "jupiter": 34.29,
              "mercury": 25.71, "mars": 17.14, "saturn": 8.57}
# Minimum required Shadbala in rupas, as used by JHora for "% strength".
REQUIRED = {"sun": 5.0, "moon": 6.0, "mars": 5.0, "mercury": 7.0, "jupiter": 6.5, "venus": 5.5, "saturn": 5.0}

WEEKDAY_LORD = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"]
CHALDEAN = ["saturn", "jupiter", "mars", "sun", "venus", "mercury", "moon"]

# Surya Siddhanta: revolutions per mahayuga, with bija corrections, for mean
# planets and sighrocchas (Cheshta bala).
SS_DAYS = 1577917828
SS_REV = {"sun": 4320000, "mars": 2296832, "mercury": 17937060 + 16, "jupiter": 364220 - 8,
          "venus": 7022376 - 12, "saturn": 146568 + 8}
KALI_EPOCH_JD = 588465.5 - 75.77 / 360  # midnight at Ujjain, 18 Feb 3102 BCE
KALI_EPOCH_JDN = 588466                 # a Friday


def _w180(x: float) -> float:
    return (x + 180.0) % 360.0 - 180.0


def _sign(lon: float) -> int:
    return int(lon // 30) % 12


# ---------- divisional charts used by Saptavargaja bala ----------

def _varga_signs(lon: float) -> dict[str, int]:
    s, d = _sign(lon), lon % 30
    odd = s % 2 == 0  # Aries (index 0) is an odd sign
    hora = (4 if d < 15 else 3) if odd else (3 if d < 15 else 4)  # Leo / Cancer
    drekkana = (s + 4 * int(d // 10)) % 12
    saptamsa = ((s if odd else s + 6) + int(d * 7 // 30)) % 12
    navamsa = int(lon * 9 // 30) % 12
    dwadasamsa = (s + int(d * 12 // 30)) % 12
    if odd:
        trimsamsa = 0 if d < 5 else 10 if d < 10 else 8 if d < 18 else 2 if d < 25 else 6
    else:
        trimsamsa = 1 if d < 5 else 5 if d < 12 else 11 if d < 20 else 9 if d < 25 else 7
    return {"D1": s, "D2": hora, "D3": drekkana, "D7": saptamsa, "D9": navamsa,
            "D12": dwadasamsa, "D30": trimsamsa}


def _compound_relation(p: str, other: str, rasi: dict[str, int]) -> str:
    friends, enemies = NATURAL[p]
    natural = 1 if other in friends else -1 if other in enemies else 0
    temporal = 1 if (rasi[other] - rasi[p]) % 12 in (1, 2, 3, 9, 10, 11) else -1
    return {2: "great_friend", 1: "friend", 0: "neutral", -1: "enemy", -2: "great_enemy"}[natural + temporal]


def saptavargaja(p: str, lons: dict[str, float]) -> float:
    rasi = {q: _sign(lons[q]) for q in PLANETS7}
    total = 0.0
    for varga, sign in _varga_signs(lons[p]).items():
        lord = SIGN_LORD[sign]
        mt_sign, lo, hi = MOOLATRIKONA[p]
        if varga == "D1" and sign == mt_sign and lo <= lons[p] % 30 < hi:
            total += VARGA_POINTS["mt"]
        elif lord == p:
            total += VARGA_POINTS["own"]
        else:
            total += VARGA_POINTS[_compound_relation(p, lord, rasi)]
    return total


# ---------- the six balas ----------

def uchcha(p: str, lon: float) -> float:
    return abs(_w180(lon - (EXALTATION[p] + 180))) / 3


def ojayugma(p: str, lon: float) -> float:
    want_even = p in ("moon", "venus")
    pts = 0.0
    for sign in (_sign(lon), int(lon * 9 // 30) % 12):
        if (sign % 2 == 1) == want_even:
            pts += 15
    return pts


def kendradi(lon: float, lagna: float) -> float:
    house = (_sign(lon) - _sign(lagna)) % 12 + 1
    return 60.0 if house in (1, 4, 7, 10) else 30.0 if house in (2, 5, 8, 11) else 15.0


def drekkana_bala(p: str, lon: float) -> float:
    part = int((lon % 30) // 10)
    group = MALE if part == 0 else NEUTER if part == 1 else FEMALE
    return 15.0 if p in group else 0.0


def dig_bala(p: str, lon: float, asc: float, mc: float) -> float:
    strong = {1: asc, 4: mc + 180, 7: asc + 180, 10: mc}[DIG_STRONG[p]]
    return abs(_w180(lon - (strong + 180))) / 3


def _ss_mean(key: str, jd: float) -> float:
    return (360.0 * SS_REV[key] * (jd - KALI_EPOCH_JD) / SS_DAYS) % 360


def cheshta_kendra_bala(p: str, jd: float, true_lon: float) -> float:
    """Cheshta bala for Mars..Saturn from the Surya Siddhanta cheshta kendra."""
    if p in ("mars", "jupiter", "saturn"):
        mean, sighrocca = _ss_mean(p, jd), _ss_mean("sun", jd)
    else:
        mean, sighrocca = _ss_mean("sun", jd), _ss_mean(p, jd)
    avg = mean + _w180(true_lon - mean) / 2
    return abs(_w180(sighrocca - avg)) / 3


def _drishti(d: float, aspecting: str) -> float:
    """Aspect strength (virupas) cast across angular distance d (0-360)."""
    d %= 360
    if aspecting == "mars" and (90 <= d < 120 or 210 <= d < 240):
        return 60.0
    if aspecting == "jupiter" and (120 <= d < 150 or 240 <= d < 270):
        return 60.0
    if aspecting == "saturn" and (60 <= d < 90 or 270 <= d < 300):
        return 60.0
    if 30 <= d < 60:
        return (d - 30) / 2
    if 60 <= d < 90:
        return d - 60 + 15
    if 90 <= d < 120:
        return (120 - d) / 2 + 30
    if 120 <= d < 150:
        return 150 - d
    if 150 <= d < 180:
        return (d - 150) * 2
    if 180 <= d < 300:
        return (300 - d) / 2
    return 0.0


def _ayana(p: str, dec: float) -> float:
    """Ayana bala from declination: Moon/Saturn gain in south declination,
    Mercury in either, the rest in north."""
    if p in ("moon", "saturn"):
        return (24 - dec) * 60 / 48
    if p == "mercury":
        return (24 + abs(dec)) * 60 / 48
    return (24 + dec) * 60 / 48


def compute(*, jd: float, lat: float, lon: float, lons: dict[str, float], lagna: float, mc: float,
            sunrise: float, sunset: float, next_sunrise: float, weekday: int) -> dict:
    """Shadbala for the seven planets.

    lons: sidereal longitudes (sun..saturn); weekday: Sunday = 0, from sunrise.
    Planetary war (yuddha bala) is not applied.
    """
    elong = (lons["moon"] - lons["sun"]) % 360
    angle = min(elong, 360 - elong)
    benefic = {"jupiter", "venus", "mercury"} | ({"moon"} if elong < 180 else set())

    # Nathonnatha: hour angle of the Sun (0 at local noon, 180 at midnight).
    armc = swe.houses_ex(jd, lat, lon, b"E")[1][2]
    sun_ra = swe.calc_ut(jd, swe.SUN, swe.FLG_SWIEPH | swe.FLG_EQUATORIAL)[0][0]
    hour_angle = abs(_w180(armc - sun_ra))

    is_day = sunrise <= jd < sunset
    if is_day:
        frac, thirds = (jd - sunrise) / (sunset - sunrise), ["mercury", "sun", "saturn"]
        hora_index = int(frac * 12)
    else:
        frac, thirds = (jd - sunset) / (next_sunrise - sunset), ["moon", "venus", "mars"]
        hora_index = 12 + int(frac * 12)
    tribhaga_lord = thirds[min(int(frac * 3), 2)]
    vara_lord = WEEKDAY_LORD[weekday]
    hora_lord = CHALDEAN[(CHALDEAN.index(vara_lord) + hora_index) % 7]

    # Year (360-day) and month (30-day) lords from the Kali ahargana.
    day_jdn = int(math.floor(sunrise + 0.5))
    ahargana = day_jdn - KALI_EPOCH_JDN
    abda_lord = WEEKDAY_LORD[(KALI_EPOCH_JDN + 360 * (ahargana // 360) + 1) % 7]
    masa_lord = WEEKDAY_LORD[(KALI_EPOCH_JDN + 30 * (ahargana // 30) + 1) % 7]

    out = {}
    for p in PLANETS7:
        lon_p = lons[p]
        dec = swe.calc_ut(jd, PID[p], swe.FLG_SWIEPH | swe.FLG_EQUATORIAL)[0][1]
        ayana = _ayana(p, dec)
        paksha = angle / 3 if p in benefic else 60 - angle / 3

        sthana = (uchcha(p, lon_p) + saptavargaja(p, lons) + ojayugma(p, lon_p)
                  + kendradi(lon_p, lagna) + drekkana_bala(p, lon_p))
        dig = dig_bala(p, lon_p, lagna, mc)
        if p == "mercury":
            nathonnatha = 60.0
        elif p in ("moon", "mars", "saturn"):
            nathonnatha = 60 * hour_angle / 180
        else:
            nathonnatha = 60 * (180 - hour_angle) / 180
        tribhaga = 60.0 if p in ("jupiter", tribhaga_lord) else 0.0
        lords = ((15.0 if p == abda_lord else 0.0) + (30.0 if p == masa_lord else 0.0)
                 + (45.0 if p == vara_lord else 0.0) + (60.0 if p == hora_lord else 0.0))
        kala = nathonnatha + paksha + tribhaga + lords + (2 * ayana if p == "sun" else ayana)

        if p == "sun":
            cheshta = ayana
        elif p == "moon":
            cheshta = paksha
        else:
            cheshta = cheshta_kendra_bala(p, jd, lon_p)

        drik = 0.0
        for a in PLANETS7:
            if a != p:
                v = _drishti(lon_p - lons[a], a)
                drik += v if a in benefic else -v
        drik /= 4

        naisargika = NAISARGIKA[p]
        total = sthana + dig + kala + cheshta + naisargika + drik
        out[p] = {"sthana": sthana, "dig": dig, "kala": kala, "cheshta": cheshta,
                  "naisargika": naisargika, "drik": drik, "total": total,
                  "rupas": total / 60, "required": REQUIRED[p],
                  "ratio": total / 60 / REQUIRED[p]}
    return out
