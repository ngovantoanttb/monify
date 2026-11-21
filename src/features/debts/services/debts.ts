import { database } from '@/lib/firebase/client'
import { ref, get, set, update, remove, push } from 'firebase/database'
import type { Debt } from '@shared/types'
import type { DebtFormValues } from '../schemas/debtSchema'
import { withTimeout } from '@/lib/firebase/timeout'

export const debtsService = {
  /**
   * Lấy danh sách công nợ của người dùng
   */
  async getDebts(uid: string): Promise<Debt[]> {
    const snap = await withTimeout(get(ref(database, `financial/${uid}/debts`)), null, 3000)
    if (!snap || !snap.exists()) return []

    const list: Debt[] = []
    snap.forEach((child) => {
      const val = child.val()
      list.push({
        id: child.key!,
        kind: val.kind,
        personName: val.personName,
        content: val.content,
        principal: val.principal || 0,
        paidAmount: val.paidAmount || 0,
        dueDate: val.dueDate || undefined,
        note: val.note || '',
        createdAt: val.createdAt || 0,
        updatedAt: val.updatedAt || 0,
      })
    })

    // Sắp xếp: chưa tất toán trước, theo hạn gần nhất trước
    list.sort((a, b) => {
      const aSettled = a.paidAmount >= a.principal
      const bSettled = b.paidAmount >= b.principal
      if (aSettled !== bSettled) return aSettled ? 1 : -1

      if (a.dueDate && b.dueDate) return a.dueDate - b.dueDate
      if (a.dueDate && !b.dueDate) return -1
      if (!a.dueDate && b.dueDate) return 1
      return b.createdAt - a.createdAt
    })

    return list
  },

  /**
   * Tạo khoản nợ mới
   */
  async createDebt(uid: string, values: DebtFormValues): Promise<Debt> {
    const debtsRef = ref(database, `financial/${uid}/debts`)
    const newDebtRef = push(debtsRef)
    const now = Date.now()

    const newDebtData: Record<string, unknown> = {
      kind: values.kind,
      personName: values.personName.trim(),
      content: values.content.trim(),
      principal: Math.round(values.principal),
      paidAmount: Math.round(values.paidAmount || 0),
      createdAt: now,
      updatedAt: now,
    }

    if (values.dueDate) {
      newDebtData.dueDate = values.dueDate
    }
    if (values.note?.trim()) {
      newDebtData.note = values.note.trim()
    }

    await set(newDebtRef, newDebtData)

    return {
      id: newDebtRef.key!,
      kind: values.kind,
      personName: values.personName.trim(),
      content: values.content.trim(),
      principal: Math.round(values.principal),
      paidAmount: Math.round(values.paidAmount || 0),
      dueDate: values.dueDate || undefined,
      note: values.note?.trim() || '',
      createdAt: now,
      updatedAt: now,
    }
  },

  /**
   * Cập nhật thông tin khoản nợ
   */
  async updateDebt(uid: string, debtId: string, values: DebtFormValues): Promise<void> {
    const debtRef = ref(database, `financial/${uid}/debts/${debtId}`)
    const now = Date.now()

    const updateData: Record<string, unknown> = {
      kind: values.kind,
      personName: values.personName.trim(),
      content: values.content.trim(),
      principal: Math.round(values.principal),
      paidAmount: Math.round(values.paidAmount || 0),
      note: values.note?.trim() || '',
      updatedAt: now,
    }

    if (values.dueDate) {
      updateData.dueDate = values.dueDate
    } else {
      updateData.dueDate = null
    }

    await update(debtRef, updateData)
  },

  /**
   * Ghi nhận thanh toán thêm vào khoản nợ
   */
  async recordPayment(uid: string, debtId: string, additionalAmount: number): Promise<void> {
    const debtRef = ref(database, `financial/${uid}/debts/${debtId}`)
    const snap = await get(debtRef)
    if (!snap.exists()) return

    const principal = snap.val().principal || 0
    const currentPaid = snap.val().paidAmount || 0
    const nextPaid = Math.min(principal, currentPaid + Math.round(additionalAmount))

    await update(debtRef, {
      paidAmount: nextPaid,
      updatedAt: Date.now(),
    })
  },

  /**
   * Xóa khoản nợ
   */
  async deleteDebt(uid: string, debtId: string): Promise<void> {
    const debtRef = ref(database, `financial/${uid}/debts/${debtId}`)
    await remove(debtRef)
  },
}

