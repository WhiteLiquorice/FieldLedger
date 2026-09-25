const CACHE_NAME = 'fieldledger-pwa-__BUILD_ID__';
const PRECACHE_URLS = ['/app/', '/app/index.html', '/app/manifest.webmanifest', '/app/icons/icon.svg' /* BUILD_ASSETS */];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(PRECACHE_URLS.map(url => new Request(url, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // Keep the previous release's hashed chunks for already-open tabs. Never reload an active draft.
    const old = (await caches.keys()).filter(key => key.startsWith('fieldledger-pwa-') && key !== CACHE_NAME);
    await Promise.all(old.slice(0, -1).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || (url.pathname !== '/app' && !url.pathname.startsWith('/app/'))) return;
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request, { cache: 'no-store' });
        if (response.ok) await cache.put('/app/index.html', response.clone());
        return response;
      } catch {
        return await cache.match('/app/index.html') || await cache.match('/app/') || new Response('Connect to the internet to open FieldLedger.', { status: 503 });
      }
    })());
    return;
  }
  // Only immutable build assets and explicitly listed public files belong in the shell cache.
  if (!/^\/app\/assets\/[^/]+-[A-Za-z0-9_-]+\.(?:js|css)$/.test(url.pathname) && !PRECACHE_URLS.includes(url.pathname)) return;
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok) await (await caches.open(CACHE_NAME)).put(request, response.clone());
    return response;
  })());
});
