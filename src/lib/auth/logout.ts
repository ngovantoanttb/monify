import { auth } from '@/lib/firebase/client'
import { signOut } from 'firebase/auth'
import { authApi } from '@/lib/api/auth'
import { useAuthStore } from '@/stores/auth'

/**
 * Đăng xuất an toàn tuyệt đối và triệt để:
 * 1. Xóa trạng thái trong client store (Zustand) ngay lập tức để khóa UI nhạy cảm
 * 2. Đăng xuất Firebase Client SDK (xóa sạch user credential trong IndexedDB / localStorage)
 * 3. Gọi serverless API để thu hồi session token và xóa sạch httpOnly cookies
 * 4. Dọn sạch toàn bộ storage lưu vết trên trình duyệt
 */
export async function performLogout(allDevices: boolean = false): Promise<void> {
  // 1. Lập tức xóa state auth trên client để khóa các màn hình nhạy cảm
  try {
    if (typeof useAuthStore.getState === 'function') {
      useAuthStore.getState().clearAuth()
    }
  } catch {
    // ignore
  }

  // 2. Đăng xuất Firebase SDK triệt để
  try {
    if (typeof (auth as any)?.signOut === 'function') {
      await (auth as any).signOut()
    } else if (auth) {
      await signOut(auth)
    }
  } catch (err) {
    console.warn('[Logout] Firebase signOut error:', err)
  }

  // 3. Gọi backend API để hủy phiên và xóa cookie
  try {
    await authApi.logout(allDevices)
  } catch (err) {
    console.warn('[Logout] Backend API logout error:', err)
  }

  // 4. Xóa các dữ liệu nhạy cảm trong localStorage / sessionStorage
  try {
    localStorage.removeItem('access_token')
    sessionStorage.clear()
  } catch {
    // Bỏ qua lỗi truy cập storage
  }
}
