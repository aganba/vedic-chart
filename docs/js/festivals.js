// Hindu festivals falling on a given civil date at a given place.
//
// Festivals are defined by rules rather than fixed dates:
//  - tithi rules: a tithi in an amanta lunar month, prevailing at a time of day
//    ("kaala": sunrise, madhyahna, aparahna, pradosha or nishita). The festival
//    falls on the first day whose kaala lies in the tithi; if the tithi spans no
//    kaala at all (kshaya), on the day in which it begins.
//  - solar rules: a solar month beginning. Tamil and Malayalam calendars start
//    the month that day if the sankranti falls before 3/5 of the daytime,
//    otherwise the next day; the pan-Indian Makara Sankranti uses sunset.
//  - nakshatra rules: a nakshatra in a Tamil (or Kerala) solar month. For the
//    full-moon festivals (Thai Poosam, Karthigai Deepam, ...) the nakshatra day
//    must belong to that month's Purnima, since the nakshatra can recur twice.
// Festivals are not observed in an adhika (leap) lunar month.
import * as swe from "./swe.js";
import { SE } from "./swe.js";
import { NAK_SPAN, julFromWall, localFromJul, planetLon, solve } from "./astro.js";

// amanta months: 0 Chaitra ... 11 Phalguna; tithis: 0 Shukla Pratipada ... 14 Purnima,
// 15 Krishna Pratipada ... 29 Amavasya; signs: 0 Mesha ... 11 Meena.
const TITHI_FESTIVALS = [
  { name: "Ugadi / Gudi Padwa (lunar New Year)", masa: 0, tithi: 0, kaala: "sunrise",
    region: "Andhra Pradesh, Telangana, Karnataka, Maharashtra" },
  { name: "Rama Navami", masa: 0, tithi: 8, kaala: "madhyahna", label: "Madhyahna puja" },
  { name: "Hanuman Jayanti", masa: 0, tithi: 14, kaala: "sunrise", region: "North India" },
  { name: "Akshaya Tritiya", masa: 1, tithi: 2, kaala: "sunrise" },
  { name: "Buddha Purnima", masa: 1, tithi: 14, kaala: "sunrise" },
  { name: "Guru Purnima", masa: 3, tithi: 14, kaala: "sunrise" },
  { name: "Nag Panchami", masa: 4, tithi: 4, kaala: "sunrise" },
  { name: "Yajur Upakarma (Avani Avittam)", masa: 4, tithi: 14, kaala: "sunrise", region: "South India" },
  { name: "Krishna Janmashtami", masa: 4, tithi: 22, kaala: "sunrise", show: "nishita", label: "Nishita puja" },
  { name: "Ganesh Chaturthi", masa: 5, tithi: 3, kaala: "madhyahna", label: "Madhyahna Ganesha puja" },
  { name: "Mahalaya Amavasya", masa: 5, tithi: 29, kaala: "aparahna", label: "Aparahna (tarpanam)" },
  { name: "Navaratri begins (Ghatasthapana)", masa: 6, tithi: 0, kaala: "sunrise" },
  { name: "Durga Ashtami", masa: 6, tithi: 7, kaala: "sunrise" },
  { name: "Maha Navami / Ayudha Puja", masa: 6, tithi: 8, kaala: "sunrise" },
  { name: "Vijayadashami / Dussehra", masa: 6, tithi: 9, kaala: "aparahna", label: "Aparahna puja" },
  { name: "Dhanteras", masa: 6, tithi: 27, kaala: "pradosha", label: "Pradosha (puja)" },
  { name: "Naraka Chaturdashi", masa: 6, tithi: 28, kaala: "sunrise",
    note: "Deepavali in South India; abhyanga snanam before sunrise." },
  { name: "Diwali (Lakshmi Puja)", masa: 6, tithi: 29, kaala: "pradosha", label: "Lakshmi puja (pradosha)" },
  { name: "Govardhan Puja / Bali Pratipada", masa: 7, tithi: 0, kaala: "sunrise" },
  { name: "Bhai Dooj", masa: 7, tithi: 1, kaala: "aparahna", label: "Aparahna" },
  { name: "Kartika Purnima", masa: 7, tithi: 14, kaala: "sunrise" },
  { name: "Vasant Panchami", masa: 10, tithi: 4, kaala: "sunrise" },
  { name: "Ratha Saptami", masa: 10, tithi: 6, kaala: "sunrise" },
  { name: "Maha Shivaratri", masa: 10, tithi: 28, kaala: "nishita", label: "Nishita kaal puja" },
  // Tithi within a Tamil solar month rather than a lunar month.
  { name: "Vaikuntha Ekadashi", solar: 8, tithi: 10, kaala: "sunrise", region: "Tamil Nadu" },
  { name: "Soora Samharam (Skanda Sashti)", solar: 6, tithi: 5, kaala: "sunset", label: "Soora Samharam (evening, from sunset)",
    region: "Tamil Nadu" },
];

