// Uplift service worker — network-first caching.
//
// Strategy: every fetch goes to the network first so the latest code
// always wins. Successful responses are tucked into the cache so the
// game still works offline. If the network fails, we fall back to
// whatever was cached last.
//
// Bump CACHE_NAME if a future change should invalidate the entire
// cache (e.g. removing files); for normal updates it doesn't matter,
// because network-first already pulls the freshest version.

const CACHE_NAME = "uplift-v1";

const PRECACHE = [
  "./",
  "index.html",
  "main.js",
  "style.css",
  "data/state.js",
  "data/levels.js",
  "data/upgrades.js",
  "data/sounds.js",
  "scenes/BootScene.js",
  "scenes/GameScene.js",
  "scenes/UpgradeScene.js",
  "scenes/SettingsScene.js",
  "scenes/GameOverScene.js",
  "scenes/WinScene.js",
  "assets/icon.png",
  "assets/music/bgm_basic.mp3",
  "assets/music/bgm_200.mp3",
  "assets/music/bgm_300.mp3",
  "assets/music/bgm_400.mp3",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches
          .open(CACHE_NAME)
          .then((cache) => cache.put(event.request, copy))
          .catch(() => {});
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
