// Checks that every festival name, puja-time label and note that
// docs/js/festivals.js can produce, and every interface phrase app.js asks
// for, has a Tamil entry in docs/js/i18n.js.  Usage: node tools/i18n_check.mjs
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { _vocab as V, setLang, tr } from "../docs/js/i18n.js";

const read = (f) => readFileSync(new URL(`../docs/${f}`, import.meta.url), "utf8");
const strings = (src, key) => [...src.matchAll(new RegExp(`${key}: "([^"]+)"`, "g"))].map((m) => m[1]);
const fest = read("js/festivals.js");
const missing = [];
const need = (ns, list) => { for (const s of new Set(list)) if (!(s in V[ns])) missing.push(`${ns}: ${s}`); };

need("festival", strings(fest, "name"));
need("note", strings(fest, "note"));
// fixed labels: `label: "..."` plus the window labels passed as ["Label", ...]
const labels = [...strings(fest, "label"), ...[...fest.matchAll(/win(?:\[0\])?: \["([^"]+)"/g)].map((m) => m[1]),
  ...[...fest.matchAll(/win = \["([^"]+)"/g)].map((m) => m[1])];
need("label", labels.filter((s) => !s.includes("${")));
for (const r of strings(fest, "region")) need("region", r.split(", "));

// Interface phrases: t("...") calls in app.js and data-i18n keys in index.html.
const ui = readFileSync(new URL("../docs/js/i18n.js", import.meta.url), "utf8");
const app = read("app.js"), html = read("index.html");
const keys = [...app.matchAll(/\bt\("((?:[^"\\]|\\.)+)"/g)].map((m) => m[1])
  .concat([...html.matchAll(/data-i18n(?:-ph|-title|-aria)?="([^"]+)"/g)].map((m) => m[1].replace(/&#39;/g, "'")))
  .concat(["Body", "Rasi", "Longitude|table", "Nakshatra", "Pada", "Nak. lord", "Navamsa", "Karaka",
    "House", "Start (sandhi)", "Middle (madhya)", "End", "Planets"]);
for (const k of new Set(keys)) if (!ui.includes(JSON.stringify(k) + ":")) missing.push(`ui: ${k}`);

// Translate everything two years of festivals, muhurthams and charts produce at
// a few places, and flag anything still containing Latin letters.
const docs = fileURLToPath(new URL("../docs/", import.meta.url));
const swe = await import(new URL("../docs/js/swe.js", import.meta.url));
const astro = await import(new URL("../docs/js/astro.js", import.meta.url));
const { festivalsFor } = await import(new URL("../docs/js/festivals.js", import.meta.url));
const { muhurthaFor } = await import(new URL("../docs/js/muhurtha.js", import.meta.url));
await swe.initSwe((f) => readFile(docs + "ephe/" + f));
setLang("ta");
const latin = new Set();
const check = (s, ns) => { const out = tr(s, ns); if (/[A-Za-z]/.test(out)) latin.add(`${ns}: ${s}`); };
for (const [lat, lon] of [[13.0827, 80.2707], [28.6139, 77.209], [9.9312, 76.2673]]) {
  for (let d = 0; d < 730; d++) {
    const w = Date.UTC(2025, 0, 1) + d * 86400e3;
    for (const f of festivalsFor(w, lat, lon, 5.5)) {
      check(f.name, "festival");
      if (f.region) check(f.region, "region");
      if (f.note) check(f.note, "note");
      for (const tt of f.times) check(tt.label, "label");
    }
    const m = muhurthaFor(w, lat, lon, 5.5);
    if (m) { check(m.paksha, "paksha"); check(m.tithi, "tithi"); check(m.nakshatra, "nakshatra");
      for (const x of m.windows) check(x.lagna, "sign"); }
    if (d % 3 === 0) {
      const c = astro.computeChart(w + 6 * 3600e3, 5.5, lat, lon);
      const p = c.panchanga;
      check(p.tithi.paksha, "paksha"); check(p.tithi.name, "tithi"); check(p.nakshatra.name, "nakshatra");
      check(p.nakshatra.lord, "planet"); check(p.yoga.name, "yoga"); check(p.karana.name, "karana");
      check(p.masa, "masa"); check(p.samvatsara, "samvatsara"); check(p.vara.name, "weekday"); check(p.vara.sanskrit, "vara");
      for (const b of c.bodies) {
        check(b.name, "planet"); check(b.key === "lagna" ? "Asc" : b.abbr, "planetAbbr");
        check(c.constants.signs[b.sign], "sign"); check(c.constants.sign_abbr[b.navamsa], "signAbbr");
        if (b.karaka) check(b.karaka, "karaka");
      }
      for (const md of c.vimshottari.mahadashas) check(md.name, "planet");
    }
  }
}
for (const [k, v] of Object.entries(astro.AYANAMSAS)) check(v[0], "ayanamsa");
for (const v of Object.values(astro.BHAVA_METHODS)) check(v, "bhava");
missing.push(...[...latin].map((s) => `untranslated output: ${s}`));

if (missing.length) { console.log("Missing Tamil text:\n  " + missing.join("\n  ")); process.exit(1); }
console.log("all text has Tamil entries; two years of festivals, muhurthams and charts translate fully");
