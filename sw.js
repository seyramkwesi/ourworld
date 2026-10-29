// Community Noise Map service worker: makes the app open offline.
// Bump VERSION whenever index.html or other app files change.
const VERSION = "v10";
const APP = "noisemap-app-" + VERSION;
const CDN = "noisemap-cdn-v1";
const TILES = "noisemap-tiles-v1";
const MAX_TILES = 1500;

const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png",
  "./vendor/leaflet/leaflet.js",
  "./vendor/leaflet/leaflet.css",
  "./vendor/leaflet/images/layers.png",
  "./vendor/leaflet/images/layers-2x.png"
];

self.addEventListener("install", (e) => {
  // cache: "reload" skips the browser's HTTP cache so a new version never stores stale files.
  e.waitUntil(
    caches.open(APP)
      .then((c) => c.addAll(APP_FILES.map((u) => new Request(u, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("noisemap-app-") && k !== APP).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function trimTiles() {
  const c = await caches.open(TILES);
  const keys = await c.keys();
  for (let i = 0; i < keys.length - MAX_TILES; i++) await c.delete(keys[i]);
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // App files: network first (revalidated with the server) so updates arrive; cache when offline.
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req, { cache: "no-cache" })
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(APP).then((c) => c.put(req, copy)); }
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match("./index.html")))
    );
    return;
  }

  // Map tiles: show cached tiles offline, refresh in the background.
  if (url.hostname.endsWith("tile.openstreetmap.org") || (url.hostname === "server.arcgisonline.com" && url.pathname.includes("/tile/"))) {
    e.respondWith(
      caches.open(TILES).then(async (c) => {
        const hit = await c.match(req);
        const net = fetch(req).then((res) => {
          if (res.ok || res.type === "opaque") { c.put(req, res.clone()); trimTiles(); }
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    );
    return;
  }

  // Fonts: cache first.
  if (/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(url.hostname)) {
    e.respondWith(
      caches.open(CDN).then(async (c) => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok || res.type === "opaque") c.put(req, res.clone());
        return res;
      })
    );
  }
});
