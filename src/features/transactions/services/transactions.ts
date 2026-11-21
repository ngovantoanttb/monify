import { database } from '@/lib/firebase/client'
import { ref, get, set, update, remove, push, query, orderByChild, limitToLast, endAt } from 'firebase/database'
import type { Transaction } from '@shared/types'
import type { TransactionFormValues } from '../schemas/transactionSchema'
import type { TransactionFilter } from '@/types'
import { withTimeout } from '@/lib/firebase/timeout'

export const transactionsService = {
  /**
   * Lấy tất cả giao dịch trong khoảng thời gian để lập báo cáo hoặc xuất CSV
   */
  async getAllTransactions(uid: string, startDate?: number, endDate?: number): Promise<Transaction[]> {
    const txRef = ref(database, `financial/${uid}/transactions`)
    const snap = await withTimeout(get(txRef), null, 3000)
    if (!snap || !snap.exists()) return []

    const list: Transaction[] = []
    snap.forEach((child) => {
      const val = child.val()
      const tx: Transaction = {
        id: child.key!,
        type: val.type,
        amount: val.amount,
        date: val.date,
        accountId: val.accountId,
        categoryId: val.categoryId,
        toAccountId: val.toAccountId,
        note: val.note || '',
        createdAt: val.createdAt,
        updatedAt: val.updatedAt,
      }
      if (startDate !== undefined && tx.date < startDate) return
      if (endDate !== undefined && tx.date > endDate) return
      list.push(tx)
    })

    return list.sort((a, b) => b.date - a.date || b.createdAt - a.createdAt)
  },

  /**
   * Lấy danh sách giao dịch có phân trang và lọc client trên khoảng thời gian
   * Mỗi trang 20 giao dịch theo trường date giảm dần
   */
  async getTransactions(
    uid: string,
    filters?: TransactionFilter,
    pageSize: number = 20,
    endBeforeDate?: number
  ): Promise<{ transactions: Transaction[]; hasMore: boolean }> {
    // Nếu có bộ lọc theo ngày/tháng, lấy toàn bộ giao dịch trong kỳ đó để không bị phân trang cắt bớt
    if (filters?.startDate !== undefined || filters?.endDate !== undefined) {
      const all = await transactionsService.getAllTransactions(uid, filters.startDate, filters.endDate)
      let filtered = all
      if (filters.type) {
        filtered = filtered.filter((t) => t.type === filters.type)
      }
      if (filters.categoryId) {
        filtered = filtered.filter((t) => t.categoryId === filters.categoryId)
      }
      if (filters.accountId) {
        filtered = filtered.filter((t) => t.accountId === filters.accountId || t.toAccountId === filters.accountId)
      }
      if (filters.search) {
        const queryStr = filters.search.toLowerCase()
        filtered = filtered.filter((t) => (t.note || '').toLowerCase().includes(queryStr))
      }
      return {
        transactions: filtered,
        hasMore: false,
      }
    }

    const txRef = ref(database, `financial/${uid}/transactions`)
    let txQuery = query(txRef, orderByChild('date'), limitToLast(pageSize + 1))

    if (endBeforeDate) {
      txQuery = query(txRef, orderByChild('date'), endAt(endBeforeDate), limitToLast(pageSize + 1))
    }

    const snap = await withTimeout(get(txQuery), null, 2500)
    if (!snap || !snap.exists()) {
      return { transactions: [], hasMore: false }
    }

    const list: Transaction[] = []
    snap.forEach((child) => {
      const val = child.val()
      list.push({
        id: child.key!,
        type: val.type,
        amount: val.amount,
        date: val.date,
        accountId: val.accountId,
        categoryId: val.categoryId,
        toAccountId: val.toAccountId,
        note: val.note || '',
        createdAt: val.createdAt,
        updatedAt: val.updatedAt,
      })
    })

    // Sắp xếp giảm dần theo ngày
    list.sort((a, b) => b.date - a.date || b.createdAt - a.createdAt)

    const hasMore = list.length > pageSize
    const paginatedList = hasMore ? list.slice(0, pageSize) : list

    // Lọc ở client theo các tiêu chí khác (loại, danh mục, ví, tìm kiếm)
    let filtered = paginatedList
    if (filters) {
      if (filters.type) {
        filtered = filtered.filter((t) => t.type === filters.type)
      }
      if (filters.categoryId) {
        filtered = filtered.filter((t) => t.categoryId === filters.categoryId)
      }
      if (filters.accountId) {
        filtered = filtered.filter((t) => t.accountId === filters.accountId || t.toAccountId === filters.accountId)
      }
      if (filters.search) {
        const queryStr = filters.search.toLowerCase()
        filtered = filtered.filter((t) => (t.note || '').toLowerCase().includes(queryStr))
      }
      if (filters.startDate) {
        filtered = filtered.filter((t) => t.date >= filters.startDate!)
      }
      if (filters.endDate) {
        filtered = filtered.filter((t) => t.date <= filters.endDate!)
      }
    }

    return {
      transactions: filtered,
      hasMore,
    }
  },

  /**
   * Thêm giao dịch mới
   */
  async createTransaction(uid: string, values: TransactionFormValues): Promise<Transaction> {
    const txRef = ref(database, `financial/${uid}/transactions`)
    const newTxRef = push(txRef)
    const now = Date.now()

    const newTxData: Record<string, unknown> = {
      type: values.type,
      amount: Math.round(values.amount),
      date: values.date,
      accountId: values.accountId,
      note: values.note?.trim() || '',
      createdAt: now,
      updatedAt: now,
    }

    if (values.type === 'transfer') {
      newTxData.toAccountId = values.toAccountId
    } else {
      newTxData.categoryId = values.categoryId
    }

    await set(newTxRef, newTxData)

    return {
      id: newTxRef.key!,
      ...(newTxData as any),
    }
  },

  /**
   * Cập nhật giao dịch
   */
  async updateTransaction(uid: string, txId: string, values: TransactionFormValues): Promise<void> {
    const txRef = ref(database, `financial/${uid}/transactions/${txId}`)
    const now = Date.now()

    const updateData: Record<string, unknown> = {
      type: values.type,
      amount: Math.round(values.amount),
      date: values.date,
      accountId: values.accountId,
      note: values.note?.trim() || '',
      updatedAt: now,
    }

    if (values.type === 'transfer') {
      updateData.toAccountId = values.toAccountId
      updateData.categoryId = null
    } else {
      updateData.categoryId = values.categoryId
      updateData.toAccountId = null
    }

    await update(txRef, updateData)
  },

  /**
   * Xóa giao dịch
   */
  async deleteTransaction(uid: string, txId: string): Promise<void> {
    await remove(ref(database, `financial/${uid}/transactions/${txId}`))
  },
}

