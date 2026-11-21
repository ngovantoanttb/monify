import React from 'react'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/lib/api/auth'
import { auth } from '@/lib/firebase/client'
import { onAuthStateChanged } from 'firebase/auth'
import { ensureUserDataInitialized } from '@/lib/firebase/initUserData'
import type { UserRole } from '@shared/types'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, clearAuth, setLoading } = useAuthStore()

  React.useEffect(() => {
    let isMounted = true

    // Giới hạn thời gian kiểm tra phiên tối đa 1.5s để ứng dụng không bao giờ bị treo ở màn hình loading
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        setLoading(false)
      }
    }, 1500)

    let unsubscribe: (() => void) | undefined

    try {
      // 1. Luôn đăng ký lắng nghe sự kiện đăng nhập / đăng xuất từ Firebase Auth
      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (!isMounted) return

        if (firebaseUser) {
          const currentStoreUser = useAuthStore.getState().user
          if (currentStoreUser && currentStoreUser.uid === firebaseUser.uid && currentStoreUser.role) {
            // Đã được khởi tạo đầy đủ từ LoginPage, bỏ qua lặp lại
            if (isMounted) {
              clearTimeout(timeoutId)
              setLoading(false)
            }
            return
          }

          try {
            // 1. Luôn đồng bộ và đảm bảo dữ liệu người dùng được ghi thực tế vào Firebase Realtime Database
            const profile = await ensureUserDataInitialized(firebaseUser)
            if (isMounted) {
              setUser(profile)
            }

            // 2. Tạo phiên cookie session với backend API
            try {
              const idToken = await firebaseUser.getIdToken()
              const loginRes = await authApi.login(idToken)
              if (isMounted && loginRes?.user) {
                const effectiveRole: UserRole =
                  profile.role === 'admin' || loginRes.user.role === 'admin'
                    ? 'admin'
                    : (loginRes.user.role || profile.role || 'member')
                setUser({
                  ...profile,
                  ...loginRes.user,
                  role: effectiveRole,
                })
              }
            } catch {
              // Backend session là tùy chọn trong môi trường dev cục bộ
            }
          } catch (initErr) {
            console.error('[AuthProvider] Không thể khởi tạo dữ liệu trong Firebase Realtime Database:', initErr)
            if (isMounted) {
              clearAuth()
            }
          }
        } else {
          // Firebase xác nhận không có người dùng đăng nhập -> Xóa sạch phiên
          if (isMounted) {
            clearAuth()
          }
        }

        if (isMounted) {
          clearTimeout(timeoutId)
          setLoading(false)
        }
      })
    } catch {
      if (isMounted) {
        clearAuth()
        clearTimeout(timeoutId)
        setLoading(false)
      }
    }

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [setUser, clearAuth, setLoading])

  return <>{children}</>
}

