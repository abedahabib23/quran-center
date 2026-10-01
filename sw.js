// بيخزّن التطبيق على الجهاز حتى يفتح بدون إنترنت. النسخة: 227141dc05
const VERSION = 'qc-227141dc05';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('qc-') && k !== VERSION && k !== 'qc-fonts').map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // ملفات التطبيق بس (مش أي طلب تاني): من الجهاز فوراً، وبالخلفية بنجيب النسخة الجديدة إذا في إنترنت
  const shell = SHELL.some(p => new URL(p, self.registration.scope).pathname === url.pathname);
  if (url.origin === location.origin && (shell || req.mode === 'navigate')) {
    e.respondWith(caches.open(VERSION).then(async c => {
      const hit = (await c.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' ? await c.match('./index.html') : null);
      const fresh = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => null);
      return hit || (await fresh) || Response.error();
    }));
    return;
  }
  // الخط: بينحفظ أول مرة وبعدها من الجهاز
  if (/(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.open('qc-fonts').then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const r = await fetch(req);
      if (r.ok || r.type === 'opaque') c.put(req, r.clone());
      return r;
    }));
  }
});
