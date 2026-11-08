// Check festival dates against published 2025-2026 dates (Drik Panchang / civil
// calendars). For each expected (festival, date, place), the festival must be
// reported on that date and not on the day before or after.
// Usage: node tools/festival_check.mjs   (exit code 1 on any mismatch)
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const docs = fileURLToPath(new URL("../docs/", import.meta.url));
const swe = await import(new URL("../docs/js/swe.js", import.meta.url));
const astro = await import(new URL("../docs/js/astro.js", import.meta.url));
const { festivalsFor, tamilDate } = await import(new URL("../docs/js/festivals.js", import.meta.url));
await swe.initSwe((f) => readFile(docs + "ephe/" + f));
swe.setSidMode(swe.SE.SIDM_TRUE_CITRA);

// [lat, lon, time zone (default IST)]
const { offsetAtUtc } = await import(new URL("../docs/js/tz.js", import.meta.url));
const zone = (z) => (ms) => offsetAtUtc(z, ms);
const CUPERTINO = [37.323, -122.0322, zone("America/Los_Angeles")], NEW_YORK = [40.7128, -74.006, zone("America/New_York")];
const LONDON = [51.5074, -0.1278, zone("Europe/London")];
const DELHI = [28.6139, 77.209], CHENNAI = [13.0827, 80.2707], KOCHI = [9.9312, 76.2673], MUMBAI = [19.076, 72.8777];
const EXPECTED = [
  ["Thai Pongal", "2025-01-14", CHENNAI], ["Bhogi", "2025-01-13", CHENNAI], ["Mattu Pongal", "2025-01-15", CHENNAI],
  ["Vaikuntha Ekadashi", "2025-01-10", CHENNAI], ["Arudra Darshan", "2025-01-13", CHENNAI],
  ["Vasant Panchami", "2025-02-02", DELHI], ["Ratha Saptami", "2025-02-04", CHENNAI],
  ["Thai Poosam", "2025-02-11", CHENNAI], ["Maha Shivaratri", "2025-02-26", DELHI],
  ["Maasi Magam", "2025-03-12", CHENNAI], ["Holika Dahan", "2025-03-13", DELHI], ["Karadaiyan Nonbu", "2025-03-14", CHENNAI], ["Holi", "2025-03-14", DELHI],
  ["Ugadi", "2025-03-30", CHENNAI], ["Rama Navami", "2025-04-06", DELHI],
  ["Panguni Uttiram", "2025-04-11", CHENNAI], ["Puthandu", "2025-04-14", CHENNAI], ["Vishu", "2025-04-14", KOCHI],
  ["Akshaya Tritiya", "2025-04-30", DELHI], ["Buddha Purnima", "2025-05-12", DELHI],
  ["Vaikasi Visakam", "2025-06-09", CHENNAI], ["Guru Purnima", "2025-07-10", DELHI],
  ["Aadi Perukku", "2025-08-03", CHENNAI], ["Aadi Pooram", "2025-07-28", CHENNAI],
  // Aadi Pooram 2026: Pooram comes twice in Aadi; the one after Aadi Amavasya is kept
  // (Mylapore Kapaleeshwarar temple, Prokerala; Concord Shiva Murugan Temple calendar).
  ["Aadi Pooram", "2026-08-14", CHENNAI], ["Aadi Pooram", "2026-08-14", CUPERTINO], ["Varalakshmi Vratam", "2025-08-08", CHENNAI],
  ["Raksha Bandhan", "2025-08-09", DELHI], ["Yajur Upakarma", "2025-08-09", CHENNAI], ["Gayatri Japam", "2025-08-10", CHENNAI],
  ["Sama Upakarma", "2025-08-26", CHENNAI], ["Soora Samharam", "2025-10-27", CHENNAI], ["Krishna Janmashtami", "2025-08-16", DELHI],
  ["Ganesh Chaturthi", "2025-08-27", MUMBAI], ["Onam", "2025-09-05", KOCHI],
  ["Mahalaya Amavasya", "2025-09-21", DELHI], ["Navaratri begins", "2025-09-22", DELHI],
  ["Vijayadashami", "2025-10-02", DELHI], ["Dhanteras", "2025-10-18", DELHI],
  ["Naraka Chaturdashi", "2025-10-20", CHENNAI], ["Lakshmi Puja", "2025-10-20", DELHI],
  ["Govardhan Puja", "2025-10-22", DELHI], ["Bhai Dooj", "2025-10-23", DELHI],
  ["Kartika Purnima", "2025-11-05", DELHI], ["Karthigai Deepam", "2025-12-04", CHENNAI],
  ["Makara Sankranti", "2026-01-14", DELHI], ["Thai Pongal", "2026-01-14", CHENNAI], ["Maha Shivaratri", "2026-02-15", DELHI],
  ["Maasi Magam", "2026-03-03", CHENNAI], ["Holi", "2026-03-04", DELHI], ["Ugadi", "2026-03-19", CHENNAI], ["Puthandu", "2026-04-14", CHENNAI],
  ["Krishna Janmashtami", "2026-09-04", DELHI], ["Ganesh Chaturthi", "2026-09-14", MUMBAI],
  ["Vijayadashami", "2026-10-20", DELHI], ["Lakshmi Puja", "2026-11-08", DELHI],
  // Karthigai Deepam goes by Krittika at sunset, so abroad it can fall before
  // Kartika Purnima, and in 2027 a day earlier in Chennai than in Delhi.
  ["Kartika Purnima", "2026-11-23", CUPERTINO], ["Karthigai Deepam", "2026-11-23", CUPERTINO],
  ["Kartika Purnima", "2026-11-24", NEW_YORK], ["Karthigai Deepam", "2026-11-23", NEW_YORK],
  ["Karthigai Deepam", "2027-12-11", CHENNAI], ["Karthigai Deepam", "2027-12-12", DELHI],
  // Yajur Upakarma: Purnima at sunrise. Drik moves it for the 2026 eclipse
  // (US, Chennai) and the 2027 Simha sankranti (Chennai); the app keeps the
  // sunrise day and flags eclipse days instead (checked below).
  ["Yajur Upakarma", "2024-08-19", CHENNAI], ["Yajur Upakarma", "2025-08-09", CHENNAI], ["Yajur Upakarma", "2028-08-05", CHENNAI],
  ["Yajur Upakarma", "2027-08-16", CUPERTINO], ["Yajur Upakarma", "2026-08-27", LONDON],
  // Sama Upakarma: Hasta at aparahna.
  ["Sama Upakarma", "2024-09-05", CHENNAI], ["Sama Upakarma", "2026-09-12", CHENNAI], ["Sama Upakarma", "2027-09-03", CHENNAI],
  ["Sama Upakarma", "2028-08-23", CHENNAI], ["Sama Upakarma", "2026-09-12", CUPERTINO], ["Sama Upakarma", "2027-09-02", CUPERTINO],
  // Pongal follows Makara Sankranti (3:13 pm on 14 January 2026, before sunset).
  ["Bhogi", "2026-01-13", CHENNAI], ["Mattu Pongal", "2026-01-15", CHENNAI],
  // Vaikuntha Ekadashi on the Vaishnava day, as in Tamil calendars.
  ["Vaikuntha Ekadashi", "2025-12-31", CHENNAI], ["Vaikuntha Ekadashi", "2026-12-20", CUPERTINO],
];

