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
const { muhurthaFor } = await import(new URL("../docs/js/muhurtha.js", import.meta.url));
await swe.initSwe((f) => readFile(docs + "ephe/" + f));
swe.setSidMode(swe.SE.SIDM_TRUE_CITRA);

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
  ["Aadi Perukku", "2025-08-03", CHENNAI], ["Varalakshmi Vratam", "2025-08-08", CHENNAI],
  ["Raksha Bandhan", "2025-08-09", DELHI], ["Yajur Upakarma", "2025-08-09", CHENNAI], ["Gayatri Japam", "2025-08-10", CHENNAI],
  ["Sama Upakarma", "2025-08-26", CHENNAI], ["Soora Samharam", "2025-10-27", CHENNAI], ["Krishna Janmashtami", "2025-08-16", DELHI],
  ["Ganesh Chaturthi", "2025-08-27", MUMBAI], ["Onam", "2025-09-05", KOCHI],
  ["Mahalaya Amavasya", "2025-09-21", DELHI], ["Navaratri begins", "2025-09-22", DELHI],
  ["Vijayadashami", "2025-10-02", DELHI], ["Dhanteras", "2025-10-18", DELHI],
  ["Naraka Chaturdashi", "2025-10-20", CHENNAI], ["Lakshmi Puja", "2025-10-20", DELHI],
  ["Govardhan Puja", "2025-10-22", DELHI], ["Bhai Dooj", "2025-10-23", DELHI],
  ["Kartika Purnima", "2025-11-05", DELHI], ["Karthigai Deepam", "2025-12-04", CHENNAI],
  ["Makara Sankranti", "2026-01-14", DELHI], ["Thai Pongal", "2026-01-15", CHENNAI], ["Maha Shivaratri", "2026-02-15", DELHI],
  ["Maasi Magam", "2026-03-03", CHENNAI], ["Holi", "2026-03-04", DELHI], ["Ugadi", "2026-03-19", CHENNAI], ["Puthandu", "2026-04-14", CHENNAI],
  ["Krishna Janmashtami", "2026-09-04", DELHI], ["Ganesh Chaturthi", "2026-09-14", MUMBAI],
  ["Vijayadashami", "2026-10-20", DELHI], ["Lakshmi Puja", "2026-11-08", DELHI],
];

const names = (date, [lat, lon]) => {
  const [y, m, d] = date.split("-").map(Number);
  return festivalsFor(astro.wallMs(y, m, d), lat, lon, 5.5).map((f) => f.name);
};
// Whole-word match, so "Holi" doesn't match "Holika Dahan".
const has = (list, fest) => list.some((n) => new RegExp(`(^|[ /(])${fest}($|[ /)])`).test(n));
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

// Shubha muhurtham: panchangams disagree on the finer rules, so require only
// that most Valarpirai dates published by LiveChennai for Chennai are found,
// and that no day breaks the weekday rule.
const MUHURTHAM = {
  2025: "02-02 02-03 02-12 03-02 03-05 03-06 03-07 03-12 04-30 05-01 05-08 05-09 05-28 06-02 06-04 06-05 06-08 06-29 06-30 07-02 07-03 07-04 07-06 07-07 11-02 11-03 11-23 11-30 12-01",
  2026: "01-28 02-20 02-22 03-25 04-01 04-20 04-23 04-30 05-18 05-25 05-28 05-29 06-17 06-18 06-24 06-25 08-23 09-13 09-17 10-25 11-11 11-13 11-15 11-16 11-20 12-10 12-13 12-14",
};
for (const [year, list] of Object.entries(MUHURTHAM)) {
  const ref = list.split(" ").map((d) => `${year}-${d}`);
  let hit = 0, days = 0;
  for (let t = Date.parse(`${year}-01-01T00:00:00Z`); t <= Date.parse(`${year}-12-31T00:00:00Z`); t += 86400e3) {
    const m = muhurthaFor(t, ...CHENNAI, 5.5);
    if (!m) continue;
    days++;
    if (ref.includes(new Date(t).toISOString().slice(0, 10))) hit++;
    if ([2, 6].includes(new Date(t).getUTCDay()) || !m.windows.length) { bad++; console.log(`FAIL muhurtham on ${new Date(t).toISOString().slice(0, 10)}`); }
  }
  const ok = hit >= ref.length * 0.6;
  if (!ok) bad++;
  console.log(`${ok ? "ok  " : "FAIL"} muhurtham ${year}: ${days} days, ${hit}/${ref.length} published Valarpirai dates found`);
}
console.log(bad ? `${bad} problem(s) in total` : "all checks passed");
process.exit(bad ? 1 : 0);
