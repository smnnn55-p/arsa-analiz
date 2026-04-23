const CACHE = "arsa-analiz-v1";

self.addEventListener("install", (e) => {
    self.skipWaiting();
});

self.addEventListener("activate", (e) => {
    e.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (e) => {
    const req = e.request;
    const url = req.url;
    if (req.method !== "GET") return;

    const isBoundaryJson =
        url.endsWith(".json") &&
        (url.includes("raw.githubusercontent.com") ||
            url.includes("boundaries/") ||
            url.includes("/boundaries/"));

    if (!isBoundaryJson) return;

    e.respondWith(
        caches.open(CACHE).then((cache) =>
            fetch(req)
                .then((res) => {
                    if (res.ok) cache.put(req, res.clone());
                    return res;
                })
                .catch(() => cache.match(req))
        )
    );
});
