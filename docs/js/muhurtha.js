// Shubha muhurtham days in the style of Tamil calendars, and the extra days
// that suit starting education.
//
// Every day must pass these:
//  - Not a Kari naal (KARI_NAAL below) or the first day of a Tamil month.
//  - Not an eclipse day: no new or full moon that day close enough to the
//    Moon's node for an eclipse anywhere.
//  - The day's yogam (weekday + sunrise nakshatra, YOGAM below) is Amirtha or
//    Siddha, not Marana or Prabalarishta.
// Every window must pass these:
//  - Between an hour before sunrise (but not before 5 am) and sunset.
//  - Not in Rahu Kalam, Yamaganda, Gulika Kalam or Vishti (Bhadra) karana.
//  - Panchanga yoga (BAD_YOGA below): not Vyatipata or Vaidhriti, not the
//    first half of Parigha, and not the opening ghatis (24 minutes each) of
//    Vishkambha, Vajra (3), Shula (5), Ganda, Atiganda (6) or Vyaghata (9).
//    Tamil calendars often skip this; it drops 3 of Harikesanallur's days.
//  - Ashtama shuddhi: no planet (Moon included) in the 8th house from the lagna.
//  - The lagna isn't in the first or last degree of its sign (sandhi).
//  - At least 20 minutes long.
// and the tithi, nakshatra, weekday, lagna and month rules of one of RULES:
//  - general: Tamil calendar practice for marriage and other auspicious
//    beginnings, plus three of Raman's marriage conditions: the 7th house from
//    the lagna is empty, no malefic (Sun, Mars, Saturn, Rahu, Ketu) is in the
//    lagna, and neither Jupiter nor Venus is combust (moudhyam). A malefic in
//    the lagna is excused by three of Raman's cancellations (chapter 5): Jupiter,
//    Venus or Mercury also in the lagna, any planet exalted in the lagna, or the
//    Sun or Moon in the 11th. Without them the rule drops about a third of the days.
//  - education: the stars, weekdays and lagnas of B. V. Raman's Muhurtha
//    (chapter 11), with the Tamil tithis less the Rikta ones. Checked only on
//    days that aren't general muhurtham days; most of these fall in Aadi,
//    Purattasi or Margazhi, or have Ardra nakshatra.
// Personal factors (tarabala, chandrabala) aren't applied.
import * as swe from "./swe.js";
import { SE } from "./swe.js";
import { NAK_SPAN, julFromWall, lagnaAndMc, localFromJul, planetLon } from "./astro.js";
import { tamilDate } from "./festivals.js";

// Nakshatras are numbered from 0 = Ashwini; tithis from 0 = Shukla Pratipada
// (14 = Purnima, 15 = Krishna Pratipada, 29 = Amavasya); weekdays from 0 = Sunday;
// signs from 0 = Mesha. Movable signs are sign % 3 === 0, fixed 1, dual 2.
const set = (...a) => new Set(a);
const BAD_SUN_SIGN = set(3, 5, 8); // Aadi, Purattasi, Margazhi
// Tithis used in Tamil calendar lists: not Pratipada, Ashtami, Navami, Purnima,
// Amavasya or Krishna Chaturdashi (Chaturthi and Shukla Chaturdashi are used).
const TAMIL_TITHI = set(1, 2, 3, 4, 5, 6, 9, 10, 11, 12, 13, 16, 17, 18, 19, 20, 21, 24, 25, 26, 27);
const RULES = {
  general: { tithi: TAMIL_TITHI,
    // Ashwini, Rohini, Mrigashira, Punarvasu, Pushya, Uttara Phalguni, Hasta, Chitra,
    // Swati, Anuradha, Mula, Uttara Ashadha, Shravana, Dhanishta, Shatabhisha,
    // Uttara Bhadrapada, Revati.
    nak: set(0, 3, 4, 6, 7, 11, 12, 13, 14, 16, 18, 20, 21, 22, 23, 25, 26),
    weekday: set(0, 1, 3, 4, 5), months: true, seventhEmpty: true, cleanLagna: true, noCombust: true },
  education: {
    // Without the Rikta tithis (Chaturthi, Chaturdashi), which Raman rejects.
    tithi: new Set([...TAMIL_TITHI].filter((t) => ![3, 13, 18].includes(t))),
    // Raman's best stars (Ashwini, Mrigashira, Ardra, Punarvasu, Pushya, Hasta,
    // Chitra, Swati, Shravana, Dhanishta, Shatabhisha) and his neutral ones (Rohini,
    // Uttara Phalguni, Uttara Ashadha, Revati). Sunday he allows as acceptable.
    nak: set(0, 3, 4, 5, 6, 7, 11, 12, 13, 14, 20, 21, 22, 23, 26),
    weekday: set(0, 1, 3, 4, 5), lagna: (s) => s % 3 !== 1 },
};
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
const MALEFICS = ["sun", "mars", "saturn", "rahu", "ketu"];
// Sign of exaltation (Rahu and Ketu left out: authorities differ).
const EXALTED = { sun: 0, moon: 1, mars: 9, mercury: 5, jupiter: 3, venus: 11, saturn: 6 };
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

