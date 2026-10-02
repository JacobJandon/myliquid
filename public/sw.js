/*
 * MyLiquid service worker. It makes the app installable and gives it an offline screen. It never caches pages or
 * API responses: balances, orders and payments always come fresh from the server, and nothing about an account is
 * kept on the device. Only build assets (hashed, immutable) and icons are cached.
 */
const CACHE = "myliquid-shell-v1";
const OFFLINE = "/offline";
const SHELL = [OFFLINE, "/icons/icon-192.png", "/icons/icon-512.png"];
const MAX_ASSETS = 200;

async function precache() {
  const cache = await caches.open(CACHE);
  await cache.addAll(SHELL);
  // The offline screen's own scripts and styles, so it renders without a connection.
  const html = await (await cache.match(OFFLINE)).text();
  const assets = [...new Set(html.match(/\/_next\/static\/[^"'\s)]+/g) ?? [])];
  await Promise.all(assets.map((a) => cache.add(a).catch(() => undefined)));
}

async function trim(cache) {
  const keys = await cache.keys();
  const assets = keys.filter((k) => new URL(k.url).pathname.startsWith("/_next/static/"));
  for (const k of assets.slice(0, Math.max(0, assets.length - MAX_ASSETS))) await cache.delete(k);
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return (await event.preloadResponse) || (await fetch(req));
        } catch {
          return (await caches.match(OFFLINE)) || Response.error();
        }
      })(),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        const res = await fetch(req);
        if (res.ok) {
          const cache = await caches.open(CACHE);
          await cache.put(req, res.clone());
          event.waitUntil(trim(cache));
        }
        return res;
      })(),
    );
  }
});