const names = (date, [lat, lon, offset = 5.5]) => {
  const [y, m, d] = date.split("-").map(Number);
  return festivalsFor(astro.wallMs(y, m, d), lat, lon, offset).map((f) => f.name);
};
// Whole-word match, so "Holi" doesn't match "Holika Dahan".
// A "(Smartha)" day is not the festival's main day; it is checked on its own below.
const has = (list, fest) => list.some((n) => !n.endsWith("(Smartha)") && new RegExp(`(^|[ /(])${fest}($|[ /)])`).test(n));
const shift = (date, n) => new Date(Date.parse(date + "T00:00:00Z") + n * 86400e3).toISOString().slice(0, 10);

let bad = 0;
for (const [fest, date, place] of EXPECTED) {
  const on = has(names(date, place), fest);
  const early = has(names(shift(date, -1), place), fest);
  const late = has(names(shift(date, 1), place), fest);
  const ok = on && !early && !late;
  if (!ok) bad++;
  console.log(`${ok ? "ok  " : "FAIL"} ${fest.padEnd(22)} ${date}${ok ? "" : `  (on=${on} dayBefore=${early} dayAfter=${late})`}`);
}
console.log(`${EXPECTED.length - bad}/${EXPECTED.length} festival dates match`);

// Vaikuntha Ekadashi: where Drik Panchang's page lists a separate Smartha day it
// is shown, the day before the Vaishnava one, each labelled; otherwise one
// unlabelled day is.
{
  const PLAIN = "Vaikuntha Ekadashi", SMARTHA = `${PLAIN} (Smartha)`, VAISHNAVA = `${PLAIN} (Vaishnava)`;
  const LONDON_DAYS = ["2025-01-09"], NY_DAYS = ["2031-12-23"];
  for (const [date, place] of [["2026-12-19", CUPERTINO], ["2028-01-07", CUPERTINO], ["2025-12-30", CHENNAI],
    ...LONDON_DAYS.map((d) => [d, LONDON]), ...NY_DAYS.map((d) => [d, NEW_YORK])]) {
    const ok = names(date, place).includes(SMARTHA) && names(shift(date, 1), place).includes(VAISHNAVA)
      && !names(shift(date, 1), place).includes(SMARTHA) && !names(date, place).includes(VAISHNAVA);
    if (!ok) bad++;
    console.log(`${ok ? "ok  " : "FAIL"} ${SMARTHA} ${date}`);
  }
  for (const [date, place] of [["2026-12-20", CHENNAI], ["2028-12-27", CUPERTINO], ["2025-01-10", CHENNAI]]) {
    const ok = !names(shift(date, -1), place).includes(SMARTHA) && names(date, place).includes(PLAIN);
    if (!ok) bad++;
    console.log(`${ok ? "ok  " : "FAIL"} no separate Smartha day for ${date}`);
  }
}

