import { database } from '@/lib/firebase/client'
import { ref, get, set, update, remove, push } from 'firebase/database'
import type { Category } from '@shared/types'
import { DEFAULT_SYSTEM_CATEGORIES } from '@shared/constants'
import type { CategoryFormValues } from '../schemas/categorySchema'
import { withTimeout } from '@/lib/firebase/timeout'

export const categoriesService = {
  /**
   * Lấy danh sách danh mục của người dùng
   */
  async getCategories(uid: string): Promise<Category[]> {
    const snap = await withTimeout(get(ref(database, `financial/${uid}/categories`)), null, 3000)
    if (!snap || !snap.exists()) {
      // Khởi tạo các danh mục mặc định nếu người dùng chưa có
      try {
        const now = Date.now()
        const initUpdates: Record<string, unknown> = {}
        const list: Category[] = []
        DEFAULT_SYSTEM_CATEGORIES.forEach((cat, index) => {
          const catId = `cat_${index + 1}`
          const catData = {
            name: cat.name,
            type: cat.type,
            icon: cat.icon,
            color: cat.color,
            isDefault: true,
            createdAt: now,
            updatedAt: now,
          }
          initUpdates[`categories/${catId}`] = catData
          list.push({ id: catId, ...catData })
        })
        await update(ref(database, `financial/${uid}`), initUpdates)
        return list
      } catch {
        return []
      }
    }

    const list: Category[] = []
    snap.forEach((child) => {
      const val = child.val()
      list.push({
        id: child.key!,
        name: val.name,
        type: val.type,
        icon: val.icon,
        color: val.color,
        isDefault: !!val.isDefault,
        createdAt: val.createdAt || 0,
        updatedAt: val.updatedAt || 0,
      })
    })
    return list
  },

  /**
   * Thêm danh mục mới
   */
  async createCategory(uid: string, values: CategoryFormValues): Promise<Category> {
    const categoriesRef = ref(database, `financial/${uid}/categories`)
    const newCategoryRef = push(categoriesRef)
    const now = Date.now()

    const newCategoryData = {
      name: values.name.trim(),
      type: values.type,
      icon: values.icon,
      color: values.color,
      isDefault: false,
      createdAt: now,
      updatedAt: now,
    }

    await set(newCategoryRef, newCategoryData)

    return {
      id: newCategoryRef.key!,
      ...newCategoryData,
    }
  },

  /**
   * Cập nhật danh mục
   */
  async updateCategory(uid: string, categoryId: string, values: CategoryFormValues): Promise<void> {
    const catRef = ref(database, `financial/${uid}/categories/${categoryId}`)
    const now = Date.now()

    await update(catRef, {
      name: values.name.trim(),
      type: values.type,
      icon: values.icon,
      color: values.color,
      updatedAt: now,
    })
  },

  /**
   * Xóa danh mục (Kiểm tra ràng buộc: không xóa khi đang có giao dịch hoặc ngân sách liên kết)
   */
  async deleteCategory(uid: string, categoryId: string): Promise<void> {
    // 1. Kiểm tra giao dịch
    const txSnap = await get(ref(database, `financial/${uid}/transactions`))
    if (txSnap.exists()) {
      let isUsedInTx = false
      txSnap.forEach((child) => {
        if (child.val().categoryId === categoryId) {
          isUsedInTx = true
        }
      })
      if (isUsedInTx) {
        throw new Error(
          'Không thể xóa danh mục đang có giao dịch liên kết. Vui lòng chuyển giao dịch sang mục khác trước.'
        )
      }
    }

    // 2. Kiểm tra ngân sách
    const budgetSnap = await get(ref(database, `financial/${uid}/budgets`))
    if (budgetSnap.exists()) {
      let isUsedInBudget = false
      budgetSnap.forEach((child) => {
        if (child.val().categoryId === categoryId) {
          isUsedInBudget = true
        }
      })
      if (isUsedInBudget) {
        throw new Error('Không thể xóa danh mục đang có hạn mức ngân sách liên kết.')
      }
    }

    // 3. Thực hiện xóa danh mục
    await remove(ref(database, `financial/${uid}/categories/${categoryId}`))
  },
}
