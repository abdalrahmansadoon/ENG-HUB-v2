/** نص عامل الخدمة. يخدم ملفات الموقع نفسه فقط ولا يلمس طلبات Firebase أو Cloudinary. */
export const serviceWorkerSource = (version: string, files: string[]) => `
const PREFIX = 'enghub2-';
const CACHE = PREFIX + '${version}';
const FILES = ${JSON.stringify(files)};

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('message', (event) => { if (event.data === 'skip') self.skipWaiting(); });
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (!request.url.startsWith(self.registration.scope)) return;
  // الصفحة من الشبكة أولاً لتصل النسخة الأحدث، ومن الذاكرة عند انقطاع الاتصال.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('./index.html', { cacheName: CACHE, ignoreVary: true })));
    return;
  }
  // ignoreVary: طلبات الوحدات تحمل ترويسة Origin التي لم تكن في طلب التخزين.
  event.respondWith(caches.match(request, { cacheName: CACHE, ignoreVary: true }).then((hit) => hit || fetch(request)));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL('./#/tasks' + (event.notification.tag ? '/' + encodeURIComponent(event.notification.tag) : ''), self.registration.scope).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (list) => {
    const open = list.find((c) => c.url.startsWith(self.registration.scope));
    if (!open) return self.clients.openWindow(target);
    await open.focus();
    return open.navigate(target).catch(() => {});
  }));
});
`;
