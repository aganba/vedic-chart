"""Vedic astrology calculations on top of Swiss Ephemeris.

Defaults reproduce Jagannatha Hora (JHora): True Chitrapaksha ayanamsa, true
(geometric) planet positions, mean node for Rahu, and the lagna computed as the
apparent tropical ascendant minus the true-position ayanamsa without nutation.
Validated against a JHora printout to < 0.01 arc-second (see tests/).
"""
from __future__ import annotations

import threading
from datetime import datetime, timedelta, timezone
from pathlib import Path

import swisseph as swe

from . import shadbala

swe.set_ephe_path(str(Path(__file__).resolve().parent.parent / "ephe"))

# swe.set_sid_mode is global state; serialize chart computations.
_LOCK = threading.Lock()

AYANAMSAS = {
    "true_chitra": ("True Chitrapaksha", swe.SIDM_TRUE_CITRA),
    "lahiri": ("Lahiri", swe.SIDM_LAHIRI),
    "raman": ("Raman", swe.SIDM_RAMAN),
    "kp": ("Krishnamurti (KP)", swe.SIDM_KRISHNAMURTI),
}

BHAVA_METHODS = {
    "equal_mid": "Equal, lagna at middle of 1st house",
    "sripati": "Sripati",
    "placidus": "Placidus",
}

PLANET_FLAGS = swe.FLG_SWIEPH | swe.FLG_SIDEREAL | swe.FLG_TRUEPOS | swe.FLG_SPEED
LAGNA_AYANAMSA_FLAGS = swe.FLG_SWIEPH | swe.FLG_TRUEPOS | swe.FLG_NONUT

SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
         "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]
SIGNS_SKT = ["Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya",
             "Tula", "Vrischika", "Dhanu", "Makara", "Kumbha", "Meena"]
SIGN_ABBR = ["Ar", "Ta", "Ge", "Cn", "Le", "Vi", "Li", "Sc", "Sg", "Cp", "Aq", "Pi"]

# (key, name, abbreviation, swisseph id); Ketu is derived from Rahu.
PLANETS = [
    ("sun", "Sun", "Su", swe.SUN),
    ("moon", "Moon", "Mo", swe.MOON),
    ("mars", "Mars", "Ma", swe.MARS),
    ("mercury", "Mercury", "Me", swe.MERCURY),
    ("jupiter", "Jupiter", "Ju", swe.JUPITER),
    ("venus", "Venus", "Ve", swe.VENUS),
    ("saturn", "Saturn", "Sa", swe.SATURN),
    ("rahu", "Rahu", "Ra", swe.MEAN_NODE),
]

NAKSHATRAS = ["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
              "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni",
              "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha",
              "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana",
              "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada",
              "Revati"]
NAK_LORDS = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"]
NAK_SPAN = 360 / 27

TITHIS = ["Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi",
          "Saptami", "Ashtami", "Navami", "Dashami", "Ekadashi", "Dwadashi",
          "Trayodashi", "Chaturdashi"]
YOGAS = ["Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda",
         "Sukarma", "Dhriti", "Shula", "Ganda", "Vriddhi", "Dhruva", "Vyaghata",
         "Harshana", "Vajra", "Siddhi", "Vyatipata", "Variyan", "Parigha", "Shiva",
         "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma", "Indra", "Vaidhriti"]
MOVABLE_KARANAS = ["Bava", "Balava", "Kaulava", "Taitila", "Gara", "Vanija", "Vishti"]
VARAS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
VARA_SKT = ["Ravivara", "Somavara", "Mangalavara", "Budhavara", "Guruvara",
            "Shukravara", "Shanivara"]
MASAS = ["Chaitra", "Vaishakha", "Jyeshtha", "Ashadha", "Shravana", "Bhadrapada",
         "Ashvayuja", "Kartika", "Margashirsha", "Pausha", "Magha", "Phalguna"]
