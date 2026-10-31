// Check festival dates against published 2025-2026 dates (Drik Panchang / civil
// calendars). For each expected (festival, date, place), the festival must be
// reported on that date and not on the day before or after.
// Usage: node tools/festival_check.mjs   (exit code 1 on any mismatch)
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const docs = fileURLToPath(new URL("../docs/", import.meta.url));
const swe = await import(new URL("../docs/js/swe.js", import.meta.url));
const astro = await import(new URL("../docs/js/astro.js", import.meta.url));
const { festivalsFor } = await import(new URL("../docs/js/festivals.js", import.meta.url));
await swe.initSwe((f) => readFile(docs + "ephe/" + f));
swe.setSidMode(swe.SE.SIDM_TRUE_CITRA);

const DELHI = [28.6139, 77.209], CHENNAI = [13.0827, 80.2707], KOCHI = [9.9312, 76.2673], MUMBAI = [19.076, 72.8777];
const EXPECTED = [
  ["Thai Pongal", "2025-01-14", CHENNAI], ["Bhogi", "2025-01-13", CHENNAI], ["Mattu Pongal", "2025-01-15", CHENNAI],
  ["Vaikuntha Ekadashi", "2025-01-10", CHENNAI], ["Arudra Darshan", "2025-01-13", CHENNAI],
  ["Vasant Panchami", "2025-02-02", DELHI], ["Ratha Saptami", "2025-02-04", CHENNAI],
  ["Thai Poosam", "2025-02-11", CHENNAI], ["Maha Shivaratri", "2025-02-26", DELHI],
  ["Holika Dahan", "2025-03-13", DELHI], ["Holi", "2025-03-14", DELHI],
  ["Ugadi", "2025-03-30", CHENNAI], ["Rama Navami", "2025-04-06", DELHI],
  ["Panguni Uttiram", "2025-04-11", CHENNAI], ["Puthandu", "2025-04-14", CHENNAI], ["Vishu", "2025-04-14", KOCHI],
  ["Akshaya Tritiya", "2025-04-30", DELHI], ["Buddha Purnima", "2025-05-12", DELHI],
  ["Vaikasi Visakam", "2025-06-09", CHENNAI], ["Guru Purnima", "2025-07-10", DELHI],
  ["Aadi Perukku", "2025-08-03", CHENNAI], ["Varalakshmi Vratam", "2025-08-08", CHENNAI],
  ["Raksha Bandhan", "2025-08-09", DELHI], ["Krishna Janmashtami", "2025-08-16", DELHI],
  ["Ganesh Chaturthi", "2025-08-27", MUMBAI], ["Onam", "2025-09-05", KOCHI],
  ["Mahalaya Amavasya", "2025-09-21", DELHI], ["Navaratri begins", "2025-09-22", DELHI],
  ["Vijayadashami", "2025-10-02", DELHI], ["Dhanteras", "2025-10-18", DELHI],
  ["Naraka Chaturdashi", "2025-10-20", CHENNAI], ["Diwali", "2025-10-20", DELHI],
  ["Govardhan Puja", "2025-10-22", DELHI], ["Bhai Dooj", "2025-10-23", DELHI],
  ["Kartika Purnima", "2025-11-05", DELHI], ["Karthigai Deepam", "2025-12-04", CHENNAI],
  ["Makara Sankranti", "2026-01-14", DELHI], ["Thai Pongal", "2026-01-15", CHENNAI], ["Maha Shivaratri", "2026-02-15", DELHI],
  ["Holi", "2026-03-04", DELHI], ["Ugadi", "2026-03-19", CHENNAI], ["Puthandu", "2026-04-14", CHENNAI],
  ["Krishna Janmashtami", "2026-09-04", DELHI], ["Ganesh Chaturthi", "2026-09-14", MUMBAI],
  ["Vijayadashami", "2026-10-20", DELHI], ["Diwali", "2026-11-08", DELHI],
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
process.exit(bad ? 1 : 0);
