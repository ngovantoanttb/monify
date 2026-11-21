const CACHE_NAME = 'monify-static-v3'
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
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Cache addAll failed:', err)
      })
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
  // Chỉ can thiệp method GET
  if (event.request.method !== 'GET') {
    return
  }

  const url = new URL(event.request.url)

  // 1. Chỉ can thiệp các request cùng origin (same-origin), bỏ qua hoàn toàn các dịch vụ bên thứ 3 (Google Auth, Firebase, CDN...)
  if (url.origin !== self.location.origin) {
    return
  }

  // 2. TUYỆT ĐỐI KHÔNG lưu đệm API (/api/*) hoặc WebSocket
  if (
    url.pathname.startsWith('/api/') ||
    url.protocol.startsWith('ws')
  ) {
    return
  }

  // 3. Với request điều hướng trang (HTML navigation): Network-first, fallback sang offline.html hoặc cache /
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const offlineMatch = await caches.match('/offline.html')
        if (offlineMatch) return offlineMatch
        const rootMatch = await caches.match('/')
        if (rootMatch) return rootMatch
        return new Response('Ứng dụng hiện đang ngoại tuyến. Vui lòng kiểm tra lại kết nối mạng.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        })
      })
    )
    return
  }

  // 4. Với các tài nguyên tĩnh cùng origin (CSS, JS, images, fonts): Cache-first / Stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then(async (cachedResponse) => {
      try {
        const networkResponse = await fetch(event.request)
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache)
          })
        }
        return networkResponse
      } catch {
        if (cachedResponse) return cachedResponse
        // Fallback response thay vì undefined để tránh crash Service Worker
        return new Response(null, { status: 404, statusText: 'Not Found in Cache' })
      }
    })
  )
})
