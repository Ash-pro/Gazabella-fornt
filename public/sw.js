// Cache only the public application shell and same-origin static assets.
const CACHE_NAME = 'gazabella-public-v2';
const STATIC_ASSETS = ['/index.html', '/site.webmanifest', '/brand/wordmark/logo-480.webp', '/brand/symbol/logo-192.webp', '/icons.svg'];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('gazabella-') && key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => (await caches.match('/index.html')) || Response.error()));
    return;
  }
  if (!/^\/(assets|images|brand|fonts)\//.test(url.pathname) && !['/icons.svg','/site.webmanifest'].includes(url.pathname)) return;
  event.respondWith(caches.match(request).then(async (cached) => {
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  }));
});
