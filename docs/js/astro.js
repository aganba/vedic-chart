// Vedic astrology calculations on top of Swiss Ephemeris (WebAssembly).
// A line-by-line port of app/astro.py; tools/parity.mjs checks the two agree.
//
// Defaults reproduce Jagannatha Hora: True Chitrapaksha ayanamsa, true
// (geometric) planet positions, mean node for Rahu, and the lagna computed as
// the apparent tropical ascendant minus the true-position ayanamsa without
// nutation.
import * as swe from "./swe.js";
import { SE } from "./swe.js";
import * as shadbala from "./shadbala.js";
import { vimshottari } from "./dasha.js";
import { festivalsFor } from "./festivals.js";

export const AYANAMSAS = {
  true_chitra: ["True Chitrapaksha", SE.SIDM_TRUE_CITRA],
  lahiri: ["Lahiri", SE.SIDM_LAHIRI],
  raman: ["Raman", SE.SIDM_RAMAN],
  kp: ["Krishnamurti (KP)", SE.SIDM_KRISHNAMURTI],
};

export const BHAVA_METHODS = {
  equal_mid: "Equal, lagna at middle of 1st house",
  sripati: "Sripati",
  placidus: "Placidus",
};

const PLANET_FLAGS = SE.FLG_SWIEPH | SE.FLG_SIDEREAL | SE.FLG_TRUEPOS | SE.FLG_SPEED;
const LAGNA_AYANAMSA_FLAGS = SE.FLG_SWIEPH | SE.FLG_TRUEPOS | SE.FLG_NONUT;

export const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
export const SIGNS_SKT = ["Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya",
  "Tula", "Vrischika", "Dhanu", "Makara", "Kumbha", "Meena"];
export const SIGN_ABBR = ["Ar", "Ta", "Ge", "Cn", "Le", "Vi", "Li", "Sc", "Sg", "Cp", "Aq", "Pi"];

// [key, name, abbreviation, swisseph id]; Ketu is derived from Rahu.
const PLANETS = [
  ["sun", "Sun", "Su", SE.SUN],
  ["moon", "Moon", "Mo", SE.MOON],
  ["mars", "Mars", "Ma", SE.MARS],
  ["mercury", "Mercury", "Me", SE.MERCURY],
  ["jupiter", "Jupiter", "Ju", SE.JUPITER],
  ["venus", "Venus", "Ve", SE.VENUS],
  ["saturn", "Saturn", "Sa", SE.SATURN],
  ["rahu", "Rahu", "Ra", SE.MEAN_NODE],
];

const NAKSHATRAS = ["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
  "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta",
  "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha",
  "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada",
  "Uttara Bhadrapada", "Revati"];
const NAK_LORDS = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
export const NAK_SPAN = 360 / 27;

const TITHIS = ["Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi",
  "Saptami", "Ashtami", "Navami", "Dashami", "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi"];
const YOGAS = ["Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda",
  "Sukarma", "Dhriti", "Shula", "Ganda", "Vriddhi", "Dhruva", "Vyaghata", "Harshana", "Vajra",
  "Siddhi", "Vyatipata", "Variyan", "Parigha", "Shiva", "Siddha", "Sadhya", "Shubha", "Shukla",
  "Brahma", "Indra", "Vaidhriti"];
const MOVABLE_KARANAS = ["Bava", "Balava", "Kaulava", "Taitila", "Gara", "Vanija", "Vishti"];
// Hora lords in descending order of speed, and each vara lord's place in it.
const HORA_ORDER = ["Sun", "Venus", "Mercury", "Moon", "Saturn", "Jupiter", "Mars"];
const HORA_START = [0, 3, 6, 2, 5, 1, 4]; // Sunday first
const VARAS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const VARA_SKT = ["Ravivara", "Somavara", "Mangalavara", "Budhavara", "Guruvara",
  "Shukravara", "Shanivara"];
const MASAS = ["Chaitra", "Vaishakha", "Jyeshtha", "Ashadha", "Shravana", "Bhadrapada",
  "Ashvayuja", "Kartika", "Margashirsha", "Pausha", "Magha", "Phalguna"];
