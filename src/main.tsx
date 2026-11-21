import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import './index.css'
import { useThemeStore, applyTheme } from './stores/theme'

// Khởi tạo chủ đề giao diện (light / dark)
applyTheme(useThemeStore.getState().theme)

// Đăng ký Service Worker cho PWA khi được hỗ trợ
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Bỏ qua lỗi nếu môi trường không hỗ trợ SW
    })
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
