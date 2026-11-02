// Shubha muhurtham days in the style of Tamil calendars, with the events each
// time window suits.
//
// Every day must pass these, whatever the event:
//  - Weekday: not Tuesday or Saturday.
//  - Not a Kari naal (KARI_NAAL below) or the first day of a Tamil month.
//  - The day's yogam (weekday + sunrise nakshatra, YOGAM below) is Amirtha or
//    Siddha, not Marana or Prabalarishta.
// Every window must pass these:
//  - Between an hour before sunrise (but not before 5 am) and 1 pm, as in
//    Tamil calendars.
//  - Not in Rahu Kalam, Yamaganda, Gulika Kalam or Vishti (Bhadra) karana.
//  - Ashtama shuddhi: no planet (Moon included) in the 8th house from the lagna.
//  - At least 20 minutes long.
// Then each window is tagged with the events whose own rules it meets (EVENTS):
//  - Marriage: Tamil calendar practice. These rules reproduce all 47 days of
//    Harikesanallur Venkatraman's 2026-27 list for Chennai.
//  - Griha pravesham and starting education: the stars, weekdays and lagnas of
//    B. V. Raman's Muhurtha (chapters 12 and 11), with the Tamil tithis.
//  - New business: common panchangam practice (Raman has no chapter on it).
// A day is listed when at least one window suits at least one event.
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
// The same without the Rikta tithis (Chaturthi, Chaturdashi), which Raman and
// panchangam practice reject for house entry, education and business.
const NO_RIKTA = new Set([...TAMIL_TITHI].filter((t) => ![3, 13, 18].includes(t)));
const EVENTS = [
  { name: "Marriage", tithi: TAMIL_TITHI,
    // Ashwini, Rohini, Mrigashira, Punarvasu, Pushya, Uttara Phalguni, Hasta, Chitra,
    // Swati, Anuradha, Mula, Uttara Ashadha, Shravana, Dhanishta, Shatabhisha,
    // Uttara Bhadrapada, Revati.
    nak: set(0, 3, 4, 6, 7, 11, 12, 13, 14, 16, 18, 20, 21, 22, 23, 25, 26),
    weekday: set(0, 1, 3, 4, 5), months: true },
  { name: "Griha Pravesham", tithi: NO_RIKTA,
    // Raman's best and middling stars (Rohini, Mrigashira, Uttara Ashadha, Chitra,
    // Uttara Bhadrapada; Anuradha, Revati) and Uttara Phalguni, the third fixed star.
    nak: set(3, 4, 11, 13, 16, 20, 25, 26),
    weekday: set(1, 3, 4, 5), lagna: (s) => s % 3 !== 0, months: true, noCombust: true },
  { name: "Education", tithi: NO_RIKTA,
    // Raman's best stars (Ashwini, Mrigashira, Ardra, Punarvasu, Pushya, Hasta,
    // Chitra, Swati, Shravana, Dhanishta, Shatabhisha) and his neutral ones (Rohini,
    // Uttara Phalguni, Uttara Ashadha, Revati). Sunday he allows as acceptable.
    nak: set(0, 3, 4, 5, 6, 7, 11, 12, 13, 14, 20, 21, 22, 23, 26),
    weekday: set(0, 1, 3, 4, 5), lagna: (s) => s % 3 !== 1 },
  { name: "New business", tithi: NO_RIKTA,
    // Light, fixed and soft stars: Ashwini, Pushya, Hasta; Rohini and the three
    // Uttaras; Mrigashira, Chitra, Anuradha, Revati; and Punarvasu.
    nak: set(0, 3, 4, 6, 7, 11, 12, 13, 16, 20, 25, 26),
    weekday: set(1, 3, 4, 5), lagna: (s) => s % 3 !== 0, noMercuryRetro: true },
];
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
const gap = (a, b) => Math.abs(norm(a - b + 180) - 180);

