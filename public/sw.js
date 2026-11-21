const CACHE_NAME = 'monify-static-v1'
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/favicon.ico',
  '/monify-mark.svg',
  '/monify-logo.svg',
  '/apple-touch-icon.png',
]

// Cài đặt Service Worker và lưu đệm tài nguyên tĩnh ban đầu
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

// Kích hoạt và dọn dẹp các phiên bản cache cũ
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// Chặn và xử lý fetch request
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // 1. TUYỆT ĐỐI KHÔNG lưu đệm API (/api/*) hoặc Firebase Realtime Database
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('firebaseio.com') ||
    url.protocol.startsWith('ws')
  ) {
    // Network-only cho API và dữ liệu tài chính
    return
  }

  // 2. Với request điều hướng trang (HTML navigation): Network-first, fallback sang offline.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/offline.html')
      })
    )
    return
  }

  // 3. Với các tài nguyên tĩnh khác (font, ảnh logo, CSS, JS): Stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache)
            })
          }
          return networkResponse
        })
        .catch(() => cachedResponse)

      return cachedResponse || fetchPromise
    })
  )
})

