// Offline support, network first: every visit revalidates each file with the
// server (cheap "304 Not Modified" when unchanged), so updates show up
// immediately; the cached copy is used only when the network is unavailable.
const CACHE = "vedic-chart-v14";
const CORE = [
  "./", "index.html", "style.css", "app.js", "manifest.webmanifest", "ganesha.svg",
  "js/swe.js", "js/astro.js", "js/shadbala.js", "js/dasha.js", "js/tz.js", "js/places.js", "js/festivals.js",
  "vendor/tz-lookup.js", "swe/swisseph.mjs", "swe/swisseph.wasm",
  "ephe/sepl_18.se1", "ephe/semo_18.se1", "ephe/sefstars.txt", "icons/icon-180.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE)
    .then((c) => c.addAll(CORE.map((u) => new Request(u, { cache: "reload" }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return; // e.g. OpenStreetMap lookups
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      // "no-cache" bypasses the browser's HTTP cache and revalidates with the server.
      const res = await fetch(url.href, { cache: "no-cache", credentials: "same-origin" });
      if (res.ok) cache.put(e.request, res.clone());
      return res;
    } catch {
      const cached = await cache.match(e.request, { ignoreSearch: true });
      return cached || Response.error();
    }
  })());
});
