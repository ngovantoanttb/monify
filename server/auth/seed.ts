import { adminDb } from '../firebase/admin'
import { DEFAULT_ACCOUNTS, DEFAULT_SYSTEM_CATEGORIES } from '../../shared/constants'
import type { UserProfile } from '../../shared/types'

/**
 * Seed hồ sơ người dùng và dữ liệu mặc định trong 1 lần ghi nhiều đường dẫn (multi-path write)
 */
export async function seedUserProfileAndDefaults(
  uid: string,
  email: string,
  displayName: string,
  photoURL: string | null = null,
  idToken?: string
): Promise<UserProfile> {
  const now = Date.now()
  const userProfile: UserProfile = {
    uid,
    email,
    displayName: displayName || email.split('@')[0] || 'Người dùng',
    photoURL: photoURL || null,
    role: 'member',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  }

  const updates: Record<string, unknown> = {}

  // 1. Nhánh người dùng
  updates[`users/${uid}`] = userProfile

  // 2. 4 ví mặc định trong financial/{uid}/accounts
  DEFAULT_ACCOUNTS.forEach((acc, index) => {
    const accId = `acc_${index + 1}`
    updates[`financial/${uid}/accounts/${accId}`] = {
      name: acc.name,
      type: acc.type,
      openingBalance: acc.openingBalance,
      createdAt: now,
      updatedAt: now,
    }
  })

  // 3. Sao chép danh mục mặc định vào financial/{uid}/categories
  DEFAULT_SYSTEM_CATEGORIES.forEach((cat, index) => {
    const catId = `cat_${index + 1}`
    updates[`financial/${uid}/categories/${catId}`] = {
      name: cat.name,
      type: cat.type,
      icon: cat.icon,
      color: cat.color,
      isDefault: true,
      createdAt: now,
      updatedAt: now,
    }
  })

  // 1. Ghi vào Realtime Database qua Admin SDK (hoặc dev in-memory store)
  try {
    await adminDb.ref().update(updates)
  } catch {
    // bỏ qua nếu adminDb local dev chưa khởi tạo
  }

  // 2. Nếu có idToken người dùng, luôn đồng bộ trực tiếp lên Firebase Realtime Database qua REST API
  if (idToken) {
    try {
      const rtdbUrl =
        process.env.FIREBASE_DATABASE_URL || ''
      // Ghi users/{uid}
      await fetch(`${rtdbUrl}/users/${uid}.json?auth=${idToken}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userProfile),
      })
      // Ghi financial/{uid}
      const financialData: Record<string, any> = { accounts: {}, categories: {} }
      DEFAULT_ACCOUNTS.forEach((acc, index) => {
        const accId = `acc_${index + 1}`
        financialData.accounts[accId] = {
          name: acc.name,
          type: acc.type,
          openingBalance: acc.openingBalance,
          createdAt: now,
          updatedAt: now,
        }
      })
      DEFAULT_SYSTEM_CATEGORIES.forEach((cat, index) => {
        const catId = `cat_${index + 1}`
        financialData.categories[catId] = {
          name: cat.name,
          type: cat.type,
          icon: cat.icon,
          color: cat.color,
          isDefault: true,
          createdAt: now,
          updatedAt: now,
        }
      })
      await fetch(`${rtdbUrl}/financial/${uid}.json?auth=${idToken}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(financialData),
      })
    } catch {
      // Dự phòng lỗi mạng
    }
  }

  return userProfile
}
