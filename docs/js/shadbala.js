// Shadbala (six-fold planetary strength) per Brihat Parashara Hora Shastra.
// Port of app/shadbala.py. All values in virupas (60 virupas = 1 rupa).
import * as swe from "./swe.js";
import { SE } from "./swe.js";

export const PLANETS7 = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"];
const PID = { sun: SE.SUN, moon: SE.MOON, mars: SE.MARS, mercury: SE.MERCURY,
  jupiter: SE.JUPITER, venus: SE.VENUS, saturn: SE.SATURN };

// Deep exaltation points (sidereal longitude).
const EXALTATION = { sun: 10, moon: 33, mars: 298, mercury: 165, jupiter: 95, venus: 357, saturn: 200 };
// Moolatrikona sign and degree range within it.
const MOOLATRIKONA = { sun: [4, 0, 20], moon: [1, 3, 30], mars: [0, 0, 12], mercury: [5, 15, 20],
  jupiter: [8, 0, 10], venus: [6, 0, 15], saturn: [10, 0, 20] };
const SIGN_LORD = ["mars", "venus", "mercury", "moon", "sun", "mercury",
  "venus", "mars", "jupiter", "saturn", "saturn", "jupiter"];
// Natural relationships: friends, enemies (the rest are neutral).
const NATURAL = {
  sun: [["moon", "mars", "jupiter"], ["venus", "saturn"]],
  moon: [["sun", "mercury"], []],
  mars: [["sun", "moon", "jupiter"], ["mercury"]],
  mercury: [["sun", "venus"], ["moon"]],
  jupiter: [["sun", "moon", "mars"], ["mercury", "venus"]],
  venus: [["mercury", "saturn"], ["sun", "moon"]],
  saturn: [["mercury", "venus"], ["sun", "moon", "mars"]],
};
// Saptavargaja points by compound relationship.
const VARGA_POINTS = { mt: 45, own: 30, great_friend: 22.5, friend: 15, neutral: 7.5,
  enemy: 3.75, great_enemy: 1.875 };

const MALE = ["sun", "mars", "jupiter"], NEUTER = ["mercury", "saturn"], FEMALE = ["moon", "venus"];
// Dig bala: house (1/4/7/10) where each planet is strongest.
const DIG_STRONG = { sun: 10, mars: 10, jupiter: 1, mercury: 1, moon: 4, venus: 4, saturn: 7 };
const NAISARGIKA = { sun: 60.0, moon: 51.43, venus: 42.86, jupiter: 34.29,
  mercury: 25.71, mars: 17.14, saturn: 8.57 };
// Minimum required Shadbala in rupas, for "% strength".
const REQUIRED = { sun: 5.0, moon: 6.0, mars: 5.0, mercury: 7.0, jupiter: 6.5, venus: 5.5, saturn: 5.0 };

const WEEKDAY_LORD = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"];
const CHALDEAN = ["saturn", "jupiter", "mars", "sun", "venus", "mercury", "moon"];

// Surya Siddhanta: revolutions per mahayuga, with bija corrections, for mean
// planets and sighrocchas (Cheshta bala).
const SS_DAYS = 1577917828;
const SS_REV = { sun: 4320000, mars: 2296832, mercury: 17937060 + 16, jupiter: 364220 - 8,
  venus: 7022376 - 12, saturn: 146568 + 8 };
const KALI_EPOCH_JD = 588465.5 - 75.77 / 360; // midnight at Ujjain, 18 Feb 3102 BCE
const KALI_EPOCH_JDN = 588466; // a Friday

const mod = (a, n) => ((a % n) + n) % n;
const w180 = (x) => mod(x + 180, 360) - 180;
const sign = (lon) => mod(Math.floor(lon / 30), 12);

// ---------- divisional charts used by Saptavargaja bala ----------

function vargaSigns(lon) {
  const s = sign(lon), d = mod(lon, 30);
  const odd = s % 2 === 0; // Aries (index 0) is an odd sign
  const hora = odd ? (d < 15 ? 4 : 3) : (d < 15 ? 3 : 4); // Leo / Cancer
  const drekkana = (s + 4 * Math.floor(d / 10)) % 12;
  const saptamsa = ((odd ? s : s + 6) + Math.floor((d * 7) / 30)) % 12;
  const navamsa = mod(Math.floor((lon * 9) / 30), 12);
  const dwadasamsa = (s + Math.floor((d * 12) / 30)) % 12;
  const trimsamsa = odd
    ? (d < 5 ? 0 : d < 10 ? 10 : d < 18 ? 8 : d < 25 ? 2 : 6)
    : (d < 5 ? 1 : d < 12 ? 5 : d < 20 ? 11 : d < 25 ? 9 : 7);
  return { D1: s, D2: hora, D3: drekkana, D7: saptamsa, D9: navamsa, D12: dwadasamsa, D30: trimsamsa };
}

