const CACHE_NAME = "zango-phc-drf-v2";

// The app cannot start offline without this library, so it is saved too.
const SUPABASE_JS = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.58.0/dist/umd/supabase.js";

const APP_FILES = [
  "./",
  "./index.html"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(APP_FILES);
      try {
        const resp = await fetch(SUPABASE_JS);
        if (resp.ok) await cache.put(SUPABASE_JS, resp);
      } catch (e) {
        // If this fails now, it is saved the first time the page loads it.
      }
    })
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
    ])
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  // The Supabase library: use the saved copy first, so the app starts offline.
  if (request.url === SUPABASE_JS) {
    event.respondWith((async () => {
      const cached = await caches.match(SUPABASE_JS, { ignoreVary: true });
      if (cached) return cached;
      const resp = await fetch(request);
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(SUPABASE_JS, resp.clone());
      } catch (e) {}
      return resp;
    })());
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && request.mode === "navigate") {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) =>
            cache.put("./index.html", copy)
          );
        }

        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);

        if (cached) return cached;

        if (request.mode === "navigate") {
          return (
            await caches.match("./index.html")
          ) || Response.error();
        }

        return Response.error();
      })
  );
});
