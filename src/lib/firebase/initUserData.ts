import { database } from '@/lib/firebase/client'
import { ref, get, set, update, serverTimestamp } from 'firebase/database'
import { DEFAULT_ACCOUNTS, DEFAULT_SYSTEM_CATEGORIES } from '@shared/constants'
import type { User } from 'firebase/auth'
import type { UserProfile, UserRole } from '@shared/types'

/**
 * Đảm bảo hồ sơ người dùng và các ví, danh mục mặc định đã được khởi tạo trong Firebase Realtime Database
 */
export async function ensureUserDataInitialized(
  fbUser: User,
  customDisplayName?: string
): Promise<UserProfile> {
  const uid = fbUser.uid
  const email = fbUser.email || ''
  const displayName = (customDisplayName || fbUser.displayName || email.split('@')[0] || 'Người dùng').slice(0, 60)
  const photoURL = fbUser.photoURL ? fbUser.photoURL.slice(0, 500) : ''
  const providerId = fbUser.providerData?.[0]?.providerId || 'password'

  const userRef = ref(database, `users/${uid}`)

  // Hồ sơ chuẩn làm fallback an toàn tránh ứng dụng bị treo khi kết nối Realtime Database có độ trễ
  const baseProfile: UserProfile = {
    uid,
    email,
    displayName,
    photoURL: photoURL || null,
    role: 'member',
    status: 'active',
    providerId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  try {
    const snap = await get(userRef)

    // Bước 1: Ghi hồ sơ users/$uid nếu chưa tồn tại (Đăng ký mới)
    if (!snap.exists()) {
      const newUserData: Record<string, unknown> = {
        uid,
        email,
        displayName,
        role: 'member',
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
      if (photoURL) {
        newUserData.photoURL = photoURL
      }
      if (providerId) {
        newUserData.providerId = providerId
      }

      await set(userRef, newUserData)
    } else {
      // Người dùng đã tồn tại (Đăng nhập): Cập nhật thời điểm đăng nhập & thông tin mới nhất
      const updateData: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
      }
      if (customDisplayName && snap.val()?.displayName !== customDisplayName) {
        updateData.displayName = customDisplayName
      }
      if (photoURL && snap.val()?.photoURL !== photoURL) {
        updateData.photoURL = photoURL
      }
      if (providerId && !snap.val()?.providerId) {
        updateData.providerId = providerId
      }

      await update(userRef, updateData)
    }

    // Bước 2: Kiểm tra và khởi tạo các ví và danh mục mặc định trong financial/$uid
    const accountsRef = ref(database, `financial/${uid}/accounts`)
    const accountsSnap = await get(accountsRef).catch(() => null)

    if (!accountsSnap || !accountsSnap.exists()) {
      const financialUpdates: Record<string, unknown> = {}

      // Tạo 4 ví mặc định
      DEFAULT_ACCOUNTS.forEach((acc, index) => {
        const accId = `acc_${index + 1}`
        financialUpdates[`accounts/${accId}`] = {
          name: acc.name,
          type: acc.type,
          openingBalance: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      })

      // Tạo 13 danh mục mặc định
      DEFAULT_SYSTEM_CATEGORIES.forEach((cat, index) => {
        const catId = `cat_${index + 1}`
        financialUpdates[`categories/${catId}`] = {
          name: cat.name,
          type: cat.type,
          icon: cat.icon,
          color: cat.color,
          isDefault: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      })

      await update(ref(database, `financial/${uid}`), financialUpdates).catch((err) => {
        console.warn('[initUserData] Warning seeding financial defaults:', err)
      })
    }

    // Đọc lại dữ liệu thực tế từ Realtime Database để đồng bộ chính xác về Store
    const finalSnap = await get(userRef).catch(() => null)
    const dbVal = finalSnap?.val() || {}

    const adminEmails = ((import.meta.env.VITE_ADMIN_EMAILS as string) || '')
      .split(',')
      .map((e: string) => e.trim().toLowerCase())
      .filter(Boolean)
    const isEmailAdmin = Boolean(email && adminEmails.includes(email.toLowerCase()))
    const effectiveRole: UserRole =
      dbVal?.role === 'admin' || isEmailAdmin ? 'admin' : (dbVal?.role || 'member')

    // Nếu được định danh admin qua cấu hình mà RTDB chưa cập nhật, cập nhật ngay
    if (isEmailAdmin && dbVal?.role !== 'admin') {
      await update(userRef, { role: 'admin' }).catch(() => {})
    }

    return {
      uid,
      email: dbVal?.email || email,
      displayName: dbVal?.displayName || displayName,
      photoURL: dbVal?.photoURL || photoURL || null,
      role: effectiveRole,
      status: dbVal?.status || 'active',
      providerId: dbVal?.providerId || providerId,
      createdAt: dbVal?.createdAt || baseProfile.createdAt,
      updatedAt: dbVal?.updatedAt || baseProfile.updatedAt,
    }
  } catch (err: any) {
    console.error('[initUserData] Lỗi cập nhật Realtime Database:', err)
    return baseProfile
  }
}
