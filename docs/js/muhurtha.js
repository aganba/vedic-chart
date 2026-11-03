// Muhurtham times for everyday undertakings, following the rules in Bangalore
// Niranjan Babu's talk "Selecting Auspicious Muhurthas" (Raman & Rajeswari
// Research Foundation, 1 September 2024, https://www.youtube.com/watch?v=OMcodmmokcU),
// which follow B. V. Raman's Muhurtha.
//
// Each time is tagged with the events its nakshatra suits (slide 39):
//  - movable (Punarvasu, Swati, Shravana, Dhanishta, Shatabhisha): vehicles, travel
//  - mixed (Krittika, Vishakha): day-to-day matters
//  - soft (Mrigashira, Chitra, Anuradha, Revati): learning music, dance and arts,
//    auspicious events
//  - light (Ashwini, Pushya, Hasta, Abhijit): sports, new projects, travel
// Sharp and dreadful nakshatras suit none of these.
// Every time must also pass:
//  - Tithi: not the 9th or 14th of either paksha (slide 27).
//  - Panchanga yoga: not Atiganda, Shula, Ganda, Vyaghata, Vyatipata, Parigha
//    or Vaidhriti (slide 19).
//  - Karana: not Vishti, Shakuni or Chatushpada (slide 20).
//  - Lagna Thyajya (slides 24-26): not the first 3 degrees of Mesha, Vrishabha,
//    Kanya or Dhanu, the last 3 of Karka, Vrischika, Makara or Meena, or
//    13°30'-16°30' of Mithuna, Simha, Tula or Kumbha.
//  - Panchaka (slides 34-35): tithi (1-30) + weekday (Sunday = 1) + nakshatra
//    (Ashwini = 1) + lagna (Mesha = 1), divided by 9, leaves 0, 3, 5 or 7. The
//    weekday runs from sunrise to sunrise. Drik Panchang's Panchaka Rahita
//    times come out the same, and count 0 as good.
//  - Surya Sankramana (slide 44): not within 16 ghatis (6 h 24 min) of the Sun
//    entering a sign.
//  - Not in Rahu Kalam, Yamaganda or Gulika Kalam, and not on an eclipse day
//    (general panchangam practice; the talk doesn't mention these).
//  - At least 20 minutes long.
//  - Between an hour before sunrise and an hour after sunset: a practical
//    limit for these events, not a rule from the talk.
// Personal factors (tarabala, chandrabala) aren't applied.
import * as swe from "./swe.js";
import { SE } from "./swe.js";
import { NAK_SPAN, julFromWall, lagnaAndMc, localFromJul, planetLon } from "./astro.js";

// Events, in display order, and the nakshatras (0 = Ashwini) that suit them;
// "abhijit" is the Moon in Abhijit (276°40' to 280°53'20").
export const EVENTS = [
  ["Vehicles", [6, 14, 21, 22, 23]],
  ["Travel", [6, 14, 21, 22, 23, 0, 7, 12, "abhijit"]],
  ["Day-to-day matters", [2, 15]],
  ["Learning music and arts", [4, 13, 16, 26]],
  ["Auspicious events", [4, 13, 16, 26]],
  ["Sports", [0, 7, 12, "abhijit"]],
  ["New projects", [0, 7, 12, "abhijit"]],
];
const ABHIJIT = [276 + 40 / 60, 280 + 53 / 60 + 20 / 3600];
// Panchanga yogas (0 = Vishkambha ... 26 = Vaidhriti) to avoid.
const BAD_YOGA = new Set([5, 8, 9, 12, 16, 18, 26]);
const YOGA_SPAN = 360 / 27;
// 1-based eighth of daytime, by weekday (Sunday first); as in astro.js.
const KALAMS = [[8, 2, 7, 5, 6, 4, 3], [5, 4, 3, 2, 1, 7, 6], [7, 6, 5, 4, 3, 2, 1]];
const SANKRAMANA = (16 * 24) / 1440; // 16 ghatis, in days

