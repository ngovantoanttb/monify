import { describe, it, expect, beforeEach, vi } from 'vitest'
import { calculateAccountBalance } from '@/lib/finance'
import type { Transaction } from '@shared/types'

type DbTree = Record<string, any>

let mockAuthUid: string | null = 'user_1'
let mockDb: DbTree = {}
let simulateNullCacheOnFirstRun = false
let failCommitError: Error | null = null
let concurrentHook: (() => void) | null = null
let pushSeq = 0

function clone<T>(val: T): T {
  return val === undefined ? val : JSON.parse(JSON.stringify(val))
}

function getByPath(root: DbTree, path: string): any {
  const parts = path.split('/').filter(Boolean)
  let curr: any = root
  for (const p of parts) {
    if (curr == null || typeof curr !== 'object') return undefined
    curr = curr[p]
  }
  return curr
}

function setByPath(root: DbTree, path: string, val: any): void {
  const parts = path.split('/').filter(Boolean)
  if (parts.length === 0) return
  let curr: any = root
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]!
    if (curr[key] == null || typeof curr[key] !== 'object') {
      curr[key] = {}
    }
    curr = curr[key]
  }
  const lastKey = parts[parts.length - 1]!
  if (val === null || val === undefined) {
    delete curr[lastKey]
  } else {
    curr[lastKey] = clone(val)
  }
}

function makeSnapshot(val: any, key: string | null = null) {
  const exists = val !== undefined && val !== null
  return {
    key,
    exists: () => exists,
    val: () => (exists ? clone(val) : null),
    forEach: (cb: (child: any) => void) => {
      if (exists && typeof val === 'object') {
        for (const [k, v] of Object.entries(val)) {
          cb(makeSnapshot(v, k))
        }
      }
    },
  }
}

vi.mock('@/lib/firebase/client', () => ({
  auth: {
    get currentUser() {
      return mockAuthUid ? { uid: mockAuthUid } : null
    },
  },
  database: {},
}))

vi.mock('firebase/database', () => ({
  ref: (_db: any, path: string) => ({
    path,
    key: path.split('/').filter(Boolean).pop() || null,
  }),
  push: (refObj: { path: string }) => {
    pushSeq += 1
    const key = `key_${pushSeq}`
    return { path: `${refObj.path}/${key}`, key }
  },
  get: async (refObj: { path: string; key: string | null }) => {
    const val = getByPath(mockDb, refObj.path)
    return makeSnapshot(val, refObj.key)
  },
  set: async (refObj: { path: string }, val: any) => {
    setByPath(mockDb, refObj.path, val)
  },
  update: async (refObj: { path: string }, updates: Record<string, any>) => {
    for (const [relPath, val] of Object.entries(updates)) {
      const fullPath = `${refObj.path}/${relPath}`
      setByPath(mockDb, fullPath, val)
    }
  },
  remove: async (refObj: { path: string }) => {
    setByPath(mockDb, refObj.path, null)
  },
  runTransaction: async (refObj: { path: string; key: string | null }, updater: (curr: any) => any) => {
    let attempts = 0
    while (attempts < 5) {
      attempts += 1
      const currentVal = getByPath(mockDb, refObj.path)
      const beforeJson = JSON.stringify(currentVal ?? null)

      // Giả lập lần chạy đầu chưa có cache local (trả null) nếu bật cờ
      if (attempts === 1 && simulateNullCacheOnFirstRun) {
        const firstAttemptResult = updater(null)
        if (firstAttemptResult === undefined) {
          return { committed: false, snapshot: makeSnapshot(currentVal, refObj.key) }
        }
        // Không khớp hash server -> tiếp tục vòng lặp với dữ liệu thật
        continue
      }

      const candidate = updater(currentVal !== undefined ? clone(currentVal) : null)
      if (candidate === undefined) {
        return { committed: false, snapshot: makeSnapshot(currentVal, refObj.key) }
      }

      // Giả lập có giao dịch khác chen vào đúng thời điểm trước khi commit
      if (attempts === 1 && concurrentHook) {
        const hook = concurrentHook
        concurrentHook = null
        hook()
      }

      const latestJson = JSON.stringify(getByPath(mockDb, refObj.path) ?? null)
      if (latestJson !== beforeJson) {
        // Xung đột CAS -> retry với trạng thái mới nhất
        continue
      }

      if (failCommitError) {
        throw failCommitError
      }

      setByPath(mockDb, refObj.path, candidate)
      return {
        committed: true,
        snapshot: makeSnapshot(getByPath(mockDb, refObj.path), refObj.key),
      }
    }

    return { committed: false, snapshot: makeSnapshot(getByPath(mockDb, refObj.path), refObj.key) }
  },
}))

