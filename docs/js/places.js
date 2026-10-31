// Offline place autocomplete over a compact GeoNames list (docs/data/places.tsv,
// built by tools/build_places.py), plus the online OpenStreetMap search/reverse
// lookups for places not in the list.
let index = null;
let loading = null;

export function normalize(s) {
  return s.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function loadPlaces(url) {
  loading ||= fetch(url).then((r) => {
    if (!r.ok) throw new Error(`Place list unavailable (${r.status})`);
    return r.text();
  }).then(build);
  return loading;
}

function build(text) {
  const lines = text.split("\n");
  const regions = lines[0].slice(2).split("|");
  const countries = lines[1].slice(2).split("|");
  const places = [], pairs = [];
  for (let i = 2; i < lines.length; i++) {
    if (!lines[i]) continue;
    const [name, alts, r, c, lat, lon, pop] = lines[i].split("\t");
    const region = regions[+r], country = countries[+c];
    const idx = places.length;
    const cityKey = normalize(name);
    places.push({ label: [name, region, country].filter(Boolean).join(", "), cityKey,
      lat: +lat, lon: +lon, pop: +pop, regionKey: normalize(`${region} ${country}`) });
    const keys = new Set([cityKey]);
    if (alts) for (const a of alts.split("|")) keys.add(normalize(a));
    for (const k of keys) if (k) pairs.push([k, idx]);
  }
  pairs.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] - b[1]));
  index = { keys: pairs.map((p) => p[0]), ids: Int32Array.from(pairs, (p) => p[1]), places };
}

function lowerBound(keys, x) {
  let lo = 0, hi = keys.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (keys[mid] < x) lo = mid + 1; else hi = mid;
  }
  return lo;
}

// Prefix search on names and old/alternate names. Extra comma-separated parts
// narrow by state/country, e.g. "salem, tamil".
export function searchPlaces(query, limit = 8) {
  if (!index) return [];
  const parts = query.split(",").map(normalize);
  const head = parts[0], filters = parts.slice(1).filter(Boolean);
  if (head.length < 2) return [];
  const { keys, ids, places } = index;
  const lo = lowerBound(keys, head), hi = lowerBound(keys, head + "￿");
  // Shortest matching key per place (prefers "bangalore" over "bang galloleu").
  const best = new Map();
  for (let i = lo; i < hi; i++) {
    const cur = best.get(ids[i]);
    if (cur === undefined || keys[i].length < cur.length) best.set(ids[i], keys[i]);
  }
  const score = (i) => {
    const p = places[i];
    const primary = p.cityKey.startsWith(head);
    const exact = best.get(i) === head || p.cityKey === head;
    return Math.log10(p.pop + 10) + primary + exact;
  };
  const matches = [...best.keys()].filter((i) => filters.every((f) => places[i].regionKey.includes(f)));
  matches.sort((a, b) => score(b) - score(a));
  return matches.slice(0, limit).map((i) => {
    const p = places[i];
    // Show the old/alternate name only when it's exactly what was typed.
    const viaAlias = !p.cityKey.startsWith(head) && best.get(i) === head;
    const typed = query.split(",")[0].trim();
    return { name: p.label, lat: p.lat, lon: p.lon,
      also: viaAlias ? typed.replace(/\b\w/g, (ch) => ch.toUpperCase()) : null };
  });
}

const NOMINATIM = "https://nominatim.openstreetmap.org";

async function nominatim(path) {
  const res = await fetch(`${NOMINATIM}${path}`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Place lookup failed (${res.status})`);
  return res.json();
}

export async function geocodeOnline(q) {
  const results = await nominatim(`/search?format=jsonv2&limit=6&accept-language=en&q=${encodeURIComponent(q)}`);
  return results.map((r) => ({ name: r.display_name, lat: +(+r.lat).toFixed(5), lon: +(+r.lon).toFixed(5) }));
}

export async function reverseOnline(lat, lon) {
  const r = await nominatim(`/reverse?format=jsonv2&zoom=10&accept-language=en&lat=${lat}&lon=${lon}`);
  return r && r.display_name ? r.display_name.split(", ").slice(0, 3).join(", ") : null;
}