const STEP = 5 / 1440; // sampling step: 5 minutes
const MIN_LEN = 20 / 1440;
const norm = (x) => ((x % 360) + 360) % 360;
const sign = (lon) => Math.floor(norm(lon) / 30);
const gap = (a, b) => Math.abs(norm(a - b + 180) - 180);

// Whether the lagna is in a destructive portion of its sign (Lagna Thyajya).
function lagnaThyajya(lon) {
  const s = sign(lon), d = norm(lon) % 30;
  if ([0, 1, 5, 8].includes(s)) return d < 3; // Mesha, Vrishabha, Kanya, Dhanu
  if ([3, 7, 9, 11].includes(s)) return d >= 27; // Karka, Vrischika, Makara, Meena
  return d >= 13.5 && d < 16.5; // Mithuna, Simha, Tula, Kumbha
}

// Panchaka remainder: tithi, weekday, nakshatra and lagna numbers (each from 1) mod 9.
// `ti` 0-29, `vara` 0 = Sunday, `nak` 0-26, `lagna` 0-11.
export const panchaka = (ti, vara, nak, lagna) => (ti + vara + nak + lagna + 4) % 9;
const PANCHAKA_OK = new Set([0, 3, 5, 7]);

// Whether a solar or lunar eclipse happens (anywhere) between jd0 and jd1: a new
// moon with the Sun within 18.5 degrees of a node, or a full moon within 12.5.
function eclipseBetween(jd0, jd1) {
  const el = (jd) => norm(planetLon(jd, SE.MOON)[0] - planetLon(jd, SE.SUN)[0]);
  const a = el(jd0), b = el(jd1);
  const newMoon = b < a, fullMoon = a < 180 && b >= 180;
  if (!newMoon && !fullMoon) return false;
  // Moment of the syzygy, by bisection.
  let lo = jd0, hi = jd1;
  for (let i = 0; i < 20; i++) {
    const m = (lo + hi) / 2, e = el(m);
    if (newMoon ? e > 180 : e < 180) lo = m; else hi = m;
  }
  const node = planetLon(lo, SE.MEAN_NODE)[0], sun = planetLon(lo, SE.SUN)[0];
  return Math.min(gap(sun, node), gap(sun, node + 180)) < (newMoon ? 18.5 : 12.5);
}

// Moments the Sun enters a sign between jd0 and jd1 (at most one in practice).
function ingresses(jd0, jd1) {
  const s0 = sign(planetLon(jd0, SE.SUN)[0]);
  if (sign(planetLon(jd1, SE.SUN)[0]) === s0) return [];
  let lo = jd0, hi = jd1;
  for (let i = 0; i < 20; i++) {
    const m = (lo + hi) / 2;
    if (sign(planetLon(m, SE.SUN)[0]) === s0) lo = m; else hi = m;
  }
  return [hi];
}

// Abhijit Muhurtha: the 8th of the 15 muhurthas of daytime, around local midday.
// Returns { start, end } as local ISO times, or null where the Sun doesn't rise or set.
export function abhijitFor(dateWall, lat, lon, offset) {
  const offsetAt = typeof offset === "function" ? offset : () => offset;
  const midnight = julFromWall(dateWall, offsetAt(dateWall - offsetAt(dateWall) * 3600e3));
  const sr = swe.riseTrans(midnight, SE.SUN, SE.CALC_RISE, lon, lat);
  const ss = sr && swe.riseTrans(sr, SE.SUN, SE.CALC_SET, lon, lat);
  if (!sr || !ss) return null;
  const part = (ss - sr) / 15;
  const fmt = (jd) => localFromJul(jd, offsetAt((jd - 2440587.5) * 86400e3));
  return { start: fmt(sr + 7 * part), end: fmt(sr + 8 * part) };
}

