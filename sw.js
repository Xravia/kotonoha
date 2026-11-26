/* Kotonoha offline app (2026-11-26). Keeps the game and its dictionaries on the device so it opens
   with no connection. A new build changes VERSION; the browser installs it in the background, copying the files that did
   not change from the version already here (only the changed ones are downloaded), and it takes over at once. The page
   reloads itself into the new version when nothing is lost by it. */
'use strict';
const VERSION = 'addc8b5122d5';
const CACHE = 'kotonoha-' + VERSION, FONTS = 'kotonoha-fonts';
const FILES = ["./","index.html","manifest.webmanifest","icons/icon-192.png","icons/icon-512.png","icons/maskable-512.png","icons/apple-touch-icon.png","data/kuromoji.js","data/kuro-1.js","data/kuro-2.js","data/kuro-3.js","data/kuro-4.js","data/jmdict.js","data/strokes.js","data/webllm.js","data/ort.js","data/LICENSES.txt"];
const HASH = {"./":"42933fcb9a16bb653550af0df86a3438cf2d3bc29b089209f2b352fe08d8e0f8","index.html":"42933fcb9a16bb653550af0df86a3438cf2d3bc29b089209f2b352fe08d8e0f8","manifest.webmanifest":"088ff6ff98fc4ea6873ce05ac1a5813dbcad5812ba0d9569f5b153155ecc5992","icons/icon-192.png":"6dce5e35dae9c66371ab71b127080a6f4624d0d7e6c7f90e7a1e22a35deecb92","icons/icon-512.png":"f3d18b640c2c31873cb1edb05225ba0d650b67679accd8aadf065650647cb8e3","icons/maskable-512.png":"956661cad40fdb8eb2ba8f9c93d41ec0fc836b099d70dac8ca9b2a030be33556","icons/apple-touch-icon.png":"d73d8cd139977c9b7ebe172f22ef85bc8a4b629f937758ea8bd918e3e3e43b55","data/kuromoji.js":"1b10178a4ba3e149427d59c5cbb1f4779a1dbc991859ef4e67a97ba7387009ef","data/kuro-1.js":"b77e645123b4973bf4f1aea796fdd7da3bce0cb797fc10035d47c49306c7abf7","data/kuro-2.js":"695ffb8a69466d7750d9fe6810f766c68348a0531cde562c43977f180e5e42d1","data/kuro-3.js":"954651bb952ef1ec4f837880938d3de07de0b1e29b30a8752a232c7b61c76f36","data/kuro-4.js":"5f0ba9bfdee8bd7acf0424104afe2e5013fdbafbc981378f7f2275c4087afd8d","data/jmdict.js":"d126f43bd324c4d2c366cd8cd1f279697bec02d0ec6d10242f4a6d5f271bfa06","data/strokes.js":"30995bc7cceb8cc44affb16d5e960a5afbc961c656e1bc308c95dbfde7a65f6f","data/webllm.js":"047f6bef32b8d1605d0585e76aa9e7e15db59037c8c33b186a103b2713223404","data/ort.js":"e06dae9ab40b535d8692196b346799bfdbd74eea24485c49e8d641eda53aa0d3","data/LICENSES.txt":"76c06cedb1212c7fa2b701d4d9630457ac1fe20610acdeabefdf6a9e76b19b07"};
const LEGACY = ["05dbc5a0cd03","1a1e26696960","2e1175e888b5","410765965d5c","42f3846ed154","4a8e6841b38f","4d1d71292ee7","5d0fc4f034ba","6b66423f075e","76f805648c5f","8062f0cfb1f4","991657cc2557","9f7f035bb4cd","c2a8c28ea484","c7febbf416fc","d6d1f6219866","dcb1764088b1","e067ad00e875","e565c80b706d","e7a75d667f9b","e83113bb9725","fa9270020232"];
const hex = async res => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await res.clone().arrayBuffer()))).map(x => x.toString(16).padStart(2, '0')).join('');
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // where a file may already be: this version's own store (an install can run twice) and the versions before it
    const old = [CACHE].concat((await caches.keys()).filter(k => k.startsWith('kotonoha-') && k !== CACHE && k !== FONTS));
    self.stat = { reused: [], fetched: [] };
    await Promise.all(FILES.map(async f => {
      for (const k of old) {
        try { const r = await (await caches.open(k)).match(f); if (r && r.ok && (await hex(r)) === HASH[f]) { if (k !== CACHE) await c.put(f, r); self.stat.reused.push(f); return; } } catch (err) {}
      }
      const res = await fetch(new Request(f, { cache: 'reload' }));
      if (!res.ok) throw new Error(f + ': ' + res.status);
      await c.put(f, res);
      self.stat.fetched.push(f);
    }));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    let legacy = false;
    for (const k of await caches.keys()) if (k.startsWith('kotonoha-') && k !== CACHE && k !== FONTS) { if (LEGACY.indexOf(k.slice(9)) !== -1) legacy = true; await caches.delete(k); }
    await self.clients.claim();
    // pages from before 27 Nov 2026 do not reload themselves after an update: open them again in the new version.
    // Not waited for: the reopened pages need this worker, which answers only once it is active.
    if (legacy) { const ws = await self.clients.matchAll({ type: 'window' }); ws.forEach(w => { w.navigate(w.url).catch(() => {}); }); }
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
