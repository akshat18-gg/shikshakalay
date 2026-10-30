/*
 * Shikshakalay service worker (hand-written, small). Weak networks:
 *  - cache-first: Next.js static files, fixed audio clips, icons, sample clips (they never change for a build)
 *  - network-first for pages, with the last copy as the offline fallback (a second visit opens offline)
 *  - never caches /api/* (lessons, logins, audio replies are always live)
 */
const VERSION = "shk-v2";
const STATIC = /^\/(_next\/static|audio|icons|samples)\//;

/** Small files a lesson needs even on a bad network (≈ 220 KB): the fixed hello / "say again" clips and icons. */
const PRECACHE = ["/audio/hello-en.mp3", "/audio/hello-hi.mp3", "/audio/again-en.mp3", "/audio/again-hi.mp3", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((c) => c.addAll(PRECACHE))
      .catch(() => {}) // never block installing on a flaky network
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (STATIC.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            // Clone now: the browser starts reading `res` as soon as it is returned.
            if (res.ok && res.status === 200) {
              const copy = res.clone();
              caches.open(VERSION).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match("/"))),
    );
  }
});