// Nakshatra in an amanta lunar month, Shukla paksha, at sunrise (Upakarmas).
const LUNAR_NAKSHATRA_FESTIVALS = [
  { name: "Rig Upakarma", masa: 4, nak: 21, kaala: "sunrise", region: "South India" },
  { name: "Sama Upakarma", masa: 5, nak: 12, kaala: "sunrise", region: "South India" },
];

const SOLAR_FESTIVALS = [
  { name: "Makara Sankranti", calendar: "sunset", sign: 9, day: 1, sankranti: true },
  { name: "Bhogi", calendar: "tamil", sign: 9, day: 0, region: "Tamil Nadu, Andhra Pradesh" },
  { name: "Thai Pongal", calendar: "tamil", sign: 9, day: 1, sankranti: true, region: "Tamil Nadu" },
  { name: "Mattu Pongal", calendar: "tamil", sign: 9, day: 2, region: "Tamil Nadu" },
  { name: "Kaanum Pongal", calendar: "tamil", sign: 9, day: 3, region: "Tamil Nadu" },
  { name: "Puthandu (Tamil New Year)", calendar: "tamil", sign: 0, day: 1, sankranti: true, region: "Tamil Nadu" },
  { name: "Vishu", calendar: "kerala", sign: 0, day: 1, sankranti: true, region: "Kerala" },
  { name: "Aadi Perukku", calendar: "tamil", sign: 3, day: 18, region: "Tamil Nadu" },
];

const NAKSHATRA_FESTIVALS = [
  { name: "Thai Poosam", purnima: true, calendar: "tamil", sign: 9, nak: 7, kaala: "sunrise", region: "Tamil Nadu" },
  { name: "Panguni Uttiram", purnima: true, calendar: "tamil", sign: 11, nak: 11, kaala: "sunrise", region: "Tamil Nadu" },
  { name: "Vaikasi Visakam", purnima: true, calendar: "tamil", sign: 1, nak: 15, kaala: "sunrise", region: "Tamil Nadu" },
  { name: "Arudra Darshan", purnima: true, calendar: "tamil", sign: 8, nak: 5, kaala: "sunrise", region: "Tamil Nadu" },
  { name: "Karthigai Deepam", purnima: true, calendar: "tamil", sign: 7, nak: 2, kaala: "sunrise", lamp: true, region: "Tamil Nadu" },
  { name: "Onam (Thiruvonam)", calendar: "kerala", sign: 4, nak: 21, kaala: "sunrise", region: "Kerala" },
];

const TITHI_NAMES = ["Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi", "Saptami",
  "Ashtami", "Navami", "Dashami", "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi"];
const NAK_NAMES = ["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu",
  "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati",
  "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana",
  "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"];
const SIGN_NAMES = ["Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya",
  "Tula", "Vrischika", "Dhanu", "Makara", "Kumbha", "Meena"];

const norm = (x) => ((x % 360) + 360) % 360;
const sunLon = (jd) => planetLon(jd, SE.SUN)[0];
const moonLon = (jd) => planetLon(jd, SE.MOON)[0];
const elong = (jd) => norm(moonLon(jd) - sunLon(jd));
const tithiAt = (jd) => Math.floor(elong(jd) / 12);
const nakAt = (jd) => Math.floor(moonLon(jd) / NAK_SPAN);
const signAt = (jd) => Math.floor(sunLon(jd) / 30);

function tithiLabel(t) {
  if (t === 14) return "Purnima";
  if (t === 29) return "Amavasya";
  return `${t < 15 ? "Shukla" : "Krishna"} ${TITHI_NAMES[t % 15]}`;
}