// An Upakarma on a day with a lunar eclipse in the umbra is flagged: the 2026
// eclipse is on the Yajur Upakarma day in the US and Chennai (28 August
// morning, unseen) but the day after it in London.
for (const [date, place, want] of [["2026-08-27", CUPERTINO, true], ["2026-08-28", CHENNAI, true],
  ["2026-08-27", LONDON, false], ["2025-08-09", CHENNAI, false]]) {
  const [y, m, d] = date.split("-").map(Number);
  const f = festivalsFor(astro.wallMs(y, m, d), place[0], place[1], place[2] ?? 5.5).find((x) => x.name.startsWith("Yajur"));
  const ok = !!f && !!f.eclipse === want;
  if (!ok) bad++;
  console.log(`${ok ? "ok  " : "FAIL"} Yajur Upakarma ${date} eclipse flag ${want}`);
}

// Karadaiyan Nonbu: the saradu is tied at the moment the Sun enters Meena
// (True Chitrapaksha), so pin that moment, within a minute, in IST. Drik
// Panchang's Lahiri times run 34-41 minutes later; the app keeps True Chitra
// on purpose. 2026's moment falls after midnight, on the 14th's Vedic day.
for (const [date, want] of [["2024-03-14", "2024-03-14T12:04:54"], ["2025-03-14", "2025-03-14T18:19:14"],
  ["2026-03-14", "2026-03-15T00:31:37"], ["2027-03-15", "2027-03-15T06:28:38"], ["2028-03-14", "2028-03-14T12:43:34"]]) {
  const [y, m, d] = date.split("-").map(Number);
  const f = festivalsFor(astro.wallMs(y, m, d), CHENNAI[0], CHENNAI[1], 5.5).find((x) => x.name === "Karadaiyan Nonbu");
  const at = f?.times[0]?.at;
  const ok = !!at && Math.abs(Date.parse(at + "Z") - Date.parse(want + "Z")) <= 60e3;
  if (!ok) bad++;
  console.log(`${ok ? "ok  " : "FAIL"} Karadaiyan Nonbu ${date} saradu time ${want.slice(11, 16)}${ok ? "" : `  (got ${at ?? "none"})`}`);
}

