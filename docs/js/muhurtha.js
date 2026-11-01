// Shubha muhurtham days in the style of Tamil calendars: days with a stretch
// of daytime where every one of these holds, and the time windows where they do.
//  - Tithi: Valarpirai (Shukla) Dwitiya, Tritiya, Panchami, Shashthi, Saptami,
//    Dashami, Ekadashi, Dwadashi, Trayodashi; Theipirai (Krishna) Dwitiya,
//    Tritiya, Panchami. Never Pratipada, Rikta (Chaturthi, Navami, Chaturdashi),
//    Ashtami, Purnima or Amavasya.
//  - Nakshatra: Ashwini, Rohini, Mrigashira, Punarvasu, Pushya, Magha,
//    Uttara Phalguni, Hasta, Chitra, Swati, Anuradha, Mula, Uttara Ashadha,
//    Shravana, Uttara Bhadrapada, Revati.
//  - Weekday: not Tuesday or Saturday.
//  - Tamil month: not Aadi, Purattasi or Margazhi (Sun in Karka, Kanya, Dhanu).
//  - Not a Kari naal: the fixed inauspicious days of each Tamil month, as
//    printed in Tamil calendars (KARI_NAAL below).
//  - Not in Rahu Kalam, Yamaganda, Gulika Kalam or Vishti (Bhadra) karana.
//  - Ashtama shuddhi: no planet (Moon included) in the 8th house from the
//    rising sign.
// Windows are reported per rising sign (lagna), between sunrise and sunset, and must last
// at least 20 minutes. Personal factors (tarabala, chandrabala) aren't applied.
import * as swe from "./swe.js";
import { SE } from "./swe.js";
import { NAK_SPAN, julFromWall, lagnaAndMc, localFromJul, planetLon } from "./astro.js";
import { tamilDate } from "./festivals.js";

const GOOD_TITHI = new Set([1, 2, 4, 5, 6, 9, 10, 11, 12, 16, 17, 19]); // 0 = Shukla Pratipada
const GOOD_NAK = new Set([0, 3, 4, 6, 7, 9, 11, 12, 13, 14, 16, 18, 20, 21, 25, 26]);
const BAD_WEEKDAY = new Set([2, 6]);
const BAD_SUN_SIGN = new Set([3, 5, 8]);
// Kari naal: days of each Tamil month, Chithirai first.
const KARI_NAAL = {
  Chithirai: [6, 15], Vaikasi: [7, 16, 17], Aani: [1, 6], Aadi: [2, 10, 20],
  Avani: [2, 9, 28], Purattasi: [16, 29], Aippasi: [6, 20], Karthigai: [1, 10, 17],
  Margazhi: [6, 9, 11], Thai: [1, 2, 3, 11, 17], Maasi: [15, 16, 17], Panguni: [6, 15, 19],
};
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
export function muhurthaFor(dateWall, lat, lon, offset) {
  const offsetAt = typeof offset === "function" ? offset : () => offset;
  const weekday = new Date(dateWall).getUTCDay();
  if (BAD_WEEKDAY.has(weekday)) return null;
  const wallOffset = offsetAt(dateWall - offsetAt(dateWall) * 3600e3);
  const sr = swe.riseTrans(julFromWall(dateWall, wallOffset), SE.SUN, SE.CALC_RISE, lon, lat);
  const ss = sr && swe.riseTrans(sr, SE.SUN, SE.CALC_SET, lon, lat);
  if (!sr || !ss) return null;

  const eighth = (ss - sr) / 8;
  const kalams = KALAMS.map((t) => [sr + (t[weekday] - 1) * eighth, sr + t[weekday] * eighth]);
  // Planets other than the Moon barely move in a day: take their signs at midday,
  // and look again only if one changes sign during the day.
  const signsAt = (jd) => {
    const s = Object.fromEntries(SLOW.map(([k, p]) => [k, sign(planetLon(jd, p)[0])]));
    s.ketu = (s.rahu + 6) % 12;
    return s;
  };
  const sMorning = signsAt(sr), sEvening = signsAt(ss);
  const steady = Object.keys(sMorning).every((k) => sMorning[k] === sEvening[k]);

  // State at jd: null if inauspicious, else a key identifying the window it belongs to.
  const state = (jd) => {
    if (kalams.some(([a, b]) => jd >= a && jd < b)) return null;
    const sun = planetLon(jd, SE.SUN)[0];
    if (BAD_SUN_SIGN.has(sign(sun))) return null;
    const moon = planetLon(jd, SE.MOON)[0];
    const el = norm(moon - sun);
    const ti = Math.floor(el / 12);
    if (!GOOD_TITHI.has(ti)) return null;
    const k = Math.floor(el / 6);
    if (k >= 1 && k <= 56 && (k - 1) % 7 === 6) return null; // Vishti
    const nak = Math.floor(moon / NAK_SPAN);
    if (!GOOD_NAK.has(nak)) return null;
    const lagna = sign(lagnaAndMc(jd, lat, lon)[0]);
    const signs = { ...(steady ? sMorning : signsAt(jd)), moon: sign(moon) };
    if (Object.values(signs).some((s) => (s - lagna + 12) % 12 === 7)) return null;
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
  let cur = null, curStart = 0, prevJd = sr, prev = state(sr);
  if (prev) { cur = prev; curStart = sr; }
  for (let jd = sr + STEP; ; jd += STEP) {
    const t = Math.min(jd, ss);
    const s = t < ss ? state(t) : null;
    if ((s?.key ?? null) !== (cur?.key ?? null)) {
      const at = edge(prevJd, t, prev?.key ?? null);
      if (cur) raw.push({ ...cur, start: curStart, end: at });
      cur = s; curStart = at;
    }
    prev = s; prevJd = t;
    if (t >= ss) break;
  }
  const windows = raw.filter((w) => w.end - w.start >= MIN_LEN);
  if (!windows.length) return null;
  // Checked last: finding the Tamil date means looking back to the month's start.
  const td = tamilDate(dateWall, lat, lon, offset);
  if (td && KARI_NAAL[td.month]?.includes(td.day)) return null;
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
    windows: windows.map((w) => ({ start: fmt(w.start), end: fmt(w.end), lagna: SIGN_NAMES[w.lagna] })),
  };
}