function compoundRelation(p, other, rasi) {
  const [friends, enemies] = NATURAL[p];
  const natural = friends.includes(other) ? 1 : enemies.includes(other) ? -1 : 0;
  const temporal = [1, 2, 3, 9, 10, 11].includes(mod(rasi[other] - rasi[p], 12)) ? 1 : -1;
  return { 2: "great_friend", 1: "friend", 0: "neutral", "-1": "enemy", "-2": "great_enemy" }[natural + temporal];
}

export function saptavargaja(p, lons) {
  const rasi = Object.fromEntries(PLANETS7.map((q) => [q, sign(lons[q])]));
  let total = 0;
  for (const [varga, s] of Object.entries(vargaSigns(lons[p]))) {
    const lord = SIGN_LORD[s];
    const [mtSign, lo, hi] = MOOLATRIKONA[p];
    const deg = mod(lons[p], 30);
    if (varga === "D1" && s === mtSign && lo <= deg && deg < hi) total += VARGA_POINTS.mt;
    else if (lord === p) total += VARGA_POINTS.own;
    else total += VARGA_POINTS[compoundRelation(p, lord, rasi)];
  }
  return total;
}

// ---------- the six balas ----------

export const uchcha = (p, lon) => Math.abs(w180(lon - (EXALTATION[p] + 180))) / 3;

function ojayugma(p, lon) {
  const wantEven = p === "moon" || p === "venus";
  let pts = 0;
  for (const s of [sign(lon), mod(Math.floor((lon * 9) / 30), 12)]) {
    if ((s % 2 === 1) === wantEven) pts += 15;
  }
  return pts;
}

function kendradi(lon, lagna) {
  const house = mod(sign(lon) - sign(lagna), 12) + 1;
  return [1, 4, 7, 10].includes(house) ? 60 : [2, 5, 8, 11].includes(house) ? 30 : 15;
}

function drekkanaBala(p, lon) {
  const part = Math.floor(mod(lon, 30) / 10);
  const group = part === 0 ? MALE : part === 1 ? NEUTER : FEMALE;
  return group.includes(p) ? 15 : 0;
}

function digBala(p, lon, asc, mc) {
  const strong = { 1: asc, 4: mc + 180, 7: asc + 180, 10: mc }[DIG_STRONG[p]];
  return Math.abs(w180(lon - (strong + 180))) / 3;
}

const ssMean = (key, jd) => mod((360 * SS_REV[key] * (jd - KALI_EPOCH_JD)) / SS_DAYS, 360);

// Cheshta bala for Mars..Saturn from the Surya Siddhanta cheshta kendra.
export function cheshtaKendraBala(p, jd, trueLon) {
  let mean, sighrocca;
  if (p === "mars" || p === "jupiter" || p === "saturn") [mean, sighrocca] = [ssMean(p, jd), ssMean("sun", jd)];
  else [mean, sighrocca] = [ssMean("sun", jd), ssMean(p, jd)];
  const avg = mean + w180(trueLon - mean) / 2;
  return Math.abs(w180(sighrocca - avg)) / 3;
}

// Aspect strength (virupas) cast across angular distance d (0-360).
function drishti(d, aspecting) {
  d = mod(d, 360);
  if (aspecting === "mars" && ((d >= 90 && d < 120) || (d >= 210 && d < 240))) return 60;
  if (aspecting === "jupiter" && ((d >= 120 && d < 150) || (d >= 240 && d < 270))) return 60;
  if (aspecting === "saturn" && ((d >= 60 && d < 90) || (d >= 270 && d < 300))) return 60;
  if (d >= 30 && d < 60) return (d - 30) / 2;
  if (d >= 60 && d < 90) return d - 60 + 15;
  if (d >= 90 && d < 120) return (120 - d) / 2 + 30;
  if (d >= 120 && d < 150) return 150 - d;
  if (d >= 150 && d < 180) return (d - 150) * 2;
  if (d >= 180 && d < 300) return (300 - d) / 2;
  return 0;
}