import { debtsService } from '@/features/debts/services/debts'

function seedBaseFinancialState() {
  mockAuthUid = 'user_1'
  simulateNullCacheOnFirstRun = false
  failCommitError = null
  concurrentHook = null
  pushSeq = 0

  mockDb = {
    users: {
      user_1: { uid: 'user_1', status: 'active' },
      user_locked: { uid: 'user_locked', status: 'locked' },
    },
    financial: {
      user_1: {
        accounts: {
          acc_cash: {
            name: 'Tiền mặt',
            type: 'cash',
            openingBalance: 5000000,
            createdAt: 1000,
            updatedAt: 1000,
          },
          acc_bank: {
            name: 'Ngân hàng',
            type: 'bank',
            openingBalance: 10000000,
            createdAt: 1000,
            updatedAt: 1000,
          },
          acc_empty: {
            name: 'Ví rỗng',
            type: 'ewallet',
            openingBalance: 0,
            createdAt: 1000,
            updatedAt: 1000,
          },
        },
        categories: {
          cat_8: { name: 'Chi phí khác', type: 'expense', icon: 'MoreHorizontal', color: '#6B7280', isDefault: true },
          cat_13: { name: 'Thu nhập khác', type: 'income', icon: 'PlusCircle', color: '#14B8A6', isDefault: true },
        },
        transactions: {},
        debts: {
          debt_borrowed: {
            kind: 'borrowed',
            personName: 'Anh Nam',
            content: 'Vay mua xe',
            principal: 6000000,
            paidAmount: 1000000, // còn 5,000,000
            createdAt: 1000,
            updatedAt: 1000,
          },
          debt_lent: {
            kind: 'lent',
            personName: 'Bạn Tuấn',
            content: 'Cho mượn tiền nhà',
            principal: 4000000,
            paidAmount: 500000, // còn 3,500,000
            createdAt: 1000,
            updatedAt: 1000,
          },
        },
        debtHistories: {},
      },
      user_locked: {
        accounts: {
          acc_1: { name: 'Ví', type: 'cash', openingBalance: 5000000, createdAt: 1000, updatedAt: 1000 },
        },
        debts: {
          d1: {
            kind: 'borrowed',
            personName: 'A',
            content: 'Test',
            principal: 1000000,
            paidAmount: 0,
            createdAt: 1000,
            updatedAt: 1000,
          },
        },
      },
    },
  }
}

function getMockAccountBalance(uid: string, accountId: string): number {
  const fin = mockDb.financial[uid]
  const opening = fin.accounts[accountId].openingBalance
  const txs: Transaction[] = Object.entries(fin.transactions || {}).map(([id, v]: [string, any]) => ({
    id,
    ...v,
  }))
  return calculateAccountBalance(opening, accountId, txs)
}

