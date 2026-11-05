// Search tab: every occurrence of a tithi or nakshatra in a stretch of days at
// a place, with the day(s) it holds at sunrise and the Tamil date.
//
// A tithi or nakshatra runs from one moment to another, not midnight to
// midnight. Its "main day" is the civil date whose sunrise falls inside it, as
// panchangams list it. One that spans two sunrises has two main days; one that
// begins after a sunrise and ends before the next (kshaya) has none, and is
// grouped under the day it begins.
import * as swe from "./swe.js";
import { SE } from "./swe.js";
import { NAK_SPAN, isoFromWall, julFromWall, localFromJul, norm, solve, wallMs } from "./astro.js";
import { elong, moonLon, tamilDate } from "./festivals.js";

const KINDS = {
  tithi: { value: elong, unit: 12, rate: 12.19 },
  nakshatra: { value: moonLon, unit: NAK_SPAN, rate: 13.2 },
};

// Local midnights (wall ms) bounding a Gregorian month and the months either
// side of it: [first day of month - 1, first day of month + 2).
export function threeMonths(year, month) {
  return [wallMs(year, month - 1, 1), wallMs(year, month + 2, 1)];
}

// Occurrences of `kind` ("tithi" 0-29 or "nakshatra" 0-26) number `index` whose
// group date lies in [startWall, endWall) (local midnights). `offset` is the UTC
// offset in hours or a function of a UTC instant (ms), as for festivals.dayFrame.
// Returns [{ index, start, end, date, mainDays, tamil }] in time order, with
// start/end as local ISO times, `date` the group date (first main day, or the
// day it begins) and `tamil` the Tamil date of `date` ({ month, day } or null).
export function occurrences(kind, index, startWall, endWall, lat, lon, offset) {
  const { value, unit, rate } = KINDS[kind];
  const offsetAt = typeof offset === "function" ? offset : () => offset;
  const wallOffset = (ms) => offsetAt(ms - offsetAt(ms) * 3600e3);
  const jdOfWall = (w) => julFromWall(w, wallOffset(w));
  const fmt = (jd) => localFromJul(jd, offsetAt((jd - 2440587.5) * 86400e3));
  const dayWall = (iso) => { const [y, m, d] = iso.split("-").map(Number); return wallMs(y, m, d); };
  const startIso = isoFromWall(startWall).slice(0, 10), endIso = isoFromWall(endWall).slice(0, 10);

  const sunrises = new Map();
  const sunriseOn = (iso) => {
    if (!sunrises.has(iso)) sunrises.set(iso, swe.riseTrans(jdOfWall(dayWall(iso)), SE.SUN, SE.CALC_RISE, lon, lat));
    return sunrises.get(iso);
  };

  const out = [];
  const jdEnd = jdOfWall(endWall) + 1.2;
  // Start a little more than one span early, so one running into the first
  // day (and so possibly holding at its sunrise) is found too.
  let jd = jdOfWall(startWall) - 1.5;
  for (let guard = 0; guard < 12; guard++) {
    const s = solve(value, index * unit, jd + norm(index * unit - value(jd)) / rate);
    if (s >= jdEnd) break;
    const e = solve(value, norm((index + 1) * unit), s + unit / rate);
    jd = e + 0.5;
    const start = fmt(s), end = fmt(e);
    const mainDays = [];
    for (let w = dayWall(start.slice(0, 10)); w <= dayWall(end.slice(0, 10)); w += 86400e3) {
      const iso = isoFromWall(w).slice(0, 10), sr = sunriseOn(iso);
      if (sr && sr >= s && sr < e) mainDays.push(iso);
    }
    const date = mainDays[0] || start.slice(0, 10);
    if (date < startIso || date >= endIso) continue;
    out.push({ index, start, end, date, mainDays, tamil: tamilDate(dayWall(date), lat, lon, offset) });
  }
  return out;
}