// `offset`: UTC offset in hours, or a function of the UTC instant (ms), as in festivalsFor.
export function muhurthaFor(dateWall, lat, lon, offset) {
  const offsetAt = typeof offset === "function" ? offset : () => offset;
  const weekday = new Date(dateWall).getUTCDay();
  const events = EVENTS.filter((e) => e.weekday.has(weekday));
  if (!events.length) return null;
  const wallOffset = offsetAt(dateWall - offsetAt(dateWall) * 3600e3);
  const sr = swe.riseTrans(julFromWall(dateWall, wallOffset), SE.SUN, SE.CALC_RISE, lon, lat);
  const ss = sr && swe.riseTrans(sr, SE.SUN, SE.CALC_SET, lon, lat);
  if (!sr || !ss) return null;

  // The day's yogam, from the nakshatra at sunrise.
  const [amirtha, marana, prabala] = YOGAM[weekday];
  const nakAtSunrise = Math.floor(planetLon(sr, SE.MOON)[0] / NAK_SPAN);
  if (marana.includes(nakAtSunrise) || prabala.includes(nakAtSunrise)) return null;
  const yogam = amirtha.includes(nakAtSunrise) ? "Amirtha yogam" : "Siddha yogam";

  // Combustion and Mercury's motion, taken at midday.
  const noon = (sr + ss) / 2;
  const sunNoon = planetLon(noon, SE.SUN)[0];
  const [ven, venSpeed] = planetLon(noon, SE.VENUS);
  const combust = gap(planetLon(noon, SE.JUPITER)[0], sunNoon) < 11 || gap(ven, sunNoon) < (venSpeed < 0 ? 8 : 10);
  const mercuryRetro = planetLon(noon, SE.MERCURY)[1] < 0;

  const start = Math.max(sr - 1 / 24, julFromWall(dateWall + 5 * 3600e3 + 1000, wallOffset));
  const end = Math.min(julFromWall(dateWall + 13 * 3600e3, wallOffset), ss);
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

  // State at jd: null if no event suits it, else a key identifying the window
  // (lagna and events) it belongs to.
  const state = (jd) => {
    if (kalams.some(([a, b]) => jd >= a && jd < b)) return null;
    const sun = planetLon(jd, SE.SUN)[0];
    const moon = planetLon(jd, SE.MOON)[0];
    const el = norm(moon - sun);
    const k = Math.floor(el / 6);
    if (k >= 1 && k <= 56 && (k - 1) % 7 === 6) return null; // Vishti
    const lagna = sign(lagnaAndMc(jd, lat, lon)[0]);
    const signs = { ...(steady ? sStart : signsAt(jd)), moon: sign(moon) };
    if (Object.values(signs).some((s) => (s - lagna + 12) % 12 === 7)) return null;
    const ti = Math.floor(el / 12), nak = Math.floor(moon / NAK_SPAN), sunSign = sign(sun);
    const ok = events.filter((e) => e.tithi.has(ti) && e.nak.has(nak)
      && (!e.lagna || e.lagna(lagna)) && (!e.months || !BAD_SUN_SIGN.has(sunSign))
      && (!e.noCombust || !combust) && (!e.noMercuryRetro || !mercuryRetro)).map((e) => e.name);
    if (!ok.length) return null;
    return { key: `${lagna}:${ok.join()}`, ti, nak, lagna, events: ok };
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
  let cur = null, curStart = 0, prevJd = start, prev = state(start);
  if (prev) { cur = prev; curStart = start; }
  for (let jd = start + STEP; ; jd += STEP) {
    const t = Math.min(jd, end);
    const s = t < end ? state(t) : null;
    if ((s?.key ?? null) !== (cur?.key ?? null)) {
      const at = edge(prevJd, t, prev?.key ?? null);
      if (cur) raw.push({ ...cur, start: curStart, end: at });
      cur = s; curStart = at;
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
    windows: windows.map((w) => ({ start: fmt(w.start), end: fmt(w.end), lagna: SIGN_NAMES[w.lagna], events: w.events })),
  };
}
