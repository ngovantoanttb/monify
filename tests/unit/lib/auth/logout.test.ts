import { describe, it, expect, vi, beforeEach } from 'vitest'
import { performLogout } from '@/lib/auth/logout'
import { auth } from '@/lib/firebase/client'
import { signOut } from 'firebase/auth'
import { authApi } from '@/lib/api/auth'
import { useAuthStore } from '@/stores/auth'

vi.mock('@/lib/firebase/client', () => ({
  auth: { currentUser: { uid: 'user_123' } },
}))

vi.mock('firebase/auth', () => ({
  signOut: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/api/auth', () => ({
  authApi: {
    logout: vi.fn().mockResolvedValue({ message: 'Success' }),
  },
}))

vi.mock('@/stores/auth', () => {
  const clearAuth = vi.fn()
  return {
    useAuthStore: {
      getState: vi.fn().mockReturnValue({
        clearAuth,
      }),
    },
  }
})

describe('performLogout Security Test', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem('access_token', 'test-token')
    sessionStorage.setItem('temp_data', 'secret')
  })

  it('đăng xuất đơn thiết bị: xóa store, gọi signOut, gọi API logout và dọn sạch storage', async () => {
    await performLogout(false)

    expect(useAuthStore.getState().clearAuth).toHaveBeenCalled()
    expect(signOut).toHaveBeenCalledWith(auth)
    expect(authApi.logout).toHaveBeenCalledWith(false)
    expect(localStorage.getItem('access_token')).toBeNull()
    expect(sessionStorage.getItem('temp_data')).toBeNull()
  })

  it('đăng xuất mọi thiết bị: truyền cờ all=true vào backend API', async () => {
    await performLogout(true)

    expect(useAuthStore.getState().clearAuth).toHaveBeenCalled()
    expect(signOut).toHaveBeenCalledWith(auth)
    expect(authApi.logout).toHaveBeenCalledWith(true)
  })

  it('vẫn hoàn tất đăng xuất và xóa client store ngay cả khi backend API hoặc Firebase signOut bị lỗi', async () => {
    vi.mocked(signOut).mockRejectedValueOnce(new Error('Network error'))
    vi.mocked(authApi.logout).mockRejectedValueOnce(new Error('Backend 500'))

    await expect(performLogout(false)).resolves.not.toThrow()
    expect(useAuthStore.getState().clearAuth).toHaveBeenCalled()
    expect(localStorage.getItem('access_token')).toBeNull()
  })
})