// Every festival must occur at most once per lunar/solar year: scan each day of
// 2025-2026 (Chennai and Delhi) and flag repeats less than 300 days apart.
for (const [label, place] of [["Chennai", CHENNAI], ["Delhi", DELHI]]) {
  const seen = new Map();
  for (let t = Date.parse("2025-01-01T00:00:00Z"); t <= Date.parse("2026-12-31T00:00:00Z"); t += 86400e3) {
    const date = new Date(t).toISOString().slice(0, 10);
    for (const name of names(date, place)) {
      const prev = seen.get(name);
      if (prev && (t - Date.parse(prev + "T00:00:00Z")) / 86400e3 < 300) {
        bad++;
        console.log(`FAIL ${label}: ${name} on both ${prev} and ${date}`);
      }
      seen.set(name, date);
    }
  }
}
console.log(bad ? `${bad} problem(s)` : "no repeated festivals in 2025-2026");

// Tamil calendar dates on festival days whose dates are checked above.
const TAMIL_DATES = [
  ["2025-01-14", "Thai", 1, "Krodhi"], ["2025-04-14", "Chithirai", 1, "Vishvavasu"],
  ["2025-08-03", "Aadi", 18, "Vishvavasu"], ["2026-04-14", "Chithirai", 1, "Parabhava"],
];
for (const [date, month, day, year] of TAMIL_DATES) {
  const [y, m, d] = date.split("-").map(Number);
  const td = tamilDate(astro.wallMs(y, m, d), ...CHENNAI, 5.5);
  const ok = td && td.month === month && td.day === day && td.year === year;
  if (!ok) bad++;
  console.log(`${ok ? "ok  " : "FAIL"} Tamil date ${date}: ${td ? `${td.month} ${td.day}, ${td.year}` : "none"}`);
}

