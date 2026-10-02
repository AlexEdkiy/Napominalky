// WEB-63: only a public error page, never the application shell or user/API data.
const base = new URL(self.registration.scope);
const prefix = 'napominalki-offline:' + base.pathname + ':';
const cacheName = prefix + 'v1';
const files = ['offline.html', 'connection.css', 'connection-illustration.png', 'offline-retry.js'];
const urls = files.map(file => new URL(file, base).href);
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await Promise.all(urls.map(async url => {
      let response = await fetch(url, { cache: 'reload', credentials: 'omit' });
      if (!response.ok) throw new Error('Offline asset unavailable');
      if (url === urls[0]) {
        const html = (await response.text()).replace('<head>', '<head><base href="' + base.pathname + '">');
        const headers = new Headers(response.headers);
        headers.delete('content-encoding');
        headers.delete('content-length');
        response = new Response(html, { headers });
      }
      await cache.put(url, response);
    }));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await Promise.all((await caches.keys()).filter(key => key.startsWith(prefix) && key !== cacheName).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== base.origin) return;
  if (urls.includes(url.href)) {
    event.respondWith(caches.open(cacheName).then(async cache => (await cache.match(request)) || fetch(request)));
    return;
  }
  // Other apps on jemsoft.ru and API/asset requests must never receive fallback HTML.
  const path = url.pathname.slice(base.pathname.length);
  if (!url.pathname.startsWith(base.pathname) || request.mode !== 'navigate' ||
      /^(api|assets|storage)(\/|$)/.test(path) || /\.[a-z0-9]+$/i.test(path)) return;
  event.respondWith(fetch(request).catch(async () => {
    const cache = await caches.open(cacheName);
    return (await cache.match(urls[0])) || Response.error();
  }));
});