export function festivalsFor(dateWall, lat, lon, offset) {
  const dayCache = new Map();
  const masaCache = new Map();

  // Sunrise/sunset frame of the civil day starting at local midnight + n days.
  function day(n) {
    if (dayCache.has(n)) return dayCache.get(n);
    const jd0 = julFromWall(dateWall + n * 86400e3, offset);
    const sr = swe.riseTrans(jd0, SE.SUN, SE.CALC_RISE, lon, lat);
    const ss = sr && swe.riseTrans(sr, SE.SUN, SE.CALC_SET, lon, lat);
    const nsr = ss && swe.riseTrans(ss, SE.SUN, SE.CALC_RISE, lon, lat);
    const d = sr && ss && nsr ? { sr, ss, nsr, len: ss - sr, night: nsr - ss } : null;
    dayCache.set(n, d);
    return d;
  }

  // [start, end] of a kaala window on day n.
  function kaala(n, name) {
    const d = day(n);
    if (!d) return null;
    switch (name) {
      case "sunrise": return [d.sr, d.sr];
      case "sunset": return [d.ss, d.ss];
      case "madhyahna": return [d.sr + d.len * 2 / 5, d.sr + d.len * 3 / 5];
      case "aparahna": return [d.sr + d.len * 3 / 5, d.sr + d.len * 4 / 5];
      case "pradosha": return [d.ss, d.ss + d.night / 5];
      case "nishita": return [d.ss + d.night * 7 / 15, d.ss + d.night * 8 / 15];
      default: throw new Error(`unknown kaala ${name}`);
    }
  }
  const mid = (w) => (w[0] + w[1]) / 2;

  // Amanta lunar month at jd: { masa, adhika }.
  function masaAt(jd) {
    const nm = solve(elong, 0, jd - elong(jd) / 12.19);
    const key = Math.round(nm * 4);
    if (!masaCache.has(key)) {
      const next = solve(elong, 0, nm + 29.53);
      const s0 = signAt(nm), s1 = signAt(next);
      masaCache.set(key, { masa: (s0 + 1) % 12, adhika: s0 === s1 });
    }
    return masaCache.get(key);
  }

  // Solar month of day n: Tamil/Kerala = Sun's sign at 3/5 of the daytime;
  // "sunset" (pan-Indian Makara Sankranti) = at sunset.
  function solarMonth(n, calendar) {
    const d = day(n);
    if (!d) return null;
    return signAt(calendar === "sunset" ? d.ss : d.sr + d.len * 3 / 5);
  }
  const monthStarts = (n, cal) => solarMonth(n, cal) !== solarMonth(n - 1, cal);

  const fmt = (jd) => localFromJul(jd, offset);
  const window = (label, w) => (w[0] === w[1] ? { label, at: fmt(w[0]) } : { label, start: fmt(w[0]), end: fmt(w[1]) });

  // Start and end of the tithi/nakshatra containing jd.
  function spanOf(value, unit, jd, rate) {
    const v = value(jd);
    const idx = Math.floor(v / unit);
    const start = solve(value, norm(idx * unit), jd - (v - idx * unit) / rate);
    const end = solve(value, norm((idx + 1) * unit), jd + ((idx + 1) * unit - v) / rate);
    return [start, end];
  }

  // Generic "first day whose kaala lies in the target unit" rule, with the
  // kshaya fallback. `holds(n, jd)` tests the target at moment jd of day n.
  function observedOn(n, rule, holds, value, unit, rate) {
    const q = (k) => { const w = kaala(k, rule.kaala); return w ? holds(k, mid(w)) : false; };
    if (q(n)) return !q(n - 1);
    if (q(n - 1) || q(n + 1)) return false;
    // Kshaya: the unit falls between kaalas; observe on the day it begins.
    const d = day(n);
    if (!d) return false;
    const end = day(n + 1)?.sr ?? d.nsr;
    for (const t of [d.sr, (d.sr + end) / 2, end - 1e-4]) {
      if (holds(n, t)) {
        const [start] = spanOf(value, unit, t, rate);
        return start >= d.sr && start < end;
      }
    }
    return false;
  }

  if (!day(0)) return []; // polar day/night: no sunrise frame

  const tithiHolds = (f) => (n, jd) => {
    if (tithiAt(jd) !== f.tithi) return false;
    if (f.solar !== undefined) return solarMonth(n, "tamil") === f.solar;
    const m = masaAt(jd);
    return m.masa === f.masa && !m.adhika;
  };
  const tithiObserved = (f, n) => observedOn(n, f, tithiHolds(f), elong, 12, 12.19);
  const tithiSpan = (jd) => spanOf(elong, 12, jd, 12.19);

  const out = [];
  for (const f of TITHI_FESTIVALS) {
    if (!tithiObserved(f, 0)) continue;
    const w = kaala(0, f.kaala);
    const [ts, te] = tithiSpan(mid(w));
    const times = [{ label: tithiLabel(f.tithi), start: fmt(ts), end: fmt(te) }];
    if (f.label) times.unshift(window(f.label, kaala(0, f.show || f.kaala)));
    out.push({ name: f.name, region: f.region || null, note: f.note || null, times });
  }

  // Gayatri Japam: the day after Yajur Upakarma.
  const yajur = TITHI_FESTIVALS.find((f) => f.name.startsWith("Yajur Upakarma"));
  if (tithiObserved(yajur, -1)) out.push({ name: "Gayatri Japam", region: "South India", note: null, times: [] });

  for (const f of LUNAR_NAKSHATRA_FESTIVALS) {
    const holds = (n, jd) => {
      if (nakAt(jd) !== f.nak || tithiAt(jd) > 14) return false;
      const m = masaAt(jd);
      return m.masa === f.masa && !m.adhika;
    };
    if (!observedOn(0, f, holds, moonLon, NAK_SPAN, 13.2)) continue;
    const [ns, ne] = spanOf(moonLon, NAK_SPAN, kaala(0, f.kaala)[0], 13.2);
    out.push({ name: f.name, region: f.region, note: null,
      times: [{ label: `${NAK_NAMES[f.nak]} nakshatra`, start: fmt(ns), end: fmt(ne) }] });
  }

  // Bhadra = Vishti karana (the first half of Purnima among others).
  const vishti = (jd) => { const k = Math.floor(elong(jd) / 6); return k >= 1 && k <= 56 && (k - 1) % 7 === 6; };
  const bhadraIn = (w) => [0, .25, .5, .75, 1].some((f) => vishti(w[0] + (w[1] - w[0]) * f));

  // Holika Dahan: Phalguna Purnima at pradosha, outside Bhadra. If Bhadra spoils
  // the pradosha it is lit after Bhadra ends, unless Bhadra lasts past midnight,
  // in which case it moves to the next evening. Holi is the following day.
  {
    const hp = { masa: 11, tithi: 14, kaala: "pradosha" };
    const plan = (n) => { // where Holika Dahan goes if Purnima's pradosha is day n
      const w = kaala(n, "pradosha");
      if (!bhadraIn(w)) return { day: n, win: ["Pradosha", w] };
      const end = solve(elong, 174, mid(w)); // Vishti in Purnima ends at 174°
      const midnight = day(n).ss + day(n).night / 2;
      return end <= midnight ? { day: n, win: ["After Bhadra ends", [end, Math.min(end + 1 / 30, day(n).nsr)]] }
        : { day: n + 1, win: ["Pradosha", kaala(n + 1, "pradosha")] };
    };
    for (const n of [0, -1]) {
      if (!tithiObserved(hp, n)) continue;
      const p = plan(n);
      if (p.day === 0) out.push({ name: "Holika Dahan", region: null, note: "Lit outside Bhadra (Vishti karana).", times: [window(...p.win)] });
      if (p.day === -1) out.push({ name: "Holi", region: null, note: null, times: [] });
    }
    for (const n of [-2]) if (tithiObserved(hp, n) && plan(n).day === -1) out.push({ name: "Holi", region: null, note: null, times: [] });
  }

  // Raksha Bandhan: Shravana Purnima at aparahna, avoiding Bhadra. If Bhadra
  // spoils that afternoon and Purnima lasts at least 3 muhurtas (2h 24m) past
  // the next sunrise, it moves to that morning.
  {
    const rb = { masa: 4, tithi: 14, kaala: "aparahna" };
    const morningOk = (n) => {
      const d = day(n);
      if (!d || tithiAt(d.sr) !== 14) return null;
      const [, end] = tithiSpan(d.sr);
      return end - d.sr >= 0.1 ? [d.sr, end] : null;
    };
    let win = null;
    if (tithiObserved(rb, 0) && !(bhadraIn(kaala(0, "aparahna")) && morningOk(1))) win = ["Aparahna", kaala(0, "aparahna")];
    else if (tithiObserved(rb, -1) && bhadraIn(kaala(-1, "aparahna")) && morningOk(0)) win = ["Rakhi (before Purnima ends)", morningOk(0)];
    if (win) {
      const [ts, te] = tithiSpan(mid(win[1]));
      out.push({ name: "Raksha Bandhan", region: null, note: "Rakhi is tied outside Bhadra (Vishti karana).",
        times: [window(win[0], win[1]), { label: "Purnima", start: fmt(ts), end: fmt(te) }] });
    }
  }

  // The Sun's sign at the moment of the full moon nearest to jd: the solar
  // month whose Purnima this is.
  function purnimaSign(jd) {
    const fm = solve(elong, 180, jd - (((elong(jd) - 180) % 360 + 540) % 360 - 180) / 12.19);
    return signAt(fm);
  }

  for (const f of NAKSHATRA_FESTIVALS) {
    const holds = (n, jd) => nakAt(jd) === f.nak && solarMonth(n, f.calendar) === f.sign
      && (!f.purnima || purnimaSign(jd) === f.sign);
    if (!observedOn(0, f, holds, moonLon, NAK_SPAN, 13.2)) continue;
    const w = kaala(0, f.kaala);
    const [ns, ne] = spanOf(moonLon, NAK_SPAN, mid(w), 13.2);
    const times = [{ label: `${NAK_NAMES[f.nak]} nakshatra`, start: fmt(ns), end: fmt(ne) }];
    if (f.lamp) times.unshift({ label: "Lamps lit at sunset", at: fmt(day(0).ss) });
    out.push({ name: f.name, region: f.region || null, note: null, times });
  }

  for (const f of SOLAR_FESTIVALS) {
    let hit;
    if (f.day === 0) hit = monthStarts(1, f.calendar) && solarMonth(1, f.calendar) === f.sign;
    else if (solarMonth(0, f.calendar) !== f.sign) hit = false;
    else {
      let n = 0;
      while (n > -35 && !monthStarts(n, f.calendar)) n--;
      hit = 1 - n === f.day;
    }
    if (!hit) continue;
    const times = [];
    if (f.sankranti) {
      const d = day(0);
      const off = ((sunLon(d.sr) - f.sign * 30 + 540) % 360) - 180; // degrees past the sign boundary
      const at = solve(sunLon, f.sign * 30, d.sr - off / 0.9856);
      times.push({ label: `Sun enters ${SIGN_NAMES[f.sign]} (sankranti)`, at: fmt(at) });
    }
    out.push({ name: f.name, region: f.region || null, note: null, times });
  }

  // Karadaiyan Nonbu: the moment the Sun enters Meena (Maasi ends, Panguni
  // begins); observed on the Vedic day (sunrise to sunrise) containing it, with
  // the nonbu thread tied at that moment.
  {
    const d = day(0);
    const off = ((sunLon(d.sr) - 330 + 540) % 360) - 180;
    if (Math.abs(off) < 3) {
      const at = solve(sunLon, 330, d.sr - off / 0.9856);
      if (at >= d.sr && at < d.nsr) {
        out.push({ name: "Karadaiyan Nonbu", region: "Tamil Nadu", note: "The nonbu kayiru (sacred thread) is tied at the moment Maasi ends and Panguni begins.",
          times: [{ label: "Nonbu time (Sun enters Meena)", at: fmt(at) }] });
      }
    }
  }

  // Varalakshmi Vratam: the last Friday of Shravana Shukla paksha, i.e. the
  // Friday on or just before Purnima (the next Friday is in Krishna paksha).
  {
    const d = day(0);
    const weekday = new Date(dateWall).getUTCDay();
    const t = tithiAt(d.sr), m = masaAt(d.sr);
    const nextFri = day(7);
    if (weekday === 5 && m.masa === 4 && !m.adhika && t <= 14 && nextFri && tithiAt(nextFri.sr) >= 15) {
      out.push({ name: "Varalakshmi Vratam", region: "Karnataka, Andhra Pradesh, Tamil Nadu", note: null,
        times: [{ label: `${tithiLabel(t)} at sunrise`, at: fmt(d.sr) }] });
    }
  }
  return out;
}