// Panchanga yogas (0 = Vishkambha ... 26 = Vaidhriti) barred for their first
// so many ghatis; Parigha (18) is barred for its first half.
const BAD_YOGA = { 16: Infinity, 26: Infinity, 0: 3, 14: 3, 8: 5, 5: 6, 9: 6, 12: 9 };
const YOGA_SPAN = 360 / 27;

const STEP = 5 / 1440; // sampling step: 5 minutes
const MIN_LEN = 20 / 1440;
const norm = (x) => ((x % 360) + 360) % 360;
const sign = (lon) => Math.floor(norm(lon) / 30);
const gap = (a, b) => Math.abs(norm(a - b + 180) - 180);
const ONE_DAY = 1; // in jd

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

// `offset`: UTC offset in hours, or a function of the UTC instant (ms), as in festivalsFor.
// Returns null, or the day's windows with `kind` "general" or "education".
export function muhurthaFor(dateWall, lat, lon, offset) {
  const offsetAt = typeof offset === "function" ? offset : () => offset;
  const weekday = new Date(dateWall).getUTCDay();
  const kinds = Object.keys(RULES).filter((k) => RULES[k].weekday.has(weekday));
  if (!kinds.length) return null;
  const wallOffset = offsetAt(dateWall - offsetAt(dateWall) * 3600e3);
  const sr = swe.riseTrans(julFromWall(dateWall, wallOffset), SE.SUN, SE.CALC_RISE, lon, lat);
  const ss = sr && swe.riseTrans(sr, SE.SUN, SE.CALC_SET, lon, lat);
  if (!sr || !ss) return null;

  // The day's yogam, from the nakshatra at sunrise.
  const [amirtha, marana, prabala] = YOGAM[weekday];
  const nakAtSunrise = Math.floor(planetLon(sr, SE.MOON)[0] / NAK_SPAN);
  if (marana.includes(nakAtSunrise) || prabala.includes(nakAtSunrise)) return null;
  const yogam = amirtha.includes(nakAtSunrise) ? "Amirtha yogam" : "Siddha yogam";

  const midnight = julFromWall(dateWall, wallOffset);
  if (eclipseBetween(midnight, midnight + ONE_DAY)) return null;
  // Jupiter or Venus combust (too close to the Sun), taken at midday.
  const noon = (sr + ss) / 2;
  const sunNoon = planetLon(noon, SE.SUN)[0];
  const [ven, venSpeed] = planetLon(noon, SE.VENUS);
  const combust = gap(planetLon(noon, SE.JUPITER)[0], sunNoon) < 11 || gap(ven, sunNoon) < (venSpeed < 0 ? 8 : 10);

  const start = Math.max(sr - 1 / 24, julFromWall(dateWall + 5 * 3600e3 + 1000, wallOffset));
  const end = ss;
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

  // State at jd under rule r: null if inauspicious, else its lagna (the window key).
  const state = (jd, r) => {
    if (r.noCombust && combust) return null;
    if (kalams.some(([a, b]) => jd >= a && jd < b)) return null;
    const sun = planetLon(jd, SE.SUN)[0];
    if (r.months && BAD_SUN_SIGN.has(sign(sun))) return null;
    const moon = planetLon(jd, SE.MOON)[0];
    const el = norm(moon - sun);
    const ti = Math.floor(el / 12);
    if (!r.tithi.has(ti)) return null;
    const k = Math.floor(el / 6);
    if (k >= 1 && k <= 56 && (k - 1) % 7 === 6) return null; // Vishti
    // Panchanga yoga; ghatis since it began, from the current Sun + Moon speed.
    const yl = norm(moon + sun), yi = Math.floor(yl / YOGA_SPAN), into = yl - yi * YOGA_SPAN;
    if (yi === 18 && into < YOGA_SPAN / 2) return null; // Parigha
    if (yi in BAD_YOGA) {
      const rate = planetLon(jd, SE.MOON)[1] + planetLon(jd, SE.SUN)[1]; // degrees a day
      if ((into / rate) * 60 < BAD_YOGA[yi]) return null;
    }
    const nak = Math.floor(moon / NAK_SPAN);
    if (!r.nak.has(nak)) return null;
    const lagnaLon = norm(lagnaAndMc(jd, lat, lon)[0]);
    if (lagnaLon % 30 < 1 || lagnaLon % 30 > 29) return null; // sandhi
    const lagna = sign(lagnaLon);
    if (r.lagna && !r.lagna(lagna)) return null;
    const signs = { ...(steady ? sStart : signsAt(jd)), moon: sign(moon) };
    const houses = Object.values(signs).map((s) => (s - lagna + 12) % 12);
    if (houses.includes(7)) return null; // 8th house
    if (r.seventhEmpty && houses.includes(6)) return null;
    if (r.cleanLagna && MALEFICS.some((k) => signs[k] === lagna)) {
      const excused = ["jupiter", "venus", "mercury"].some((k) => signs[k] === lagna)
        || Object.entries(EXALTED).some(([k, s]) => signs[k] === lagna && s === lagna)
        || signs.sun === (lagna + 10) % 12 || signs.moon === (lagna + 10) % 12;
      if (!excused) return null;
    }
    return { key: lagna, ti, nak, lagna };
  };

  // Windows of at least MIN_LEN where rule r holds.
  const scan = (r) => {
    const at = (jd) => state(jd, r);
    // Moment between a (state sa) and b where the state stops being sa.
    const edge = (a, b, sa) => {
      for (let i = 0; i < 12; i++) {
        const m = (a + b) / 2;
        if ((at(m)?.key ?? null) === sa) a = m; else b = m;
      }
      return (a + b) / 2;
    };
    const raw = [];
    let cur = null, curStart = 0, prevJd = start, prev = at(start);
    if (prev) { cur = prev; curStart = start; }
    for (let jd = start + STEP; ; jd += STEP) {
      const t = Math.min(jd, end);
      const s = t < end ? at(t) : null;
      if ((s?.key ?? null) !== (cur?.key ?? null)) {
        const e = edge(prevJd, t, prev?.key ?? null);
        if (cur) raw.push({ ...cur, start: curStart, end: e });
        cur = s; curStart = e;
      }
      prev = s; prevJd = t;
      if (t >= end) break;
    }
    return raw.filter((w) => w.end - w.start >= MIN_LEN);
  };

  // General muhurtham first; education only on days that aren't.
  let kind = null, windows = [];
  for (const k of kinds) {
    windows = scan(RULES[k]);
    if (windows.length) { kind = k; break; }
  }
  if (!kind) return null;
  // Checked last: finding the Tamil date means looking back to the month's start.
  const td = tamilDate(dateWall, lat, lon, offset);
  if (td && (td.day === 1 || KARI_NAAL[td.month]?.includes(td.day))) return null;
  // Tithis and nakshatras across the windows (either can change inside one).
  const tithis = new Set(), naks = new Set();
  for (const w of windows) for (const jd of [w.start, w.end - 1e-5]) {
    const st = state(jd, RULES[kind]);
    if (st) { tithis.add(st.ti); naks.add(st.nak); }
  }

  const fmt = (jd) => localFromJul(jd, offsetAt((jd - 2440587.5) * 86400e3));
  return {
    kind,
    paksha: windows[0].ti < 15 ? "Valarpirai" : "Theipirai",
    tithi: [...tithis].map((t) => TITHI_NAMES[t % 15]).join(" / "),
    nakshatra: [...naks].map((n) => NAK_NAMES[n]).join(" / "),
    yogam,
    windows: windows.map((w) => ({ start: fmt(w.start), end: fmt(w.end), lagna: SIGN_NAMES[w.lagna] })),
  };
}
