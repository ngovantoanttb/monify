import { describe, it, expect } from 'vitest'
import { transactionSchema } from '@/features/transactions/schemas/transactionSchema'

describe('TransactionSchema Unit Tests', () => {
  it('hợp lệ với giao dịch chi tiêu (expense) có categoryId', () => {
    const validExpense = {
      type: 'expense',
      amount: 50000,
      date: Date.now(),
      accountId: 'acc_1',
      categoryId: 'cat_food',
      note: 'Ăn trưa',
    }
    const result = transactionSchema.safeParse(validExpense)
    expect(result.success).toBe(true)
  })

  it('hợp lệ với giao dịch thu nhập (income) có categoryId', () => {
    const validIncome = {
      type: 'income',
      amount: 15000000,
      date: Date.now(),
      accountId: 'acc_bank',
      categoryId: 'cat_salary',
    }
    const result = transactionSchema.safeParse(validIncome)
    expect(result.success).toBe(true)
  })

  it('báo lỗi khi thu hoặc chi mà thiếu categoryId', () => {
    const missingCat = {
      type: 'expense',
      amount: 50000,
      date: Date.now(),
      accountId: 'acc_1',
    }
    const result = transactionSchema.safeParse(missingCat)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes('danh mục'))).toBe(true)
    }
  })

  it('hợp lệ với chuyển ví (transfer) có toAccountId khác accountId', () => {
    const validTransfer = {
      type: 'transfer',
      amount: 1000000,
      date: Date.now(),
      accountId: 'acc_1',
      toAccountId: 'acc_2',
      note: 'Rút tiền ATM',
    }
    const result = transactionSchema.safeParse(validTransfer)
    expect(result.success).toBe(true)
  })

  it('báo lỗi khi chuyển ví thiếu toAccountId', () => {
    const missingTo = {
      type: 'transfer',
      amount: 1000000,
      date: Date.now(),
      accountId: 'acc_1',
    }
    const result = transactionSchema.safeParse(missingTo)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes('ví nhận tiền'))).toBe(true)
    }
  })

  it('báo lỗi khi chuyển ví có ví đích trùng ví nguồn', () => {
    const sameAccTransfer = {
      type: 'transfer',
      amount: 1000000,
      date: Date.now(),
      accountId: 'acc_same',
      toAccountId: 'acc_same',
    }
    const result = transactionSchema.safeParse(sameAccTransfer)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes('phải khác'))).toBe(true)
    }
  })

  it('từ chối số tiền âm hoặc bằng 0 hoặc số thực', () => {
    expect(
      transactionSchema.safeParse({
        type: 'expense',
        amount: -500,
        date: Date.now(),
        accountId: 'acc_1',
        categoryId: 'cat_1',
      }).success
    ).toBe(false)

    expect(
      transactionSchema.safeParse({
        type: 'expense',
        amount: 0,
        date: Date.now(),
        accountId: 'acc_1',
        categoryId: 'cat_1',
      }).success
    ).toBe(false)
  })
})

