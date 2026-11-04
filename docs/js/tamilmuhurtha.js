// Shubha muhurtham days in the style of Tamil calendars, for marriage and other
// auspicious beginnings.
//
// Every day must pass these:
//  - Weekday: not Tuesday or Saturday.
//  - Tamil month: not Aadi, Purattasi or Margazhi (the Sun in Karka, Kanya or
//    Dhanu at the time), not the first day of a month, and not a Kari naal
//    (KARI_NAAL below).
//  - Not an eclipse day: no new or full moon that day close enough to the
//    Moon's node for an eclipse anywhere.
//  - The day's yogam (weekday + sunrise nakshatra, YOGAM below) is Amirtha or
//    Siddha, not Marana or Prabalarishta.
// Every window must pass these:
//  - Tithi and nakshatra from the Tamil lists (TITHI and NAK below).
//  - Between an hour before sunrise (but not before 5 am) and two hours after
//    sunset.
//  - Not in Rahu Kalam, Yamaganda, Gulika Kalam or Vishti (Bhadra) karana.
//  - Ashtama shuddhi: no planet (Moon included) in the 8th house from the lagna.
//  - The lagna isn't in the first or last degree of its sign (sandhi).
//  - At least 20 minutes long.
// Checked against Harikesanallur Venkatraman's 2026-27 list for Chennai, which
// uses the vakya panchangam (tools/festival_check.mjs): all 47 of its days are
// found. Rules that list leaves out are left out here too: the panchanga yoga
// (Vyatipata, Vaidhriti ...), moudhyam (it lists 25 October 2026, with Venus
// combust), and B. V. Raman's marriage rules (empty 7th house, no malefic in
// the lagna), which belong to the other sub-tab's school.
// Personal factors (tarabala, chandrabala) aren't applied.
import * as swe from "./swe.js";
import { SE } from "./swe.js";
import { NAK_SPAN, julFromWall, lagnaAndMc, localFromJul, planetLon } from "./astro.js";
import { tamilDate } from "./festivals.js";
import { eclipseBetween } from "./muhurtha.js";

// Nakshatras are numbered from 0 = Ashwini; tithis from 0 = Shukla Pratipada
// (14 = Purnima, 15 = Krishna Pratipada, 29 = Amavasya); weekdays from 0 = Sunday;
// signs from 0 = Mesha.
const set = (...a) => new Set(a);
const WEEKDAY = set(0, 1, 3, 4, 5);
const BAD_SUN_SIGN = set(3, 5, 8); // Aadi, Purattasi, Margazhi
// Not Pratipada, Ashtami, Navami, Purnima, Amavasya or Krishna Chaturdashi
// (Chaturthi and Shukla Chaturdashi are used).
const TITHI = set(1, 2, 3, 4, 5, 6, 9, 10, 11, 12, 13, 16, 17, 18, 19, 20, 21, 24, 25, 26, 27);
// Ashwini, Rohini, Mrigashira, Punarvasu, Pushya, Uttara Phalguni, Hasta, Chitra,
// Swati, Anuradha, Mula, Uttara Ashadha, Shravana, Dhanishta, Shatabhisha,
// Uttara Bhadrapada, Revati.
const NAK = set(0, 3, 4, 6, 7, 11, 12, 13, 14, 16, 18, 20, 21, 22, 23, 25, 26);
// Kari naal: days of each Tamil month, Chithirai first.
const KARI_NAAL = {
  Chithirai: [6, 15], Vaikasi: [7, 16, 17], Aani: [1, 6], Aadi: [2, 10, 20],
  Avani: [2, 9, 28], Purattasi: [16, 29], Aippasi: [6, 20], Karthigai: [1, 10, 17],
  Margazhi: [6, 9, 11], Thai: [1, 2, 3, 11, 17], Maasi: [15, 16, 17], Panguni: [6, 15, 19],
};
// Tamil yogam by weekday (Sunday first) and nakshatra: [Amirtha, Marana,
// Prabalarishta]; every other nakshatra gives Siddha.
const YOGAM = [
  [[11, 18, 20, 21, 25, 26], [9, 15, 16, 17, 22], [1]],
  [[3, 6, 14, 21], [2, 9, 15, 19, 20, 24], [13]],
  [[3, 11, 18, 25], [5, 15, 17, 23, 24], [20]],
  [[2, 10, 11, 19, 20, 24], [0, 12, 18, 26], [22]],
  [[0, 6, 9, 14], [2, 3, 4, 5, 11, 23], [17]],
  [[0, 12, 18], [3, 7, 8, 9, 17, 21], [19]],
  [[3, 9, 23], [8, 11, 12, 13, 24], [26]],
];
// 1-based eighth of daytime, by weekday (Sunday first); as in astro.js.
const KALAMS = [[8, 2, 7, 5, 6, 4, 3], [5, 4, 3, 2, 1, 7, 6], [7, 6, 5, 4, 3, 2, 1]];
const SLOW = [["sun", SE.SUN], ["mercury", SE.MERCURY], ["venus", SE.VENUS], ["mars", SE.MARS],
  ["jupiter", SE.JUPITER], ["saturn", SE.SATURN], ["rahu", SE.MEAN_NODE]];

const TITHI_NAMES = ["Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi", "Saptami",
  "Ashtami", "Navami", "Dashami", "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi"];
const NAK_NAMES = ["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu",
  "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati",
  "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana",
  "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"];
const SIGN_NAMES = ["Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya",
  "Tula", "Vrischika", "Dhanu", "Makara", "Kumbha", "Meena"];

const STEP = 5 / 1440; // sampling step: 5 minutes
const MIN_LEN = 20 / 1440;
const norm = (x) => ((x % 360) + 360) % 360;
const sign = (lon) => Math.floor(norm(lon) / 30);