export const SAMVATSARAS = [
  "Prabhava", "Vibhava", "Shukla", "Pramoda", "Prajapati", "Angirasa", "Shrimukha",
  "Bhava", "Yuva", "Dhatu", "Ishvara", "Bahudhanya", "Pramathi", "Vikrama", "Vrisha",
  "Chitrabhanu", "Subhanu", "Tarana", "Parthiva", "Vyaya", "Sarvajit", "Sarvadhari",
  "Virodhi", "Vikriti", "Khara", "Nandana", "Vijaya", "Jaya", "Manmatha", "Durmukhi",
  "Hevilambi", "Vilambi", "Vikari", "Sharvari", "Plava", "Shubhakrit", "Shobhakrit",
  "Krodhi", "Vishvavasu", "Parabhava", "Plavanga", "Kilaka", "Saumya", "Sadharana",
  "Virodhikrit", "Paridhavi", "Pramadi", "Ananda", "Rakshasa", "Nala", "Pingala",
  "Kalayukti", "Siddharthi", "Raudri", "Durmati", "Dundubhi", "Rudhirodgari",
  "Raktakshi", "Krodhana", "Akshaya",
];
const KARAKAS = ["AK", "AmK", "BK", "MK", "PiK", "PK", "GK", "DK"];

// 1-based eighth of daytime, indexed by weekday (Sunday first).
const RAHU_KALAM = [8, 2, 7, 5, 6, 4, 3];
const YAMAGANDA = [5, 4, 3, 2, 1, 7, 6];
const GULIKA_KALAM = [7, 6, 5, 4, 3, 2, 1];

// ---------- helpers ----------

export const norm = (x) => ((x % 360) + 360) % 360;
export const wrap180 = (x) => norm(x + 180) - 180;
const round2 = (x) => Math.round(x * 100) / 100;
const floorDiv = (a, b) => Math.floor(a / b);

export function dms(x) {
  const d = norm(x) % 30;
  let deg = Math.floor(d);
  const mF = (d - deg) * 60;
  let mins = Math.floor(mF);
  let sec = round2((mF - mins) * 60);
  if (sec >= 60) { sec = 0; mins += 1; }
  if (mins >= 60) { mins = 0; deg += 1; }
  const pad = (n, w) => String(n).padStart(w, "0");
  return { deg, min: mins, sec, text: `${deg}° ${pad(mins, 2)}′ ${sec.toFixed(2).padStart(5, "0")}″` };
}

export function nakshatraOf(lon) {
  const idx = Math.floor(lon / NAK_SPAN);
  const within = lon - idx * NAK_SPAN;
  return { index: idx, name: NAKSHATRAS[idx], pada: Math.floor(within / (NAK_SPAN / 4)) + 1,
    lord: NAK_LORDS[idx % 9], pct_left: round2((1 - within / NAK_SPAN) * 100) };
}

export const navamsaSign = (lon) => Math.floor((lon * 9) / 30) % 12;

// Local wall-clock times are carried as "wall ms": Date.UTC() of the local
// fields, so arithmetic is done without any browser time-zone involvement.
export function wallMs(y, mo, d, h = 0, mi = 0, s = 0) {
  return Date.UTC(y, mo - 1, d, h, mi, s);
}

export function isoFromWall(ms) {
  return new Date(ms).toISOString().slice(0, 19);
}

export function julFromWall(ms, offsetHours) {
  const ut = new Date(ms - Math.round(offsetHours * 3600e3));
  const hour = ut.getUTCHours() + ut.getUTCMinutes() / 60
    + (ut.getUTCSeconds() + ut.getUTCMilliseconds() / 1000) / 3600;
  return swe.julday(ut.getUTCFullYear(), ut.getUTCMonth() + 1, ut.getUTCDate(), hour);
}

// Local wall ms (truncated to whole seconds) for a Julian day in UT.
export function wallFromJul(jd, offsetHours) {
  const [y, m, d, h] = swe.revjul(jd);
  const us = Date.UTC(y, m - 1, d) * 1000 + Math.round(h * 3600e6) + Math.round(offsetHours * 3600e6);
  return Math.floor(us / 1e6) * 1000;
}

export const localFromJul = (jd, offsetHours) => isoFromWall(wallFromJul(jd, offsetHours));

// ---------- positions ----------

export function planetLon(jd, pid) {
  const xx = swe.calcUt(jd, pid, PLANET_FLAGS);
  return [xx[0], xx[3]];
}

export function lagnaAndMc(jd, lat, lon) {
  const { ascmc } = swe.housesEx(jd, lat, lon, "E");
  const ay = swe.getAyanamsaExUt(jd, LAGNA_AYANAMSA_FLAGS);
  return [norm(ascmc[0] - ay), norm(ascmc[1] - ay), ay];
}