// Panchaka: the good (Rahita) and bad times of Drik Panchang's Panchaka Rahita
// Muhurat for New Delhi on Tuesday 3 November 2026 (drikpanchang.com), as
// [start, end, good], must get the same verdict from muhurtha.js's panchaka at
// their midpoints; remainder 0 counts as good, as on Drik Panchang.
{
  const { panchaka } = await import(new URL("../docs/js/muhurtha.js", import.meta.url));
  const PANCHAKA_DRIK = [["06:34", "07:41", false], ["07:41", "10:00", true], ["10:00", "11:54", false], ["11:54", "12:04", false],
    ["12:04", "13:46", true], ["13:46", "15:13", false], ["15:13", "16:38", true], ["16:38", "18:14", true], ["18:14", "20:09", false],
    ["20:09", "22:24", true], ["22:24", "24:44", false], ["24:44", "27:01", true], ["27:01", "27:26", false], ["27:26", "29:18", true],
    ["29:18", "30:35", false]];
  const [lat, lon] = DELHI, day = Date.UTC(2026, 10, 3);
  const jdAt = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return astro.julFromWall(day + (h * 60 + m) * 60e3, 5.5); };
  const norm = (x) => ((x % 360) + 360) % 360;
  const sunrise = swe.riseTrans(jdAt("00:00"), swe.SE.SUN, swe.SE.CALC_RISE, lon, lat);
  const nextSunrise = swe.riseTrans(sunrise + 0.5, swe.SE.SUN, swe.SE.CALC_RISE, lon, lat);
  const wrong = PANCHAKA_DRIK.filter(([a, b, good]) => {
    const jd = (jdAt(a) + jdAt(b)) / 2;
    const sun = astro.planetLon(jd, swe.SE.SUN)[0], moon = astro.planetLon(jd, swe.SE.MOON)[0];
    const vara = jd < nextSunrise ? 2 : 3; // Tuesday until the next sunrise
    const r = panchaka(Math.floor(norm(moon - sun) / 12), vara, Math.floor(moon / astro.NAK_SPAN),
      Math.floor(norm(astro.lagnaAndMc(jd, lat, lon)[0]) / 30));
    return [0, 3, 5, 7].includes(r) !== good;
  });
  if (wrong.length) bad++;
  console.log(`${wrong.length ? "FAIL" : "ok  "} panchaka: ${PANCHAKA_DRIK.length - wrong.length}/${PANCHAKA_DRIK.length} Drik Panchang times agree${wrong.length ? `; wrong ${wrong.map(([a, b]) => `${a}-${b}`).join(" ")}` : ""}`);
}
// Tamil calendar muhurtham: the 47 days of Harikesanallur Venkatraman's 2026-27
// list for Chennai (harikesanallur.com) must all be found. That list uses the
// vakya panchangam and the app drik positions, so the app also finds some days
// the list leaves out (22 in this year); more than 25 would mean a rule is missing.
// No day may be a Tuesday or Saturday.
{
  const { tamilMuhurthaFor } = await import(new URL("../docs/js/tamilmuhurtha.js", import.meta.url));
  const ref = new Set(("2026-04-20 2026-04-23 2026-04-30 2026-05-08 2026-05-13 2026-05-18 2026-05-25 2026-05-28 2026-05-29 "
    + "2026-06-04 2026-06-11 2026-06-17 2026-06-18 2026-06-24 2026-06-25 2026-07-05 2026-07-12 2026-08-23 2026-08-30 "
    + "2026-08-31 2026-09-07 2026-10-25 2026-10-30 2026-11-01 2026-11-11 2026-11-13 2026-11-15 2026-11-16 2026-11-20 "
    + "2026-11-22 2026-11-29 2026-12-04 2026-12-14 2027-01-20 2027-02-08 2027-02-10 2027-02-11 2027-02-26 2027-03-10 "
    + "2027-03-14 2027-03-17 2027-03-18 2027-03-24 2027-04-04 2027-04-08 2027-04-11 2027-04-12").split(" "));
  const found = new Set(), extra = [];
  for (let t = Date.parse("2026-04-14T00:00:00Z"); t <= Date.parse("2027-04-13T00:00:00Z"); t += 86400e3) {
    const date = new Date(t).toISOString().slice(0, 10);
    if (!tamilMuhurthaFor(t, ...CHENNAI, 5.5)) continue;
    if ([2, 6].includes(new Date(t).getUTCDay())) { bad++; console.log(`FAIL Tamil muhurtham on ${date}`); }
    if (ref.has(date)) found.add(date); else extra.push(date);
  }
  const missed = [...ref].filter((d) => !found.has(d));
  const ok = !missed.length && extra.length <= 25;
  if (!ok) bad++;
  console.log(`${ok ? "ok  " : "FAIL"} Tamil muhurtham 2026-27: ${found.size}/${ref.size} Harikesanallur days found, ${extra.length} more`
    + `${missed.length ? `; missing ${missed.join(" ")}` : ""}`);
}
// Search tab: tithi and nakshatra spans with their sunrise (main) days, as
// Drik Panchang and Prokerala list them for Chennai. Times within 3 minutes
// (nakshatras differ slightly with the ayanamsa; the app uses True Chitra).
{
  const { occurrences } = await import(new URL("../docs/js/search.js", import.meta.url));
  const near = (a, b) => Math.abs(Date.parse(a + "Z") - Date.parse(b + "Z")) <= 3 * 60e3;
  // [kind, index, start, end, main days, source]
  const SPANS = [
    ["tithi", 25, "2026-07-10T08:16", "2026-07-11T05:22", [], "Prokerala: Krishna Ekadashi, tithi kshaya"],
    ["tithi", 10, "2026-05-26T05:12", "2026-05-27T06:22", ["2026-05-26", "2026-05-27"], "Drik: Ekadashi upto full night"],
    ["nakshatra", 1, "2026-07-09T14:56", "2026-07-10T13:15", ["2026-07-10"], "Prokerala: Bharani"],
    ["nakshatra", 2, "2026-07-10T13:15", "2026-07-11T11:03", ["2026-07-11"], "Prokerala: Krittika"],
  ];
  for (const [kind, index, start, end, main, src] of SPANS) {
    const day = Date.parse(start.slice(0, 10) + "T00:00:00Z");
    const o = occurrences(kind, index, day - 2 * 86400e3, day + 3 * 86400e3, ...CHENNAI, 5.5)
      .find((x) => near(x.start, start + ":00"));
    const ok = !!o && near(o.end, end + ":00") && o.mainDays.join() === main.join();
    if (!ok) bad++;
    console.log(`${ok ? "ok  " : "FAIL"} search ${src} ${start} – ${end}${ok ? "" : `  (got ${o ? `${o.start} – ${o.end} main ${o.mainDays}` : "none"})`}`);
  }
}
console.log(bad ? `${bad} problem(s) in total` : "all checks passed");
process.exit(bad ? 1 : 0);