// `offset`: UTC offset in hours, or a function of the UTC instant (ms), as in festivalsFor.
// Returns null, or { paksha, tithi, nakshatra, yogam, windows: [{ start, end, lagna }] }.
export function tamilMuhurthaFor(dateWall, lat, lon, offset) {
  const offsetAt = typeof offset === "function" ? offset : () => offset;
  const weekday = new Date(dateWall).getUTCDay();
  if (!WEEKDAY.has(weekday)) return null;
  const wallOffset = offsetAt(dateWall - offsetAt(dateWall) * 3600e3);
  const midnight = julFromWall(dateWall, wallOffset);
  const sr = swe.riseTrans(midnight, SE.SUN, SE.CALC_RISE, lon, lat);
  const ss = sr && swe.riseTrans(sr, SE.SUN, SE.CALC_SET, lon, lat);
  if (!sr || !ss) return null;

  // The day's yogam, from the nakshatra at sunrise.
  const [amirtha, marana, prabala] = YOGAM[weekday];
  const nakAtSunrise = Math.floor(planetLon(sr, SE.MOON)[0] / NAK_SPAN);
  if (marana.includes(nakAtSunrise) || prabala.includes(nakAtSunrise)) return null;
  const yogam = amirtha.includes(nakAtSunrise) ? "Amirtha yogam" : "Siddha yogam";
  if (eclipseBetween(midnight, midnight + 1)) return null;

  const start = Math.max(sr - 1 / 24, julFromWall(dateWall + 5 * 3600e3 + 1000, wallOffset));
  const end = ss + 2 / 24;
  const eighth = (ss - sr) / 8;
  const kalams = KALAMS.map((t) => [sr + (t[weekday] - 1) * eighth, sr + t[weekday] * eighth]);
  // Planets other than the Moon barely move in a day: take their signs at the
  // start, and look again only if one changes sign before the end.
  const signsAt = (jd) => {
    const s = Object.fromEntries(SLOW.map(([k, p]) => [k, sign(planetLon(jd, p)[0])]));
    s.ketu = (s.rahu + 6) % 12;
    return s;
  };
  const sStart = signsAt(start), sEnd = signsAt(end);
  const steady = Object.keys(sStart).every((k) => sStart[k] === sEnd[k]);

  // State at jd: null if inauspicious, else its lagna (the window key).
  const state = (jd) => {
    if (kalams.some(([a, b]) => jd >= a && jd < b)) return null;
    const sun = planetLon(jd, SE.SUN)[0];
    if (BAD_SUN_SIGN.has(sign(sun))) return null;
    const moon = planetLon(jd, SE.MOON)[0];
    const el = norm(moon - sun);
    const ti = Math.floor(el / 12);
    if (!TITHI.has(ti)) return null;
    const k = Math.floor(el / 6);
    if (k >= 1 && k <= 56 && (k - 1) % 7 === 6) return null; // Vishti
    const nak = Math.floor(moon / NAK_SPAN);
    if (!NAK.has(nak)) return null;
    const lagnaLon = norm(lagnaAndMc(jd, lat, lon)[0]);
    if (lagnaLon % 30 < 1 || lagnaLon % 30 > 29) return null; // sandhi
    const lagna = sign(lagnaLon);
    const signs = { ...(steady ? sStart : signsAt(jd)), moon: sign(moon) };
    if (Object.values(signs).some((s) => (s - lagna + 12) % 12 === 7)) return null; // 8th house
    return { key: lagna, ti, nak, lagna };
  };

  // Moment between a (state sa) and b where the state stops being sa.
  const edge = (a, b, sa) => {
    for (let i = 0; i < 12; i++) {
      const m = (a + b) / 2;
      if ((state(m)?.key ?? null) === sa) a = m; else b = m;
    }
    return (a + b) / 2;
  };
  const raw = [];
  let cur = state(start), curStart = start, prevJd = start, prev = cur;
  for (let jd = start + STEP; ; jd += STEP) {
    const t = Math.min(jd, end);
    const s = t < end ? state(t) : null;
    if ((s?.key ?? null) !== (cur?.key ?? null)) {
      const e = edge(prevJd, t, prev?.key ?? null);
      if (cur) raw.push({ ...cur, start: curStart, end: e });
      cur = s; curStart = e;
    }
    prev = s; prevJd = t;
    if (t >= end) break;
  }
  const windows = raw.filter((w) => w.end - w.start >= MIN_LEN);
  if (!windows.length) return null;
  // Checked last: finding the Tamil date means looking back to the month's start.
  const td = tamilDate(dateWall, lat, lon, offset);
  if (td && (td.day === 1 || KARI_NAAL[td.month]?.includes(td.day))) return null;
  // Tithis and nakshatras across the windows (either can change inside one).
  const tithis = new Set(), naks = new Set();
  for (const w of windows) for (const jd of [w.start, w.end - 1e-5]) {
    const st = state(jd);
    if (st) { tithis.add(st.ti); naks.add(st.nak); }
  }

  const fmt = (jd) => localFromJul(jd, offsetAt((jd - 2440587.5) * 86400e3));
  return {
    paksha: windows[0].ti < 15 ? "Valarpirai" : "Theipirai",
    tithi: [...tithis].map((t) => TITHI_NAMES[t % 15]).join(" / "),
    nakshatra: [...naks].map((n) => NAK_NAMES[n]).join(" / "),
    yogam,
    windows: windows.map((w) => ({ start: fmt(w.start), end: fmt(w.end), lagna: SIGN_NAMES[w.lagna] })),
  };
}
