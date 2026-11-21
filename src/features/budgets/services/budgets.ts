import { database } from '@/lib/firebase/client'
import { ref, get, set, remove } from 'firebase/database'
import type { Budget, SystemConfig } from '@shared/types'
import { DEFAULT_BUDGET_WARNING_THRESHOLD } from '@shared/constants'
import type { BudgetFormValues } from '../schemas/budgetSchema'
import { withTimeout } from '@/lib/firebase/timeout'

export const budgetsService = {
  /**
   * Lấy danh sách ngân sách của người dùng, có thể lọc theo tháng (yyyy-MM)
   */
  async getBudgets(uid: string, month?: string): Promise<Budget[]> {
    const snap = await withTimeout(get(ref(database, `financial/${uid}/budgets`)), null, 3000)
    if (!snap || !snap.exists()) return []

    const list: Budget[] = []
    snap.forEach((child) => {
      const val = child.val()
      const budget: Budget = {
        id: child.key!,
        month: val.month,
        categoryId: val.categoryId,
        amount: val.amount ?? 0,
        createdAt: val.createdAt || 0,
        updatedAt: val.updatedAt || 0,
      }

      if (!month || budget.month === month) {
        list.push(budget)
      }
    })

    return list
  },

  /**
   * Lấy ngân sách của một danh mục trong tháng cụ thể
   */
  async getBudget(uid: string, month: string, categoryId: string): Promise<Budget | null> {
    const budgetId = `${month}_${categoryId}`
    const snap = await get(ref(database, `financial/${uid}/budgets/${budgetId}`))
    if (!snap.exists()) return null

    const val = snap.val()
    return {
      id: budgetId,
      month: val.month,
      categoryId: val.categoryId,
      amount: val.amount ?? 0,
      createdAt: val.createdAt || 0,
      updatedAt: val.updatedAt || 0,
    }
  },

  /**
   * Thiết lập hoặc cập nhật hạn mức ngân sách
   */
  async setBudget(uid: string, values: BudgetFormValues): Promise<Budget> {
    const { month, categoryId, amount } = values
    const budgetId = `${month}_${categoryId}`
    const budgetRef = ref(database, `financial/${uid}/budgets/${budgetId}`)

    const snap = await get(budgetRef)
    const now = Date.now()
    const createdAt = snap.exists() ? snap.val().createdAt || now : now

    const budgetData = {
      month,
      categoryId,
      amount: Math.round(amount),
      createdAt,
      updatedAt: now,
    }

    await set(budgetRef, budgetData)

    return {
      id: budgetId,
      ...budgetData,
    }
  },

  /**
   * Xóa hạn mức ngân sách
   */
  async deleteBudget(uid: string, month: string, categoryId: string): Promise<void> {
    const budgetId = `${month}_${categoryId}`
    await remove(ref(database, `financial/${uid}/budgets/${budgetId}`))
  },

  /**
   * Lấy cấu hình hệ thống (ngưỡng cảnh báo ngân sách)
   */
  async getSystemConfig(): Promise<SystemConfig> {
    try {
      const snap = await withTimeout(get(ref(database, 'systemConfig/app')), null, 2500)
      if (!snap || !snap.exists()) {
        return {
          budgetWarningThreshold: DEFAULT_BUDGET_WARNING_THRESHOLD,
          updatedAt: Date.now(),
        }
      }
      const val = snap.val()
      return {
        budgetWarningThreshold:
          typeof val.budgetWarningThreshold === 'number'
            ? val.budgetWarningThreshold
            : DEFAULT_BUDGET_WARNING_THRESHOLD,
        updatedAt: val.updatedAt || Date.now(),
      }
    } catch {
      return {
        budgetWarningThreshold: DEFAULT_BUDGET_WARNING_THRESHOLD,
        updatedAt: Date.now(),
      }
    }
  },
}

