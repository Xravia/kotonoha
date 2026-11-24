/* Kotonoha offline app (2026-11-24). Keeps the game and its dictionaries on the device so it opens
   with no connection. A new build changes VERSION, the browser installs it in the background, and the page offers "Update now". */
'use strict';
const VERSION = '9f7f035bb4cd';
const CACHE = 'kotonoha-' + VERSION, FONTS = 'kotonoha-fonts';
const FILES = ["./","index.html","manifest.webmanifest","icons/icon-192.png","icons/icon-512.png","icons/maskable-512.png","icons/apple-touch-icon.png","data/kuromoji.js","data/kuro-1.js","data/kuro-2.js","data/kuro-3.js","data/kuro-4.js","data/jmdict.js","data/strokes.js","data/webllm.js","data/ort.js","data/LICENSES.txt"];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))));
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('kotonoha-') && k !== CACHE && k !== FONTS) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('message', e => { if (e.data === 'skip-waiting') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (req.headers.has('range')) return;
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const hit = await c.match(req, { ignoreSearch: true });
      if (hit) return hit;
      try { return await fetch(req); }
      catch (err) { if (req.mode === 'navigate') { const page = await c.match('index.html'); if (page) return page; } throw err; }
    })());
    return;
  }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith((async () => {
      const c = await caches.open(FONTS);
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()).catch(() => {}); return r; }).catch(() => null);
      return hit || (await net) || Response.error();
    })());
  }
});