export function bhavas(method, jd, lat, lon, asc, mc, ay) {
  let mids, starts;
  if (method === "equal_mid") {
    mids = Array.from({ length: 12 }, (_, i) => norm(asc + 30 * i));
    starts = mids.map((m) => norm(m - 15));
  } else if (method === "sripati") {
    const ic = norm(mc + 180), dsc = norm(asc + 180);
    const anchors = [asc, ic, dsc, mc]; // madhyas of houses 1, 4, 7, 10
    mids = [];
    for (let q = 0; q < 4; q++) {
      const a = anchors[q], b = anchors[(q + 1) % 4];
      const arc = norm(b - a);
      mids.push(a, norm(a + arc / 3), norm(a + (2 * arc) / 3));
    }
    starts = mids.map((m, i) => {
      const prev = mids[(i + 11) % 12];
      return norm(prev + norm(m - prev) / 2);
    });
  } else if (method === "placidus") {
    const { cusps } = swe.housesEx(jd, lat, lon, "P");
    starts = cusps.slice(0, 12).map((c) => norm(c - ay));
    mids = starts.map((s, i) => norm(s + norm(starts[(i + 1) % 12] - s) / 2));
  } else {
    throw new Error(`unknown bhava method ${method}`);
  }
  return starts.map((start, i) => {
    const end = starts[(i + 1) % 12], mid = mids[i];
    return { house: i + 1, start, mid, end,
      start_sign: Math.floor(start / 30), mid_sign: Math.floor(mid / 30), end_sign: Math.floor(end / 30),
      start_dms: dms(start), mid_dms: dms(mid), end_dms: dms(end) };
  });
}

export function houseOf(lon, houses) {
  for (const h of houses) {
    if (norm(lon - h.start) < norm(h.end - h.start)) return h.house;
  }
  return 1;
}