SAMVATSARAS = [
    "Prabhava", "Vibhava", "Shukla", "Pramoda", "Prajapati", "Angirasa", "Shrimukha",
    "Bhava", "Yuva", "Dhatu", "Ishvara", "Bahudhanya", "Pramathi", "Vikrama", "Vrisha",
    "Chitrabhanu", "Subhanu", "Tarana", "Parthiva", "Vyaya", "Sarvajit", "Sarvadhari",
    "Virodhi", "Vikriti", "Khara", "Nandana", "Vijaya", "Jaya", "Manmatha", "Durmukhi",
    "Hevilambi", "Vilambi", "Vikari", "Sharvari", "Plava", "Shubhakrit", "Shobhakrit",
    "Krodhi", "Vishvavasu", "Parabhava", "Plavanga", "Kilaka", "Saumya", "Sadharana",
    "Virodhikrit", "Paridhavi", "Pramadi", "Ananda", "Rakshasa", "Nala", "Pingala",
    "Kalayukti", "Siddharthi", "Raudri", "Durmati", "Dundubhi", "Rudhirodgari",
    "Raktakshi", "Krodhana", "Akshaya",
]
KARAKAS = ["AK", "AmK", "BK", "MK", "PiK", "PK", "GK", "DK"]

# 1-based eighth of daytime, indexed by weekday (Sunday first).
RAHU_KALAM = [8, 2, 7, 5, 6, 4, 3]
YAMAGANDA = [5, 4, 3, 2, 1, 7, 6]
GULIKA_KALAM = [7, 6, 5, 4, 3, 2, 1]


# ---------- helpers ----------

def norm(x: float) -> float:
    return x % 360.0


def wrap180(x: float) -> float:
    return (x + 180.0) % 360.0 - 180.0


def dms(x: float) -> dict:
    """Degrees within sign as d/m/s plus display text."""
    d = x % 30.0
    deg = int(d)
    m_f = (d - deg) * 60
    mins = int(m_f)
    sec = round((m_f - mins) * 60, 2)
    if sec >= 60:
        sec, mins = 0.0, mins + 1
    if mins >= 60:
        mins, deg = 0, deg + 1
    return {"deg": deg, "min": mins, "sec": sec,
            "text": f"{deg}° {mins:02d}′ {sec:05.2f}″"}