describe('debtsService atomic cashflow, settlement, concurrency & history tests', () => {
  beforeEach(() => {
    seedBaseFinancialState()
  })

  it('1. Trả nợ một phần: trừ tiền ví, giảm nợ phải trả và ghi nhận lịch sử đầy đủ', async () => {
    const result = await debtsService.executeDebtCashflow({
      uid: 'user_1',
      debtId: 'debt_borrowed',
      accountId: 'acc_cash',
      amount: 2000000,
      mode: 'payment',
      note: 'Trả đợt 2',
      idempotencyKey: 'idem_1',
    })

    expect(result.deduplicated).toBe(false)
    expect(result.debt.paidAmount).toBe(3000000)
    expect(result.history.type).toBe('repay')
    expect(result.history.hasCashFlow).toBe(true)
    expect(result.history.accountId).toBe('acc_cash')
    expect(result.history.accountBalanceBefore).toBe(5000000)
    expect(result.history.accountBalanceAfter).toBe(3000000)
    expect(result.history.debtRemainingBefore).toBe(5000000)
    expect(result.history.debtRemainingAfter).toBe(3000000)
    expect(result.history.actorUid).toBe('user_1')
    expect(result.history.note).toBe('Trả đợt 2')

    expect(getMockAccountBalance('user_1', 'acc_cash')).toBe(3000000)
    expect(mockDb.financial.user_1.transactions[result.transactionId].type).toBe('expense')
  })

  it('2 & 11. Tất toán nợ phải trả (trả nợ toàn bộ): đưa công nợ về 0 và kiểm tra số dư ví sau tất toán', async () => {
    const result = await debtsService.executeDebtCashflow({
      uid: 'user_1',
      debtId: 'debt_borrowed',
      accountId: 'acc_bank',
      amount: 5000000,
      mode: 'settle',
      note: 'Tất toán xong',
    })

    expect(result.debt.paidAmount).toBe(6000000)
    expect(result.history.type).toBe('settle_repay')
    expect(result.history.amount).toBe(5000000)
    expect(result.history.debtRemainingBefore).toBe(5000000)
    expect(result.history.debtRemainingAfter).toBe(0)
    expect(result.history.accountBalanceBefore).toBe(10000000)
    expect(result.history.accountBalanceAfter).toBe(5000000)
    expect(getMockAccountBalance('user_1', 'acc_bank')).toBe(5000000)
  })

  it('3. Thu hồi nợ một phần: cộng tiền vào tài khoản nhận và giảm công nợ phải thu', async () => {
    const result = await debtsService.executeDebtCashflow({
      uid: 'user_1',
      debtId: 'debt_lent',
      accountId: 'acc_empty',
      amount: 1500000,
      mode: 'payment',
      note: 'Tuấn chuyển trả 1 phần',
    })

    expect(result.debt.paidAmount).toBe(2000000)
    expect(result.history.type).toBe('collect')
    expect(result.history.accountBalanceBefore).toBe(0)
    expect(result.history.accountBalanceAfter).toBe(1500000)
    expect(result.history.debtRemainingBefore).toBe(3500000)
    expect(result.history.debtRemainingAfter).toBe(2000000)
    expect(getMockAccountBalance('user_1', 'acc_empty')).toBe(1500000)
    expect(mockDb.financial.user_1.transactions[result.transactionId].type).toBe('income')
  })

  it('4. Thu hồi toàn bộ / Tất toán nợ phải thu: cộng phần còn lại vào ví và đưa công nợ về 0', async () => {
    const result = await debtsService.executeDebtCashflow({
      uid: 'user_1',
      debtId: 'debt_lent',
      accountId: 'acc_cash',
      amount: 3500000,
      mode: 'settle',
    })

    expect(result.debt.paidAmount).toBe(4000000)
    expect(result.history.type).toBe('settle_collect')
    expect(result.history.debtRemainingAfter).toBe(0)
    expect(getMockAccountBalance('user_1', 'acc_cash')).toBe(8500000)
  })

  it('5 & 10. Chọn nhiều nguồn tiền khác nhau qua nhiều lần giao dịch và sắp xếp lịch sử mới nhất lên đầu', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-01T10:00:00Z'))
    await debtsService.executeDebtCashflow({
      uid: 'user_1',
      debtId: 'debt_borrowed',
      accountId: 'acc_cash',
      amount: 1000000,
      mode: 'payment',
      note: 'Đợt 1 tiền mặt',
    })

    vi.setSystemTime(new Date('2026-11-02T10:00:00Z'))
    await debtsService.executeDebtCashflow({
      uid: 'user_1',
      debtId: 'debt_borrowed',
      accountId: 'acc_bank',
      amount: 4000000,
      mode: 'settle',
      note: 'Đợt 2 ngân hàng',
    })
    vi.useRealTimers()

    expect(getMockAccountBalance('user_1', 'acc_cash')).toBe(4000000)
    expect(getMockAccountBalance('user_1', 'acc_bank')).toBe(6000000)

    const histories = await debtsService.getDebtHistories('user_1', 'debt_borrowed')
    expect(histories).toHaveLength(2)
    expect(histories[0]!.note).toBe('Đợt 2 ngân hàng')
    expect(histories[0]!.accountName).toBe('Ngân hàng')
    expect(histories[0]!.debtRemainingAfter).toBe(0)
    expect(histories[1]!.note).toBe('Đợt 1 tiền mặt')
    expect(histories[1]!.accountName).toBe('Tiền mặt')
    expect(histories[1]!.debtRemainingAfter).toBe(4000000)
  })

  it('6. Chặn trả nợ khi nguồn tiền không đủ số dư và không thay đổi dữ liệu', async () => {
    await expect(
      debtsService.executeDebtCashflow({
        uid: 'user_1',
        debtId: 'debt_borrowed',
        accountId: 'acc_empty',
        amount: 500000,
        mode: 'payment',
      })
    ).rejects.toThrow(/không đủ/i)

    expect(mockDb.financial.user_1.debts.debt_borrowed.paidAmount).toBe(1000000)
    expect(Object.keys(mockDb.financial.user_1.transactions)).toHaveLength(0)
    expect(Object.keys(mockDb.financial.user_1.debtHistories)).toHaveLength(0)
  })

  it('7. Chặn khi số tiền thanh toán lớn hơn công nợ còn lại', async () => {
    await expect(
      debtsService.executeDebtCashflow({
        uid: 'user_1',
        debtId: 'debt_borrowed',
        accountId: 'acc_bank',
        amount: 6000000, // còn lại chỉ 5,000,000
        mode: 'payment',
      })
    ).rejects.toThrow(/vượt quá/i)

    expect(getMockAccountBalance('user_1', 'acc_bank')).toBe(10000000)
    expect(Object.keys(mockDb.financial.user_1.debtHistories)).toHaveLength(0)
  })

  it('8. Chống ghi nhận giao dịch trùng khi nhấn xác nhận nhiều lần (in-flight và đã commit)', async () => {
    const key = 'double_click_key_1'
    const [r1, r2] = await Promise.all([
      debtsService.executeDebtCashflow({
        uid: 'user_1',
        debtId: 'debt_borrowed',
        accountId: 'acc_cash',
        amount: 1000000,
        mode: 'payment',
        idempotencyKey: key,
      }),
      debtsService.executeDebtCashflow({
        uid: 'user_1',
        debtId: 'debt_borrowed',
        accountId: 'acc_cash',
        amount: 1000000,
        mode: 'payment',
        idempotencyKey: key,
      }),
    ])

    expect(r1.history.id).toBe(r2.history.id)

    // Gọi lại thêm lần nữa sau khi đã commit với cùng idempotencyKey
    const r3 = await debtsService.executeDebtCashflow({
      uid: 'user_1',
      debtId: 'debt_borrowed',
      accountId: 'acc_cash',
      amount: 1000000,
      mode: 'payment',
      idempotencyKey: key,
    })
    expect(r3.deduplicated).toBe(true)
    expect(getMockAccountBalance('user_1', 'acc_cash')).toBe(4000000)
    expect(Object.keys(mockDb.financial.user_1.debtHistories)).toHaveLength(1)
  })

  it('9. Xử lý chính xác khi hai giao dịch xảy ra đồng thời (CAS retry + chặn vượt số dư mới nhất)', async () => {
    // Tiền mặt có 5,000,000. Khi giao dịch này chuẩn bị commit 3,000,000, một giao dịch khác kịp rút 3,000,000 trước!
    concurrentHook = () => {
      mockDb.financial.user_1.transactions.tx_concurrent = {
        type: 'expense',
        amount: 3000000,
        date: Date.now(),
        accountId: 'acc_cash',
        categoryId: 'cat_8',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      mockDb.financial.user_1.debts.debt_borrowed.paidAmount = 4000000
    }

    await expect(
      debtsService.executeDebtCashflow({
        uid: 'user_1',
        debtId: 'debt_borrowed',
        accountId: 'acc_cash',
        amount: 3000000,
        mode: 'payment',
      })
    ).rejects.toThrow(/vượt quá|không đủ/i)

    // Tiền mặt còn đúng 2,000,000 (không bị âm!)
    expect(getMockAccountBalance('user_1', 'acc_cash')).toBe(2000000)
  })

  it('12. Kiểm tra quyền truy cập dữ liệu: chặn user khác hoặc tài khoản bị khóa', async () => {
    mockAuthUid = 'other_user'
    await expect(
      debtsService.executeDebtCashflow({
        uid: 'user_1',
        debtId: 'debt_borrowed',
        accountId: 'acc_cash',
        amount: 500000,
        mode: 'payment',
      })
    ).rejects.toThrow(/quyền/i)

    mockAuthUid = 'user_locked'
    await expect(
      debtsService.executeDebtCashflow({
        uid: 'user_locked',
        debtId: 'd1',
        accountId: 'acc_1',
        amount: 500000,
        mode: 'payment',
      })
    ).rejects.toThrow(/khóa/i)
  })

  it('Xử lý đúng khi local cache chưa sẵn sàng (null trên lần chạy đầu của runTransaction) và rollback khi commit lỗi', async () => {
    simulateNullCacheOnFirstRun = true
    const okRes = await debtsService.executeDebtCashflow({
      uid: 'user_1',
      debtId: 'debt_borrowed',
      accountId: 'acc_cash',
      amount: 1000000,
      mode: 'payment',
    })
    expect(okRes.debt.paidAmount).toBe(2000000)

    simulateNullCacheOnFirstRun = false
    failCommitError = new Error('PERMISSION_DENIED')
    await expect(
      debtsService.executeDebtCashflow({
        uid: 'user_1',
        debtId: 'debt_borrowed',
        accountId: 'acc_cash',
        amount: 1000000,
        mode: 'payment',
      })
    ).rejects.toThrow('PERMISSION_DENIED')

    // Dữ liệu không đổi sau khi rollback
    expect(mockDb.financial.user_1.debts.debt_borrowed.paidAmount).toBe(2000000)
    expect(getMockAccountBalance('user_1', 'acc_cash')).toBe(4000000)
  })

  it('Phân biệt điều chỉnh công nợ (updateDebt): không phát sinh dòng tiền và ghi log adjustment', async () => {
    await debtsService.updateDebt('user_1', 'debt_borrowed', {
      kind: 'borrowed',
      personName: 'Anh Nam',
      content: 'Vay mua xe',
      principal: 6000000,
      paidAmount: 2000000,
      note: 'Điều chỉnh số đã trả',
    })

    // Không tạo transaction dòng tiền
    expect(Object.keys(mockDb.financial.user_1.transactions)).toHaveLength(0)
    expect(getMockAccountBalance('user_1', 'acc_cash')).toBe(5000000)

    const histories = await debtsService.getDebtHistories('user_1', 'debt_borrowed')
    expect(histories).toHaveLength(1)
    expect(histories[0]!.type).toBe('adjustment')
    expect(histories[0]!.hasCashFlow).toBe(false)
    expect(histories[0]!.debtRemainingBefore).toBe(5000000)
    expect(histories[0]!.debtRemainingAfter).toBe(4000000)
  })

  it('Không xóa lịch sử giao dịch đã phát sinh khi xóa khoản công nợ', async () => {
    await debtsService.executeDebtCashflow({
      uid: 'user_1',
      debtId: 'debt_borrowed',
      accountId: 'acc_cash',
      amount: 1000000,
      mode: 'payment',
    })

    await debtsService.deleteDebt('user_1', 'debt_borrowed')
    expect(mockDb.financial.user_1.debts.debt_borrowed).toBeUndefined()
    expect(Object.keys(mockDb.financial.user_1.debtHistories)).toHaveLength(1)
    expect(getMockAccountBalance('user_1', 'acc_cash')).toBe(4000000)
  })

  it('Tạo khoản vay mới (borrowed): tự động cộng tiền vào tài khoản nhận và ghi nhận lịch sử initial_borrow', async () => {
    const created = await debtsService.createDebt('user_1', {
      kind: 'borrowed',
      personName: 'Chị Lan',
      content: 'Vay vốn kinh doanh',
      principal: 3000000,
      paidAmount: 0,
      accountId: 'acc_cash',
      note: 'Nhận tiền mặt',
      idempotencyKey: 'create_borrow_1',
    })

    expect(created.id).toBeDefined()
    expect(getMockAccountBalance('user_1', 'acc_cash')).toBe(8000000)

    const histories = await debtsService.getDebtHistories('user_1', created.id)
    expect(histories).toHaveLength(1)
    expect(histories[0]!.type).toBe('initial_borrow')
    expect(histories[0]!.hasCashFlow).toBe(true)
    expect(histories[0]!.accountBalanceBefore).toBe(5000000)
    expect(histories[0]!.accountBalanceAfter).toBe(8000000)
    expect(histories[0]!.debtRemainingAfter).toBe(3000000)
  })

  it('Tạo khoản cho vay mới (lent): trừ tiền từ nguồn tiền và chặn nếu số dư không đủ', async () => {
    await expect(
      debtsService.createDebt('user_1', {
        kind: 'lent',
        personName: 'Bạn Hùng',
        content: 'Cho mượn gấp',
        principal: 1000000,
        paidAmount: 0,
        accountId: 'acc_empty',
      })
    ).rejects.toThrow(/không đủ/i)

    const created = await debtsService.createDebt('user_1', {
      kind: 'lent',
      personName: 'Bạn Hùng',
      content: 'Cho mượn gấp',
      principal: 2000000,
      paidAmount: 0,
      accountId: 'acc_bank',
      idempotencyKey: 'create_lend_1',
    })

    expect(getMockAccountBalance('user_1', 'acc_bank')).toBe(8000000)
    const histories = await debtsService.getDebtHistories('user_1', created.id)
    expect(histories).toHaveLength(1)
    expect(histories[0]!.type).toBe('initial_lend')
    expect(histories[0]!.accountBalanceBefore).toBe(10000000)
    expect(histories[0]!.accountBalanceAfter).toBe(8000000)

    // Chống tạo trùng khi nhấn nhiều lần với cùng idempotencyKey
    const dup = await debtsService.createDebt('user_1', {
      kind: 'lent',
      personName: 'Bạn Hùng',
      content: 'Cho mượn gấp',
      principal: 2000000,
      paidAmount: 0,
      accountId: 'acc_bank',
      idempotencyKey: 'create_lend_1',
    })
    expect(dup.id).toBe(created.id)
    expect(getMockAccountBalance('user_1', 'acc_bank')).toBe(8000000)
  })
})