// Ayana bala from declination: Moon/Saturn gain in south declination,
// Mercury in either, the rest in north.
function ayanaBala(p, dec) {
  if (p === "moon" || p === "saturn") return ((24 - dec) * 60) / 48;
  if (p === "mercury") return ((24 + Math.abs(dec)) * 60) / 48;
  return ((24 + dec) * 60) / 48;
}

// lons: sidereal longitudes (sun..saturn); weekday: Sunday = 0, from sunrise.
// Planetary war (yuddha bala) is not applied.
export function compute({ jd, lat, lon, lons, lagna, mc, sunrise, sunset, nextSunrise, weekday }) {
  const elong = mod(lons.moon - lons.sun, 360);
  const angle = Math.min(elong, 360 - elong);
  const benefic = new Set(["jupiter", "venus", "mercury", ...(elong < 180 ? ["moon"] : [])]);

  // Nathonnatha: hour angle of the Sun (0 at local noon, 180 at midnight).
  const armc = swe.housesEx(jd, lat, lon, "E").ascmc[2];
  const sunRa = swe.calcUt(jd, SE.SUN, SE.FLG_SWIEPH | SE.FLG_EQUATORIAL)[0];
  const hourAngle = Math.abs(w180(armc - sunRa));

  const isDay = sunrise <= jd && jd < sunset;
  let frac, thirds, horaIndex;
  if (isDay) {
    frac = (jd - sunrise) / (sunset - sunrise);
    thirds = ["mercury", "sun", "saturn"];
    horaIndex = Math.floor(frac * 12);
  } else {
    frac = (jd - sunset) / (nextSunrise - sunset);
    thirds = ["moon", "venus", "mars"];
    horaIndex = 12 + Math.floor(frac * 12);
  }
  const tribhagaLord = thirds[Math.min(Math.floor(frac * 3), 2)];
  const varaLord = WEEKDAY_LORD[weekday];
  const horaLord = CHALDEAN[(CHALDEAN.indexOf(varaLord) + horaIndex) % 7];

  // Year (360-day) and month (30-day) lords from the Kali ahargana.
  const dayJdn = Math.floor(sunrise + 0.5);
  const ahargana = dayJdn - KALI_EPOCH_JDN;
  const abdaLord = WEEKDAY_LORD[mod(KALI_EPOCH_JDN + 360 * Math.floor(ahargana / 360) + 1, 7)];
  const masaLord = WEEKDAY_LORD[mod(KALI_EPOCH_JDN + 30 * Math.floor(ahargana / 30) + 1, 7)];

  const out = {};
  for (const p of PLANETS7) {
    const lonP = lons[p];
    const dec = swe.calcUt(jd, PID[p], SE.FLG_SWIEPH | SE.FLG_EQUATORIAL)[1];
    const ayana = ayanaBala(p, dec);
    const paksha = benefic.has(p) ? angle / 3 : 60 - angle / 3;

    const sthana = uchcha(p, lonP) + saptavargaja(p, lons) + ojayugma(p, lonP)
      + kendradi(lonP, lagna) + drekkanaBala(p, lonP);
    const dig = digBala(p, lonP, lagna, mc);
    let nathonnatha;
    if (p === "mercury") nathonnatha = 60;
    else if (p === "moon" || p === "mars" || p === "saturn") nathonnatha = (60 * hourAngle) / 180;
    else nathonnatha = (60 * (180 - hourAngle)) / 180;
    const tribhaga = p === "jupiter" || p === tribhagaLord ? 60 : 0;
    const lords = (p === abdaLord ? 15 : 0) + (p === masaLord ? 30 : 0)
      + (p === varaLord ? 45 : 0) + (p === horaLord ? 60 : 0);
    const kala = nathonnatha + paksha + tribhaga + lords + (p === "sun" ? 2 * ayana : ayana);

    let cheshta;
    if (p === "sun") cheshta = ayana;
    else if (p === "moon") cheshta = paksha;
    else cheshta = cheshtaKendraBala(p, jd, lonP);

    let drik = 0;
    for (const a of PLANETS7) {
      if (a !== p) {
        const v = drishti(lonP - lons[a], a);
        drik += benefic.has(a) ? v : -v;
      }
    }
    drik /= 4;

    const naisargika = NAISARGIKA[p];
    const total = sthana + dig + kala + cheshta + naisargika + drik;
    out[p] = { sthana, dig, kala, cheshta, naisargika, drik, total,
      rupas: total / 60, required: REQUIRED[p], ratio: total / 60 / REQUIRED[p] };
  }
  return out;
}
