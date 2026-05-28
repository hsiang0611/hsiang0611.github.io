// 香港之旅 — Service Worker（離線快取）
// 改版時請更新版本號，使用者下次連線就會自動取得新內容
const CACHE = 'hk-trip-v1';

// 要預先快取的「應用程式骨架」資源
const ASSETS = [
  './',
  './index.html',
  './image01.jpg',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 安裝：逐一加入快取（用 allSettled，缺少某個檔案也不會整個失敗）
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.allSettled(ASSETS.map((url) => cache.add(url)))
    )
  );
  self.skipWaiting();
});

// 啟用：清除舊版本快取
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 攔截請求
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 跨網域 API（天氣、預報、匯率）：直接走網路，離線時頁面本身已有容錯處理
  if (url.origin !== self.location.origin) return;

  // 同網域資源：先回快取，背景再上網更新（stale-while-revalidate）
  event.respondWith(
    caches.match(req).then((cached) => {
      const fromNetwork = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fromNetwork;
    })
  );
});