// 8-karaka scheme (includes Rahu, counted backwards).
export function charaKarakas(lons) {
  const deg = {};
  for (const k of ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"]) deg[k] = lons[k] % 30;
  deg.rahu = 30 - (lons.rahu % 30);
  const order = Object.keys(deg).sort((a, b) => deg[b] - deg[a]);
  return Object.fromEntries(order.map((k, i) => [k, KARAKAS[i]]));
}

// ---------- panchanga ----------

const elongation = (jd) => norm(planetLon(jd, SE.MOON)[0] - planetLon(jd, SE.SUN)[0]);
const yogaSum = (jd) => norm(planetLon(jd, SE.MOON)[0] + planetLon(jd, SE.SUN)[0]);
const moonLon = (jd) => planetLon(jd, SE.MOON)[0];

// Newton iteration for f(jd) == target (angles in degrees).
export function solve(f, target, guess) {
  let jd = guess;
  for (let i = 0; i < 60; i++) {
    const d = wrap180(f(jd) - target);
    if (Math.abs(d) < 1e-7) break;
    const rate = wrap180(f(jd + 1e-3) - f(jd - 1e-3)) / 2e-3;
    jd -= d / rate;
  }
  return jd;
}

// Index of the current unit, its end time, and fraction left.
function endOf(f, unit, jd, approxRate) {
  const v = f(jd);
  const idx = Math.floor(v / unit);
  const target = (idx + 1) * unit;
  const end = solve(f, norm(target), jd + (target - v) / approxRate);
  return [idx, end, 1 - (v - idx * unit) / unit];
}

const sunEvent = (jdStart, lat, lon, event) => swe.riseTrans(jdStart, SE.SUN, event, lon, lat);

function karanaName(k) {
  if (k === 0) return "Kimstughna";
  if (k >= 57) return ["Shakuni", "Chatushpada", "Naga"][k - 57];
  return MOVABLE_KARANAS[(k - 1) % 7];
}

export function panchanga(jd, lat, lon, offset) {
  const loc = (t) => (t ? localFromJul(t, offset) : null);

  // Vedic day runs sunrise to sunrise.
  let sunrise = sunEvent(jd - 1.5, lat, lon, SE.CALC_RISE);
  if (sunrise !== null) {
    for (;;) {
      const nxt = sunEvent(sunrise + 0.01, lat, lon, SE.CALC_RISE);
      if (nxt === null || nxt > jd) break;
      sunrise = nxt;
    }
  }
  const sunset = sunrise ? sunEvent(sunrise, lat, lon, SE.CALC_SET) : null;
  const nextSunrise = sunset ? sunEvent(sunset, lat, lon, SE.CALC_RISE) : null;

  const dayRef = sunrise !== null ? sunrise : jd;
  const weekday = new Date(wallFromJul(dayRef, offset)).getUTCDay(); // Sunday = 0

  const [ti, tiEnd, tiLeft] = endOf(elongation, 12, jd, 12.19);
  const [nk, nkEnd, nkLeft] = endOf(moonLon, NAK_SPAN, jd, 13.2);
  const [yg, ygEnd, ygLeft] = endOf(yogaSum, NAK_SPAN, jd, 14.2);
  const [kr, krEnd, krLeft] = endOf(elongation, 6, jd, 12.19);

  // Amanta lunar month: named from the Sun's sign at the preceding new moon.
  const e = elongation(jd);
  const nmPrev = solve(elongation, 0, jd - e / 12.19);
  const nmNext = solve(elongation, 0, nmPrev + 29.53);
  const sPrev = Math.floor(planetLon(nmPrev, SE.SUN)[0] / 30);
  const sNext = Math.floor(planetLon(nmNext, SE.SUN)[0] / 30);
  const masa = (sPrev + 1) % 12;
  const local = new Date(wallFromJul(jd, offset));
  const year = local.getUTCFullYear(), month = local.getUTCMonth() + 1;
  const lunarYear = masa >= 9 && month <= 6 ? year - 1 : year;

  // Sunrise, sunset and the daytime periods are shown for the entered civil
  // date, whatever the time entered (the Vedic day above can start the day before).
  const midnight = Math.floor(wallFromJul(jd, offset) / 86400e3) * 86400e3;
  const daySunrise = sunEvent(julFromWall(midnight, offset), lat, lon, SE.CALC_RISE);
  const daySunset = daySunrise ? sunEvent(daySunrise, lat, lon, SE.CALC_SET) : null;
  const dayNextSunrise = daySunset ? sunEvent(daySunset, lat, lon, SE.CALC_RISE) : null;
  const civilWeekday = new Date(midnight).getUTCDay();

  const kalams = {};
  if (daySunrise && daySunset) {
    const eighth = (daySunset - daySunrise) / 8;
    for (const [name, table] of [["rahu_kalam", RAHU_KALAM], ["yamaganda", YAMAGANDA], ["gulika_kalam", GULIKA_KALAM]]) {
      const part = table[civilWeekday] - 1;
      kalams[name] = { start: loc(daySunrise + part * eighth), end: loc(daySunrise + (part + 1) * eighth) };
    }
    // Abhijit Muhurtha: the 8th of the 15 muhurthas of daytime, around local midday.
    const muhurtha = (daySunset - daySunrise) / 15;
    kalams.abhijit = { start: loc(daySunrise + 7 * muhurtha), end: loc(daySunrise + 8 * muhurtha) };
  }

  const nak = nakshatraOf(moonLon(jd));

  // Hora at the entered time: twelve equal parts of the Vedic day's daytime,
  // then twelve of its night, ruled in the Chaldean order from the vara lord.
  let hora = null;
  if (sunrise !== null && sunset !== null && nextSunrise !== null) {
    const night = jd >= sunset;
    const [from, to] = night ? [sunset, nextSunrise] : [sunrise, sunset];
    const len = (to - from) / 12;
    const i = Math.min(11, Math.floor((jd - from) / len));
    const n = (night ? 12 : 0) + i;
    const lordAt = (k) => HORA_ORDER[(HORA_START[weekday] + k) % 7];
    hora = { lord: lordAt(n), number: n + 1, night, start: loc(from + i * len), end: loc(from + (i + 1) * len),
      next_lord: lordAt(n + 1) };
  }

  return {
    samvatsara: SAMVATSARAS[(((lunarYear - 1987) % 60) + 60) % 60],
    masa: (sPrev === sNext ? "Adhika " : "") + MASAS[masa],
    vara: { name: VARAS[weekday], sanskrit: VARA_SKT[weekday] },
    tithi: { paksha: ti < 15 ? "Shukla" : "Krishna",
      name: ti === 14 ? "Purnima" : ti === 29 ? "Amavasya" : TITHIS[ti % 15],
      number: ti + 1, end: loc(tiEnd), pct_left: round2(tiLeft * 100) },
    nakshatra: { ...nak, end: loc(nkEnd), pct_left: round2(nkLeft * 100) },
    // Nakshatra at the entered civil date's sunrise (the one shown on the card).
    nakshatra_at_sunrise: daySunrise ? nakshatraOf(moonLon(daySunrise)).name : null,
    yoga: { name: YOGAS[yg], end: loc(ygEnd), pct_left: round2(ygLeft * 100) },
    karana: { name: karanaName(kr), end: loc(krEnd), pct_left: round2(krLeft * 100) },
    sunrise: loc(daySunrise), sunset: loc(daySunset), next_sunrise: loc(dayNextSunrise),
    ...kalams,
    hora,
    _raw: { sunrise, sunset, next_sunrise: nextSunrise, weekday },
  };
}

// ---------- top level ----------

// dt: local wall ms (see wallMs). Returns the same structure as the Python API.
export function computeChart(dt, offsetHours, lat, lon, ayanamsa = "true_chitra", bhavaMethod = "equal_mid") {
  if (!AYANAMSAS[ayanamsa]) throw new Error(`unknown ayanamsa ${ayanamsa}`);
  if (!BHAVA_METHODS[bhavaMethod]) throw new Error(`unknown bhava method ${bhavaMethod}`);
  swe.setSidMode(AYANAMSAS[ayanamsa][1]);
  const jd = julFromWall(dt, offsetHours);
  const [asc, mc, ay] = lagnaAndMc(jd, lat, lon);
  let houses;
  try {
    houses = bhavas(bhavaMethod, jd, lat, lon, asc, mc, ay);
  } catch (err) {
    // Placidus is undefined near the poles.
    if (bhavaMethod !== "placidus") throw err;
    bhavaMethod = "equal_mid";
    houses = bhavas(bhavaMethod, jd, lat, lon, asc, mc, ay);
  }

  const lons = {}, speeds = {};
  for (const [key, , , pid] of PLANETS) [lons[key], speeds[key]] = planetLon(jd, pid);
  lons.ketu = norm(lons.rahu + 180);
  speeds.ketu = speeds.rahu;
  const karakas = charaKarakas(lons);
  const panch = panchanga(jd, lat, lon, offsetHours);
  const raw = panch._raw;
  delete panch._raw;
  let strengths = {};
  if (raw.sunrise && raw.sunset && raw.next_sunrise) { // undefined in polar day/night
    strengths = shadbala.compute({
      jd, lat, lon, lons: Object.fromEntries(shadbala.PLANETS7.map((k) => [k, lons[k]])),
      lagna: asc, mc, sunrise: raw.sunrise, sunset: raw.sunset,
      nextSunrise: raw.next_sunrise, weekday: raw.weekday });
  }
  const dashas = vimshottari(jd, lons.moon, offsetHours);
  // Festivals on the entered civil date (local midnight of dt).
  panch.festivals = festivalsFor(Math.floor(dt / 86400e3) * 86400e3, lat, lon, offsetHours);

  const row = (key, name, abbr, x, speed = null) => ({
    key, name, abbr, lon: x, sign: Math.floor(x / 30), sign_name: SIGNS[Math.floor(x / 30)],
    dms: dms(x), nakshatra: nakshatraOf(x), navamsa: navamsaSign(x), house: houseOf(x, houses),
    retro: speed !== null && speed < 0 && key !== "rahu" && key !== "ketu",
    karaka: karakas[key] ?? null, shadbala: strengths[key] ?? null,
  });

  const bodies = [row("lagna", "Lagna", "Asc", asc)];
  for (const [k, n, a] of PLANETS) bodies.push(row(k, n, a, lons[k], speeds[k]));
  bodies.push(row("ketu", "Ketu", "Ke", lons.ketu, speeds.ketu));

  return {
    input: { local_time: isoFromWall(dt), utc_offset: offsetHours, lat, lon, julian_day_ut: jd },
    settings: { ayanamsa, ayanamsa_label: AYANAMSAS[ayanamsa][0], ayanamsa_value: ay,
      ayanamsa_dms: dms(ay).text, ayanamsa_deg: Math.floor(ay), bhava_method: bhavaMethod,
      bhava_label: BHAVA_METHODS[bhavaMethod] },
    lagna_sign: Math.floor(asc / 30),
    bodies,
    bhavas: houses,
    panchanga: panch,
    vimshottari: dashas,
    constants: { signs: SIGNS, signs_skt: SIGNS_SKT, sign_abbr: SIGN_ABBR },
  };
}
