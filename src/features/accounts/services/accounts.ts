import { database } from '@/lib/firebase/client'
import { ref, get, set, update, remove, push } from 'firebase/database'
import type { Account } from '@shared/types'
import { DEFAULT_ACCOUNTS } from '@shared/constants'
import type { AccountFormValues } from '../schemas/accountSchema'
import { withTimeout } from '@/lib/firebase/timeout'

export const accountsService = {
  /**
   * Lấy danh sách ví của người dùng
   */
  async getAccounts(uid: string): Promise<Account[]> {
    const snap = await withTimeout(get(ref(database, `financial/${uid}/accounts`)), null, 3000)
    if (!snap || !snap.exists()) {
      // Khởi tạo các ví mặc định nếu người dùng chưa có ví nào
      try {
        const now = Date.now()
        const initUpdates: Record<string, unknown> = {}
        const list: Account[] = []
        DEFAULT_ACCOUNTS.forEach((acc, index) => {
          const accId = `acc_${index + 1}`
          const accData = {
            name: acc.name,
            type: acc.type,
            openingBalance: acc.openingBalance,
            note: '',
            createdAt: now,
            updatedAt: now,
          }
          initUpdates[`accounts/${accId}`] = accData
          list.push({ id: accId, ...accData })
        })
        await update(ref(database, `financial/${uid}`), initUpdates)
        return list
      } catch {
        return []
      }
    }

    const list: Account[] = []
    snap.forEach((child) => {
      const val = child.val()
      list.push({
        id: child.key!,
        name: val.name,
        type: val.type,
        openingBalance: val.openingBalance || 0,
        note: val.note || '',
        createdAt: val.createdAt || 0,
        updatedAt: val.updatedAt || 0,
      })
    })
    return list
  },

  /**
   * Thêm ví mới
   */
  async createAccount(uid: string, values: AccountFormValues): Promise<Account> {
    const accountsRef = ref(database, `financial/${uid}/accounts`)
    const newAccountRef = push(accountsRef)
    const now = Date.now()

    const newAccountData = {
      name: values.name.trim(),
      type: values.type,
      openingBalance: Math.round(values.openingBalance),
      note: values.note?.trim() || '',
      createdAt: now,
      updatedAt: now,
    }

    await set(newAccountRef, newAccountData)

    return {
      id: newAccountRef.key!,
      ...newAccountData,
    }
  },

  /**
   * Cập nhật thông tin ví
   */
  async updateAccount(uid: string, accountId: string, values: AccountFormValues): Promise<void> {
    const accountRef = ref(database, `financial/${uid}/accounts/${accountId}`)
    const now = Date.now()

    await update(accountRef, {
      name: values.name.trim(),
      type: values.type,
      openingBalance: Math.round(values.openingBalance),
      note: values.note?.trim() || '',
      updatedAt: now,
    })
  },

  /**
   * Xóa ví (Kiểm tra ràng buộc: không xóa khi đang có giao dịch phát sinh)
   */
  async deleteAccount(uid: string, accountId: string): Promise<void> {
    // 1. Kiểm tra có giao dịch nào dùng ví này không
    const txSnap = await get(ref(database, `financial/${uid}/transactions`))
    if (txSnap.exists()) {
      let isUsed = false
      txSnap.forEach((child) => {
        const tx = child.val()
        if (tx.accountId === accountId || tx.toAccountId === accountId) {
          isUsed = true
        }
      })
      if (isUsed) {
        throw new Error('Không thể xóa ví đang có giao dịch phát sinh. Vui lòng chuyển hoặc xóa giao dịch trước.')
      }
    }

    // 2. Thực hiện xóa ví
    await remove(ref(database, `financial/${uid}/accounts/${accountId}`))
  },
}
