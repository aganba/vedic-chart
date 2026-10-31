// Compute charts with the browser JS code under Node, for tools/parity.py.
// stdin: JSON list of {date, time, offset, lat, lon, ayanamsa, bhava}; stdout: JSON results.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const docs = fileURLToPath(new URL("../docs/", import.meta.url));
const swe = await import(new URL("../docs/js/swe.js", import.meta.url));
const astro = await import(new URL("../docs/js/astro.js", import.meta.url));
await swe.initSwe((f) => readFile(docs + "ephe/" + f));

let input = "";
for await (const chunk of process.stdin) input += chunk;
const results = JSON.parse(input).map((c) => {
  const [y, mo, d] = c.date.split("-").map(Number);
  const [h, mi, s] = c.time.split(":").map(Number);
  return astro.computeChart(astro.wallMs(y, mo, d, h, mi, s || 0), c.offset, c.lat, c.lon, c.ayanamsa, c.bhava);
});
process.stdout.write(JSON.stringify(results));