// `offset`: UTC offset in hours, or a function of the UTC instant (ms), as in festivalsFor.
// Returns null, or the day's times with the events each suits:
// { events: [names], windows: [{ start, end, events }] }.
export function muhurthaFor(dateWall, lat, lon, offset) {
  const offsetAt = typeof offset === "function" ? offset : () => offset;
  const wallOffsetOf = (w) => offsetAt(w - offsetAt(w) * 3600e3);
  const weekday = new Date(dateWall).getUTCDay();
  const midnight = julFromWall(dateWall, wallOffsetOf(dateWall));
  const nextMidnight = julFromWall(dateWall + 86400e3, wallOffsetOf(dateWall + 86400e3));
  const sr = swe.riseTrans(midnight, SE.SUN, SE.CALC_RISE, lon, lat);
  const ss = sr && swe.riseTrans(sr, SE.SUN, SE.CALC_SET, lon, lat);
  if (!sr || !ss || sr >= nextMidnight) return null;
  if (eclipseBetween(midnight, nextMidnight)) return null;
  // A practical limit, not from the talk: an hour before sunrise to an hour after sunset.
  const start = sr - 1 / 24, end = ss + 1 / 24;

  const eighth = (ss - sr) / 8;
  const kalams = KALAMS.map((t) => [sr + (t[weekday] - 1) * eighth, sr + t[weekday] * eighth]);
  const sankramana = ingresses(start - SANKRAMANA, end + SANKRAMANA);

  // Events that suit the moment jd, as a key ("" if none).
  const at = (jd) => {
    if (kalams.some(([a, b]) => jd >= a && jd < b)) return "";
    if (sankramana.some((t) => Math.abs(jd - t) < SANKRAMANA)) return "";
    const sun = planetLon(jd, SE.SUN)[0], moon = planetLon(jd, SE.MOON)[0];
    const el = norm(moon - sun), ti = Math.floor(el / 12);
    if (ti % 15 === 8 || ti % 15 === 13) return ""; // Navami, Chaturdashi
    const k = Math.floor(el / 6);
    if ((k >= 1 && k <= 56 && (k - 1) % 7 === 6) || k === 57 || k === 58) return ""; // Vishti, Shakuni, Chatushpada
    if (BAD_YOGA.has(Math.floor(norm(moon + sun) / YOGA_SPAN))) return "";
    const nak = Math.floor(moon / NAK_SPAN), abhijit = moon >= ABHIJIT[0] && moon < ABHIJIT[1];
    const events = EVENTS.filter(([, naks]) => naks.includes(nak) || (abhijit && naks.includes("abhijit")));
    if (!events.length) return "";
    const lagnaLon = norm(lagnaAndMc(jd, lat, lon)[0]);
    if (lagnaThyajya(lagnaLon)) return "";
    const vara = jd < sr ? (weekday + 6) % 7 : weekday;
    if (!PANCHAKA_OK.has(panchaka(ti, vara, nak, sign(lagnaLon)))) return "";
    return events.map(([name]) => name).join("|");
  };

  // Moment between a (key ka) and b where the key stops being ka.
  const edge = (a, b, ka) => {
    for (let i = 0; i < 12; i++) {
      const m = (a + b) / 2;
      if (at(m) === ka) a = m; else b = m;
    }
    return (a + b) / 2;
  };
  const raw = [];
  let cur = at(start), curStart = start, prevJd = start;
  for (let jd = start + STEP; ; jd += STEP) {
    const t = Math.min(jd, end);
    const k = t < end ? at(t) : "";
    if (k !== cur) {
      const e = t < end ? edge(prevJd, t, cur) : end;
      if (cur) raw.push({ key: cur, start: curStart, end: e });
      cur = k; curStart = e;
    }
    prevJd = t;
    if (t >= end) break;
  }
  const windows = raw.filter((w) => w.end - w.start >= MIN_LEN);
  if (!windows.length) return null;

  const fmt = (jd) => localFromJul(jd, offsetAt((jd - 2440587.5) * 86400e3));
  const used = new Set(windows.flatMap((w) => w.key.split("|")));
  return {
    events: EVENTS.map(([name]) => name).filter((n) => used.has(n)),
    windows: windows.map((w) => ({ start: fmt(w.start), end: fmt(w.end), events: w.key.split("|") })),
  };
}