def nakshatra_of(lon: float) -> dict:
    idx = int(lon // NAK_SPAN)
    within = lon - idx * NAK_SPAN
    return {"index": idx, "name": NAKSHATRAS[idx], "pada": int(within // (NAK_SPAN / 4)) + 1,
            "lord": NAK_LORDS[idx % 9], "pct_left": round((1 - within / NAK_SPAN) * 100, 2)}


def navamsa_sign(lon: float) -> int:
    return int(lon * 9 // 30) % 12


def julday_from_local(dt: datetime, offset_hours: float) -> float:
    ut = dt - timedelta(hours=offset_hours)
    hour = ut.hour + ut.minute / 60 + (ut.second + ut.microsecond / 1e6) / 3600
    return swe.julday(ut.year, ut.month, ut.day, hour)


def local_from_julday(jd: float, offset_hours: float) -> datetime:
    y, m, d, h = swe.revjul(jd)
    ut = datetime(y, m, d, tzinfo=timezone.utc) + timedelta(hours=h)
    return (ut + timedelta(hours=offset_hours)).replace(tzinfo=None, microsecond=0)


# ---------- positions ----------

def planet_lon(jd: float, pid: int) -> tuple[float, float]:
    xx, _ = swe.calc_ut(jd, pid, PLANET_FLAGS)
    return xx[0], xx[3]


def lagna_and_mc(jd: float, lat: float, lon: float) -> tuple[float, float, float]:
    """Sidereal ascendant and MC, plus the ayanamsa used for them."""
    _, ascmc = swe.houses_ex(jd, lat, lon, b"E")
    ay = swe.get_ayanamsa_ex_ut(jd, LAGNA_AYANAMSA_FLAGS)[1]
    return norm(ascmc[0] - ay), norm(ascmc[1] - ay), ay


def bhavas(method: str, jd: float, lat: float, lon: float, asc: float, mc: float, ay: float) -> list[dict]:
    """Twelve houses as start/middle/end longitudes."""
    if method == "equal_mid":
        mids = [norm(asc + 30 * i) for i in range(12)]
        starts = [norm(m - 15) for m in mids]
    elif method == "sripati":
        ic, dsc = norm(mc + 180), norm(asc + 180)
        anchors = [asc, ic, dsc, mc]  # madhyas of houses 1, 4, 7, 10
        mids = []
        for q in range(4):
            a, b = anchors[q], anchors[(q + 1) % 4]
            arc = norm(b - a)
            mids += [a, norm(a + arc / 3), norm(a + 2 * arc / 3)]
        starts = [norm(mids[i - 1] + norm(mids[i] - mids[i - 1]) / 2) for i in range(12)]
    elif method == "placidus":
        cusps, _ = swe.houses_ex(jd, lat, lon, b"P")
        starts = [norm(c - ay) for c in cusps[:12]]
        mids = [norm(starts[i] + norm(starts[(i + 1) % 12] - starts[i]) / 2) for i in range(12)]
    else:
        raise ValueError(f"unknown bhava method {method!r}")
    out = []
    for i in range(12):
        start, end, mid = starts[i], starts[(i + 1) % 12], mids[i]
        out.append({"house": i + 1, "start": start, "mid": mid, "end": end,
                    "start_sign": int(start // 30), "mid_sign": int(mid // 30), "end_sign": int(end // 30),
                    "start_dms": dms(start), "mid_dms": dms(mid), "end_dms": dms(end)})
    return out


def house_of(lon: float, houses: list[dict]) -> int:
    for h in houses:
        if norm(lon - h["start"]) < norm(h["end"] - h["start"]):
            return h["house"]
    return 1


def chara_karakas(lons: dict) -> dict:
    """8-karaka scheme (includes Rahu, counted backwards), as JHora."""
    deg = {k: lons[k] % 30 for k in ("sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn")}
    deg["rahu"] = 30 - lons["rahu"] % 30
    order = sorted(deg, key=deg.get, reverse=True)
    return {k: KARAKAS[i] for i, k in enumerate(order)}


# ---------- panchanga ----------

def _elongation(jd: float) -> float:
    return norm(planet_lon(jd, swe.MOON)[0] - planet_lon(jd, swe.SUN)[0])


def _yoga_sum(jd: float) -> float:
    return norm(planet_lon(jd, swe.MOON)[0] + planet_lon(jd, swe.SUN)[0])


def _moon(jd: float) -> float:
    return planet_lon(jd, swe.MOON)[0]


def _solve(f, target: float, guess: float) -> float:
    """Newton iteration for f(jd) == target (angles in degrees)."""
    jd = guess
    for _ in range(60):
        d = wrap180(f(jd) - target)
        if abs(d) < 1e-7:
            break
        rate = wrap180(f(jd + 1e-3) - f(jd - 1e-3)) / 2e-3
        jd -= d / rate
    return jd


def _end_of(f, unit: float, jd: float, approx_rate: float) -> tuple[int, float, float]:
    """Index of the current unit, its end time, and fraction left."""
    v = f(jd)
    idx = int(v // unit)
    target = (idx + 1) * unit
    end = _solve(f, norm(target), jd + (target - v) / approx_rate)
    return idx, end, 1 - (v - idx * unit) / unit


def _sun_event(jd_start: float, lat: float, lon: float, event: int) -> float | None:
    res, tret = swe.rise_trans(jd_start, swe.SUN, event, (lon, lat, 0), flags=swe.FLG_SWIEPH)
    return tret[0] if res == 0 else None


def _karana_name(k: int) -> str:
    if k == 0:
        return "Kimstughna"
    if k >= 57:
        return ["Shakuni", "Chatushpada", "Naga"][k - 57]
    return MOVABLE_KARANAS[(k - 1) % 7]


def panchanga(jd: float, lat: float, lon: float, offset: float) -> dict:
    loc = lambda t: local_from_julday(t, offset).isoformat() if t else None

    # Vedic day runs sunrise to sunrise.
    sunrise = _sun_event(jd - 1.5, lat, lon, swe.CALC_RISE)
    if sunrise is not None:
        while True:
            nxt = _sun_event(sunrise + 0.01, lat, lon, swe.CALC_RISE)
            if nxt is None or nxt > jd:
                break
            sunrise = nxt
    sunset = _sun_event(sunrise, lat, lon, swe.CALC_SET) if sunrise else None
    next_sunrise = _sun_event(sunset, lat, lon, swe.CALC_RISE) if sunset else None

    day_ref = sunrise if sunrise is not None else jd
    weekday = (local_from_julday(day_ref, offset).weekday() + 1) % 7  # Sunday = 0

    ti, ti_end, ti_left = _end_of(_elongation, 12, jd, 12.19)
    nk, nk_end, nk_left = _end_of(_moon, NAK_SPAN, jd, 13.2)
    yg, yg_end, yg_left = _end_of(_yoga_sum, NAK_SPAN, jd, 14.2)
    kr, kr_end, kr_left = _end_of(_elongation, 6, jd, 12.19)

    # Amanta lunar month: named from the Sun's sign at the preceding new moon.
    e = _elongation(jd)
    nm_prev = _solve(_elongation, 0.0, jd - e / 12.19)
    nm_next = _solve(_elongation, 0.0, nm_prev + 29.53)
    s_prev = int(planet_lon(nm_prev, swe.SUN)[0] // 30)
    s_next = int(planet_lon(nm_next, swe.SUN)[0] // 30)
    masa = (s_prev + 1) % 12
    local_dt = local_from_julday(jd, offset)
    lunar_year = local_dt.year - 1 if (masa >= 9 and local_dt.month <= 6) else local_dt.year

    # Sunrise, sunset and the daytime periods are shown for the entered civil
    # date, whatever the time entered (the Vedic day above can start the day before).
    midnight = local_dt.replace(hour=0, minute=0, second=0)
    day_sunrise = _sun_event(julday_from_local(midnight, offset), lat, lon, swe.CALC_RISE)
    day_sunset = _sun_event(day_sunrise, lat, lon, swe.CALC_SET) if day_sunrise else None
    day_next_sunrise = _sun_event(day_sunset, lat, lon, swe.CALC_RISE) if day_sunset else None
    civil_weekday = (midnight.weekday() + 1) % 7

    kalams = {}
    if day_sunrise and day_sunset:
        eighth = (day_sunset - day_sunrise) / 8
        for name, table in (("rahu_kalam", RAHU_KALAM), ("yamaganda", YAMAGANDA), ("gulika_kalam", GULIKA_KALAM)):
            part = table[civil_weekday] - 1
            kalams[name] = {"start": loc(day_sunrise + part * eighth), "end": loc(day_sunrise + (part + 1) * eighth)}

    nak = nakshatra_of(_moon(jd))

    # Nakshatra at sunrise on the entered civil date.
    sunrise_nak = None
    if day_sunrise is not None:
        _, sn_end, _ = _end_of(_moon, NAK_SPAN, day_sunrise, 13.2)
        sunrise_nak = {**nakshatra_of(_moon(day_sunrise)), "at": loc(day_sunrise), "end": loc(sn_end)}

    return {
        "samvatsara": SAMVATSARAS[(lunar_year - 1987) % 60],
        "masa": ("Adhika " if s_prev == s_next else "") + MASAS[masa],
        "vara": {"name": VARAS[weekday], "sanskrit": VARA_SKT[weekday]},
        "tithi": {"paksha": "Shukla" if ti < 15 else "Krishna",
                  "name": "Purnima" if ti == 14 else "Amavasya" if ti == 29 else TITHIS[ti % 15],
                  "number": ti + 1, "end": loc(ti_end), "pct_left": round(ti_left * 100, 2)},
        "nakshatra": {**nak, "end": loc(nk_end), "pct_left": round(nk_left * 100, 2)},
        "sunrise_nakshatra": sunrise_nak,
        "yoga": {"name": YOGAS[yg], "end": loc(yg_end), "pct_left": round(yg_left * 100, 2)},
        "karana": {"name": _karana_name(kr), "end": loc(kr_end), "pct_left": round(kr_left * 100, 2)},
        "sunrise": loc(day_sunrise), "sunset": loc(day_sunset), "next_sunrise": loc(day_next_sunrise),
        **kalams,
        "_raw": {"sunrise": sunrise, "sunset": sunset, "next_sunrise": next_sunrise, "weekday": weekday},
    }


# ---------- top level ----------

def compute_chart(dt: datetime, offset_hours: float, lat: float, lon: float,
                  ayanamsa: str = "true_chitra", bhava_method: str = "equal_mid") -> dict:
    if ayanamsa not in AYANAMSAS:
        raise ValueError(f"unknown ayanamsa {ayanamsa!r}")
    if bhava_method not in BHAVA_METHODS:
        raise ValueError(f"unknown bhava method {bhava_method!r}")
    with _LOCK:
        swe.set_sid_mode(AYANAMSAS[ayanamsa][1])
        jd = julday_from_local(dt, offset_hours)
        asc, mc, ay = lagna_and_mc(jd, lat, lon)
        try:
            houses = bhavas(bhava_method, jd, lat, lon, asc, mc, ay)
        except swe.Error:
            # Placidus is undefined near the poles.
            bhava_method = "equal_mid"
            houses = bhavas(bhava_method, jd, lat, lon, asc, mc, ay)

        lons, speeds = {}, {}
        for key, _, _, pid in PLANETS:
            lons[key], speeds[key] = planet_lon(jd, pid)
        lons["ketu"], speeds["ketu"] = norm(lons["rahu"] + 180), speeds["rahu"]
        karakas = chara_karakas(lons)
        panch = panchanga(jd, lat, lon, offset_hours)
        raw = panch.pop("_raw")
        strengths = {}
        if raw["sunrise"] and raw["sunset"] and raw["next_sunrise"]:  # undefined in polar day/night
            strengths = shadbala.compute(
                jd=jd, lat=lat, lon=lon, lons={k: lons[k] for k in shadbala.PLANETS7},
                lagna=asc, mc=mc, sunrise=raw["sunrise"], sunset=raw["sunset"],
                next_sunrise=raw["next_sunrise"], weekday=raw["weekday"])
        from .dasha import vimshottari  # local import: dasha imports this module
        dashas = vimshottari(jd, lons["moon"], offset_hours)

    def row(key, name, abbr, x, speed=None):
        return {"key": key, "name": name, "abbr": abbr, "lon": x,
                "sign": int(x // 30), "sign_name": SIGNS[int(x // 30)], "dms": dms(x),
                "nakshatra": nakshatra_of(x), "navamsa": navamsa_sign(x),
                "house": house_of(x, houses),
                "retro": bool(speed is not None and speed < 0 and key not in ("rahu", "ketu")),
                "karaka": karakas.get(key), "shadbala": strengths.get(key)}

    bodies = [row("lagna", "Lagna", "Asc", asc)]
    bodies += [row(k, n, a, lons[k], speeds[k]) for k, n, a, _ in PLANETS]
    bodies.append(row("ketu", "Ketu", "Ke", lons["ketu"], speeds["ketu"]))

    return {
        "input": {"local_time": dt.isoformat(), "utc_offset": offset_hours, "lat": lat, "lon": lon,
                  "julian_day_ut": jd},
        "settings": {"ayanamsa": ayanamsa, "ayanamsa_label": AYANAMSAS[ayanamsa][0],
                     "ayanamsa_value": ay, "ayanamsa_dms": dms(ay)["text"],
                     "ayanamsa_deg": int(ay), "bhava_method": bhava_method,
                     "bhava_label": BHAVA_METHODS[bhava_method]},
        "lagna_sign": int(asc // 30),
        "bodies": bodies,
        "bhavas": houses,
        "panchanga": panch,
        "vimshottari": dashas,
        "constants": {"signs": SIGNS, "signs_skt": SIGNS_SKT, "sign_abbr": SIGN_ABBR},
    }
