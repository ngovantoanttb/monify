import { database } from '@/lib/firebase/client'
import { ref, get, set, update, remove, push } from 'firebase/database'
import type { Goal } from '@shared/types'
import type { GoalFormValues } from '../schemas/goalSchema'
import { withTimeout } from '@/lib/firebase/timeout'

export const goalsService = {
  /**
   * Lấy danh sách mục tiêu tiết kiệm của người dùng
   */
  async getGoals(uid: string): Promise<Goal[]> {
    const snap = await withTimeout(get(ref(database, `financial/${uid}/goals`)), null, 3000)
    if (!snap || !snap.exists()) return []

    const list: Goal[] = []
    snap.forEach((child) => {
      const val = child.val()
      list.push({
        id: child.key!,
        name: val.name,
        targetAmount: val.targetAmount || 0,
        savedAmount: val.savedAmount || 0,
        deadline: val.deadline || undefined,
        note: val.note || '',
        createdAt: val.createdAt || 0,
        updatedAt: val.updatedAt || 0,
      })
    })

    // Sắp xếp: chưa hoàn thành trước, theo hạn chót gần nhất trước
    list.sort((a, b) => {
      const aDone = a.savedAmount >= a.targetAmount
      const bDone = b.savedAmount >= b.targetAmount
      if (aDone !== bDone) return aDone ? 1 : -1

      if (a.deadline && b.deadline) return a.deadline - b.deadline
      if (a.deadline && !b.deadline) return -1
      if (!a.deadline && b.deadline) return 1
      return b.createdAt - a.createdAt
    })

    return list
  },

  /**
   * Tạo mục tiêu mới
   */
  async createGoal(uid: string, values: GoalFormValues): Promise<Goal> {
    const goalsRef = ref(database, `financial/${uid}/goals`)
    const newGoalRef = push(goalsRef)
    const now = Date.now()

    const newGoalData: Record<string, unknown> = {
      name: values.name.trim(),
      targetAmount: Math.round(values.targetAmount),
      savedAmount: Math.round(values.savedAmount || 0),
      createdAt: now,
      updatedAt: now,
    }

    if (values.deadline) {
      newGoalData.deadline = values.deadline
    }
    if (values.note?.trim()) {
      newGoalData.note = values.note.trim()
    }

    await set(newGoalRef, newGoalData)

    return {
      id: newGoalRef.key!,
      name: values.name.trim(),
      targetAmount: Math.round(values.targetAmount),
      savedAmount: Math.round(values.savedAmount || 0),
      deadline: values.deadline || undefined,
      note: values.note?.trim() || '',
      createdAt: now,
      updatedAt: now,
    }
  },

  /**
   * Cập nhật mục tiêu
   */
  async updateGoal(uid: string, goalId: string, values: GoalFormValues): Promise<void> {
    const goalRef = ref(database, `financial/${uid}/goals/${goalId}`)
    const now = Date.now()

    const updateData: Record<string, unknown> = {
      name: values.name.trim(),
      targetAmount: Math.round(values.targetAmount),
      savedAmount: Math.round(values.savedAmount || 0),
      note: values.note?.trim() || '',
      updatedAt: now,
    }

    if (values.deadline) {
      updateData.deadline = values.deadline
    } else {
      updateData.deadline = null
    }

    await update(goalRef, updateData)
  },

  /**
   * Nạp thêm tiền tiết kiệm nhanh vào mục tiêu
   */
  async addSavedAmount(uid: string, goalId: string, additionalAmount: number): Promise<void> {
    const goalRef = ref(database, `financial/${uid}/goals/${goalId}`)
    const snap = await get(goalRef)
    if (!snap.exists()) return

    const currentSaved = snap.val().savedAmount || 0
    const nextSaved = Math.max(0, currentSaved + Math.round(additionalAmount))

    await update(goalRef, {
      savedAmount: nextSaved,
      updatedAt: Date.now(),
    })
  },

  /**
   * Xóa mục tiêu
   */
  async deleteGoal(uid: string, goalId: string): Promise<void> {
    const goalRef = ref(database, `financial/${uid}/goals/${goalId}`)
    await remove(goalRef)
  },
}

