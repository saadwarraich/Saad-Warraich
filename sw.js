// Sidewalk Sums: keeps the game on the device so it opens with no internet.
// The page itself is fetched fresh when there is a connection, so updates arrive on the next open.
const CACHE = 'sidewalk-sums-1';
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', './icon.png'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const slow = ms => new Promise((_, no) => setTimeout(() => no(new Error('slow')), ms));
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url), own = url.origin === location.origin;
  const font = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!own && !font) return;
  if (req.mode === 'navigate'){
    // the page: network first (4 seconds), saved copy when offline
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      try { const res = await Promise.race([fetch(req), slow(4000)]); if (res && res.ok) c.put('./', res.clone()); return res; }
      catch (err){ return (await c.match('./')) || fetch(req); }
    })());
    return;
  }
  // icon and fonts: saved copy first, refreshed in the background
  e.respondWith((async () => {
    const c = await caches.open(CACHE), hit = await c.match(req);
    const net = fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  })());
});
