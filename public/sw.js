const CACHE = "aeroguia-v6";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("aeroguia-") && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/") || url.search) return;
  if (!isAppShellOrStatic(request, url)) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          const cacheControl = response.headers.get("Cache-Control") || "";
          if (response.ok && response.type === "basic" && !/no-store|private/i.test(cacheControl)) {
            caches.open(CACHE).then((cache) => cache.put(request, response.clone())).catch(() => {});
          }
          return response;
        })
        .catch(() => cached || new Response("Sin conexión", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }
        }));
      return cached || network;
    })
  );
});

function isAppShellOrStatic(request, url) {
  if (request.mode === "navigate") return url.pathname === "/" || url.pathname === "/privacidad";
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/data/") ||
    /^\/(?:icon(?:-180|-192|-512)?\.(?:svg|png)|manifest\.json)$/.test(url.pathname)
  );
}
