// sw.js — PWA 캐시 자동 갱신 버전
// 앱 파일을 바꿀 때마다 CACHE_VERSION을 올리면 기기에서 자동으로 새 버전을 받습니다.
const CACHE_VERSION = 'v3';
const CACHE_NAME = `fx-calc-cache-${CACHE_VERSION}`;

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k.startsWith('fx-calc-cache-') && k !== CACHE_NAME)
        .map(k => caches.delete(k)));
      await self.clients.claim();

      const allClients = await self.clients.matchAll({ includeUncontrolled: true });
      for (const client of allClients) {
        client.postMessage({ type: 'NEW_VERSION_READY' });
      }
    })()
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // 앱 자체 파일: 캐시 우선 + 백그라운드 갱신(stale-while-revalidate)
  if (url.origin === location.origin) {
    event.respondWith((async () => {
      const cached = await caches.match(event.request);
      const fetchPromise = fetch(event.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(event.request, copy));
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })());
    return;
  }

  // 외부 환율 API: 항상 네트워크 우선(캐시하지 않음). 마지막 환율은 앱이 직접 저장합니다.
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
