// Offline support: serve app files from the cache and refresh them in the
// background (stale-while-revalidate), so the app opens without a connection
// and picks up new versions on the next visit after a deploy.
const CACHE = "vedic-chart-v1";
const CORE = [
  "./", "index.html", "style.css", "app.js", "manifest.webmanifest",
  "js/swe.js", "js/astro.js", "js/shadbala.js", "js/dasha.js", "js/tz.js", "js/places.js",
  "vendor/tz-lookup.js", "swe/swisseph.mjs", "swe/swisseph.wasm",
  "ephe/sepl_18.se1", "ephe/semo_18.se1", "ephe/sefstars.txt", "icons/icon-180.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return; // e.g. OpenStreetMap lookups
  e.respondWith(caches.open(CACHE).then(async (cache) => {
    const cached = await cache.match(e.request, { ignoreSearch: url.pathname.endsWith("/") || url.pathname.endsWith(".html") });
    const fresh = fetch(e.request).then((res) => {
      if (res.ok) cache.put(e.request, res.clone());
      return res;
    }).catch(() => cached);
    return cached || fresh;
  }));
});
