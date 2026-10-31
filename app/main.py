"""FastAPI server: JSON API plus the static single-page frontend."""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from geopy.exc import GeopyError
from geopy.geocoders import Nominatim
from timezonefinder import TimezoneFinder

from . import astro, places

app = FastAPI(title="Vedic Chart")
_geocoder = Nominatim(user_agent="vedic-chart-local", timeout=10)


@app.middleware("http")
async def revalidate_static(request, call_next):
    """Make browsers check for updated page files on every load (a cheap 304
    when unchanged) instead of running a stale cached copy."""
    response = await call_next(request)
    if not request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-cache"
    return response
_tzfinder = TimezoneFinder()


def _parse_dt(date: str, time: str) -> datetime:
    try:
        return datetime.fromisoformat(f"{date}T{time}")
    except ValueError:
        raise HTTPException(400, "Date must be YYYY-MM-DD and time HH:MM[:SS]")


def _tz_offset(lat: float, lon: float, dt: datetime) -> tuple[str, float, str | None]:
    """Timezone name, UTC offset in hours (historical DST included), and a
    warning when the local time is ambiguous or skipped by a clock change."""
    name = _tzfinder.timezone_at(lat=lat, lng=lon)
    if not name:
        raise HTTPException(400, "No timezone found for these coordinates; enter the UTC offset manually")
    zone = ZoneInfo(name)
    local = dt.replace(tzinfo=zone)
    offset = local.utcoffset()
    note = None
    other = dt.replace(tzinfo=zone, fold=1).utcoffset()
    if other != offset:
        hours = lambda td: td.total_seconds() / 3600
        roundtrip = local.astimezone(timezone.utc).astimezone(zone).replace(tzinfo=None)
        if roundtrip == dt:
            note = (f"{dt:%H:%M} occurred twice on this date (clocks went back). Using the first "
                    f"occurrence, UTC{hours(offset):+g}; enter UTC{hours(other):+g} for the second.")
        else:
            note = (f"{dt:%H:%M} did not exist on this date (clocks went forward). "
                    f"Using UTC{hours(offset):+g}; check the recorded birth time.")
    return name, offset.total_seconds() / 3600, note


@app.on_event("startup")
def _warm_places():
    places.preload()


@app.get("/api/places")
def place_suggestions(q: str = Query(..., max_length=100)):
    """Offline autocomplete over GeoNames towns and cities."""
    return places.search(q)


@app.get("/api/geocode")
def geocode(q: str = Query(..., min_length=2)):
    try:
        results = _geocoder.geocode(q, exactly_one=False, limit=6, language="en") or []
    except GeopyError as e:
        raise HTTPException(502, f"Place lookup failed: {e}")
    return [{"name": r.address, "lat": round(r.latitude, 5), "lon": round(r.longitude, 5)} for r in results]


@app.get("/api/reverse")
def reverse(lat: float = Query(..., ge=-90, le=90), lon: float = Query(..., ge=-180, le=180)):
    try:
        r = _geocoder.reverse((lat, lon), zoom=10, language="en")
    except GeopyError as e:
        raise HTTPException(502, f"Place lookup failed: {e}")
    return {"name": ", ".join(r.address.split(", ")[:3]) if r else None}


@app.get("/api/timezone")
def timezone_for(lat: float, lon: float, date: str, time: str = "12:00"):
    name, offset, note = _tz_offset(lat, lon, _parse_dt(date, time))
    return {"timezone": name, "offset": offset, "note": note}


@app.get("/api/options")
def options():
    return {"ayanamsas": {k: v[0] for k, v in astro.AYANAMSAS.items()},
            "bhava_methods": astro.BHAVA_METHODS}


@app.get("/api/chart")
def chart(date: str, time: str,
          lat: float = Query(..., ge=-90, le=90), lon: float = Query(..., ge=-180, le=180),
          offset: float | None = Query(None, ge=-14, le=14),
          ayanamsa: str = "true_chitra", bhava: str = "equal_mid"):
    dt = _parse_dt(date, time)
    tz_name = tz_note = None
    if offset is None:
        tz_name, offset, tz_note = _tz_offset(lat, lon, dt)
    try:
        result = astro.compute_chart(dt, offset, lat, lon, ayanamsa, bhava)
    except ValueError as e:
        raise HTTPException(400, str(e))
    result["input"]["timezone"] = tz_name
    result["input"]["tz_note"] = tz_note
    return result


# The browser app (also published to GitHub Pages) does its own calculations;
# the /api routes remain as the Python reference implementation.
STATIC = Path(__file__).resolve().parent.parent / "docs"


@app.get("/", include_in_schema=False)
def index():
    """index.html with version-stamped asset URLs, so browsers fetch fresh
    copies whenever app.js or style.css change."""
    html = (STATIC / "index.html").read_text()
    for name in ("app.js", "style.css"):
        version = int((STATIC / name).stat().st_mtime)
        html = html.replace(f'"{name}"', f'"{name}?v={version}"')
    return HTMLResponse(html, headers={"Cache-Control": "no-cache"})


app.mount("/", StaticFiles(directory=STATIC, html=True), name="static")
