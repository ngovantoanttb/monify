import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  formatCompactCurrency,
  calculateTotalIncome,
  calculateTotalExpense,
  calculateNetBalance,
  calculateSavingsRate,
  calculateAccountBalance,
  evaluateBudgetStatus,
  evaluateGoalProgress,
  evaluateDebtStatus,
  formatBudgetId,
  getMonthInterval,
  isDebtTransaction,
  filterRegularTransactions,
} from '@/lib/finance/index'
import type { Transaction } from '@shared/types'

describe('Finance Library Tests - 100% Coverage Target', () => {
  describe('formatCurrency', () => {
    it('định dạng tiền tệ theo chuẩn VND', () => {
      const formatted = formatCurrency(1500000)
      expect(formatted).toContain('1.500.000')
      expect(formatted).toContain('₫')
    })

    it('xử lý số âm và số 0', () => {
      expect(formatCurrency(0)).toContain('0')
      const neg = formatCurrency(-50000)
      expect(neg).toContain('50.000')
      expect(neg).toContain('-')
    })
  })

  describe('formatCompactCurrency', () => {
    it('rút gọn tiền tỷ, triệu, nghìn đúng cách', () => {
      expect(formatCompactCurrency(2500000000)).toBe('2,5 tỷ')
      expect(formatCompactCurrency(1000000000)).toBe('1 tỷ')
      expect(formatCompactCurrency(1500000)).toBe('1,5 tr')
      expect(formatCompactCurrency(2000000)).toBe('2 tr')
      expect(formatCompactCurrency(500000)).toBe('500 k')
      expect(formatCompactCurrency(500)).toBe('500 ₫')
      expect(formatCompactCurrency(-1500000)).toBe('-1,5 tr')
    })
  })

  describe('calculateTotalIncome and calculateTotalExpense', () => {
    const transactions: Transaction[] = [
      {
        id: '1',
        type: 'income',
        amount: 10000000,
        date: new Date(2026, 10, 5).getTime(),
        accountId: 'acc1',
        categoryId: 'cat_salary',
        createdAt: 1,
        updatedAt: 1,
      },
      {
        id: '2',
        type: 'expense',
        amount: 2000000,
        date: new Date(2026, 10, 10).getTime(),
        accountId: 'acc1',
        categoryId: 'cat_food',
        createdAt: 1,
        updatedAt: 1,
      },
      {
        id: '3',
        type: 'transfer',
        amount: 3000000,
        date: new Date(2026, 10, 12).getTime(),
        accountId: 'acc1',
        toAccountId: 'acc2',
        createdAt: 1,
        updatedAt: 1,
      },
      {
        id: '4',
        type: 'income',
        amount: 500000,
        date: new Date(2026, 9, 28).getTime(), // tháng trước
        accountId: 'acc1',
        categoryId: 'cat_bonus',
        createdAt: 1,
        updatedAt: 1,
      },
    ]

    it('tính tổng thu chi không có bộ lọc ngày', () => {
      expect(calculateTotalIncome(transactions)).toBe(10500000)
      expect(calculateTotalExpense(transactions)).toBe(2000000)
    })

    it('tính tổng thu chi có khoảng ngày (tháng 11/2026)', () => {
      const interval = getMonthInterval(2026, 11)
      expect(calculateTotalIncome(transactions, interval)).toBe(10000000)
      expect(calculateTotalExpense(transactions, interval)).toBe(2000000)
    })

    it('chuyển ví không được tính vào tổng thu hoặc chi', () => {
      const transferOnly: Transaction[] = [
        {
          id: 't1',
          type: 'transfer',
          amount: 5000000,
          date: Date.now(),
          accountId: 'acc1',
          toAccountId: 'acc2',
          createdAt: 1,
          updatedAt: 1,
        },
      ]
      expect(calculateTotalIncome(transferOnly)).toBe(0)
      expect(calculateTotalExpense(transferOnly)).toBe(0)
    })
  })

  describe('calculateNetBalance & calculateSavingsRate', () => {
    it('tính số dư ròng và tỷ lệ tiết kiệm', () => {
      const balance = calculateNetBalance(10000000, 4000000)
      expect(balance).toBe(6000000)
      expect(calculateSavingsRate(10000000, balance)).toBe(0.6)
    })

    it('xử lý tỷ lệ tiết kiệm khi thu <= 0 hoặc số dư âm', () => {
      expect(calculateSavingsRate(0, 0)).toBe(0)
      expect(calculateSavingsRate(10000000, -2000000)).toBe(0)
      expect(calculateSavingsRate(-500, 1000)).toBe(0)
    })
  })

  describe('calculateAccountBalance', () => {
    const transactions: Transaction[] = [
      { id: '1', type: 'income', amount: 5000000, date: 1, accountId: 'acc1', createdAt: 1, updatedAt: 1 },
      { id: '2', type: 'expense', amount: 1000000, date: 2, accountId: 'acc1', createdAt: 1, updatedAt: 1 },
      {
        id: '3',
        type: 'transfer',
        amount: 2000000,
        date: 3,
        accountId: 'acc1',
        toAccountId: 'acc2',
        createdAt: 1,
        updatedAt: 1,
      },
      {
        id: '4',
        type: 'transfer',
        amount: 500000,
        date: 4,
        accountId: 'acc2',
        toAccountId: 'acc1',
        createdAt: 1,
        updatedAt: 1,
      },
      { id: '5', type: 'income', amount: 3000000, date: 5, accountId: 'acc2', createdAt: 1, updatedAt: 1 },
    ]

    it('tính số dư đúng cho ví nguồn và ví đích', () => {
      // acc1: 1.000.000 (đầu) + 5.000.000 (thu) - 1.000.000 (chi) - 2.000.000 (chuyển đi) + 500.000 (chuyển đến) = 3.500.000
      expect(calculateAccountBalance(1000000, 'acc1', transactions)).toBe(3500000)

      // acc2: 0 (đầu) + 2.000.000 (từ acc1) - 500.000 (về acc1) + 3.000.000 (thu) = 4.500.000
      expect(calculateAccountBalance(0, 'acc2', transactions)).toBe(4500000)
    })

    it('hỗ trợ số dư đầu âm', () => {
      expect(calculateAccountBalance(-500000, 'acc1', transactions)).toBe(2000000)
    })
  })

  describe('evaluateBudgetStatus', () => {
    it('trả về unbudgeted khi hạn mức <= 0', () => {
      const result = evaluateBudgetStatus(0, 500000)
      expect(result.status).toBe('unbudgeted')
      expect(result.remaining).toBe(-500000)
      expect(result.percentage).toBe(0)
    })

    it('trả về normal khi chi tiêu dưới ngưỡng', () => {
      const result = evaluateBudgetStatus(1000000, 500000, 0.8)
      expect(result.status).toBe('normal')
      expect(result.remaining).toBe(500000)
      expect(result.percentage).toBe(0.5)
    })

    it('trả về warning khi chi tiêu đạt hoặc vượt ngưỡng cảnh báo (80%) hoặc đúng 100%', () => {
      const atThreshold = evaluateBudgetStatus(1000000, 800000, 0.8)
      expect(atThreshold.status).toBe('warning')
      expect(atThreshold.percentage).toBe(0.8)
      expect(atThreshold.remaining).toBe(200000)

      const exact100 = evaluateBudgetStatus(1000000, 1000000, 0.8)
      expect(exact100.status).toBe('warning')
      expect(exact100.percentage).toBe(1.0)
      expect(exact100.remaining).toBe(0)

      const nearLimit = evaluateBudgetStatus(1000000, 950000, 0.8)
      expect(nearLimit.status).toBe('warning')
    })

    it('trả về exceeded khi vượt 100% ngân sách', () => {
      const result = evaluateBudgetStatus(1000000, 1200000, 0.8)
      expect(result.status).toBe('exceeded')
      expect(result.remaining).toBe(-200000)
      expect(result.percentage).toBe(1.2)
    })
  })

  describe('evaluateGoalProgress', () => {
    it('tính tiến độ và trạng thái hoàn thành', () => {
      const active = evaluateGoalProgress({ targetAmount: 10000000, savedAmount: 4000000 })
      expect(active.remainingAmount).toBe(6000000)
      expect(active.progressRate).toBe(0.4)
      expect(active.isCompleted).toBe(false)

      const completed = evaluateGoalProgress({ targetAmount: 10000000, savedAmount: 12000000 })
      expect(completed.remainingAmount).toBe(0)
      expect(completed.progressRate).toBe(1.2)
      expect(completed.isCompleted).toBe(true)
    })

    it('xử lý targetAmount <= 0', () => {
      const zeroTarget = evaluateGoalProgress({ targetAmount: 0, savedAmount: 100 })
      expect(zeroTarget.progressRate).toBe(0)
      expect(zeroTarget.isCompleted).toBe(false)
    })
  })

  describe('evaluateDebtStatus', () => {
    const today = new Date(2026, 10, 20, 12, 0, 0).getTime()

    it('đã tất toán khi trả hết gốc', () => {
      const result = evaluateDebtStatus({ principal: 5000000, paidAmount: 5000000 }, today)
      expect(result.status).toBe('settled')
      expect(result.remainingAmount).toBe(0)
    })

    it('chưa có hạn khi không có dueDate', () => {
      const result = evaluateDebtStatus({ principal: 5000000, paidAmount: 2000000 }, today)
      expect(result.status).toBe('no_due_date')
      expect(result.remainingAmount).toBe(3000000)
    })

    it('quá hạn khi dueDate trước hôm nay', () => {
      const pastDate = new Date(2026, 10, 18).getTime()
      const result = evaluateDebtStatus({ principal: 5000000, paidAmount: 1000000, dueDate: pastDate }, today)
      expect(result.status).toBe('overdue')
      expect(result.remainingAmount).toBe(4000000)
    })

    it('đang theo dõi (active) khi dueDate hôm nay hoặc tương lai', () => {
      const futureDate = new Date(2026, 10, 25).getTime()
      const result = evaluateDebtStatus({ principal: 5000000, paidAmount: 1000000, dueDate: futureDate }, today)
      expect(result.status).toBe('active')
      expect(result.remainingAmount).toBe(4000000)

      // Trường hợp hạn đúng hôm nay (cùng ngày)
      const dueToday = new Date(2026, 10, 20, 8, 0, 0).getTime()
      const resultToday = evaluateDebtStatus({ principal: 5000000, paidAmount: 1000000, dueDate: dueToday }, today)
      expect(resultToday.status).toBe('active')
      expect(resultToday.remainingAmount).toBe(4000000)
    })

    it('số tiền còn lại không bao giờ âm khi đã trả nhiều hơn gốc', () => {
      const result = evaluateDebtStatus({ principal: 5000000, paidAmount: 8000000 }, today)
      expect(result.remainingAmount).toBe(0)
      expect(result.status).toBe('settled')
    })
  })

  describe('formatBudgetId & getMonthInterval', () => {
    it('tạo id chuẩn cho budget document', () => {
      expect(formatBudgetId(2026, 5, 'cat_123')).toBe('2026-05_cat_123')
      expect(formatBudgetId(2026, 11, 'cat_456')).toBe('2026-11_cat_456')
    })

    it('tính khoảng thời gian đầu và cuối tháng', () => {
      const interval = getMonthInterval(2026, 2) // Tháng 2/2026 không nhuận = 28 ngày
      expect(interval.start.getDate()).toBe(1)
      expect(interval.end.getDate()).toBe(28)
    })
  })

  describe('isDebtTransaction & filterRegularTransactions', () => {
    const txs: Transaction[] = [
      { id: 't1', type: 'income', amount: 15000000, date: 1, accountId: 'acc1', note: 'Lương tháng 11', createdAt: 1, updatedAt: 1 },
      { id: 't2', type: 'expense', amount: 500000, date: 2, accountId: 'acc1', note: 'Ăn trưa', createdAt: 1, updatedAt: 1 },
      { id: 't3', type: 'income', amount: 5000000, date: 3, accountId: 'acc1', note: '[Vay tiền] Anh Nam', createdAt: 1, updatedAt: 1 },
      { id: 't4', type: 'expense', amount: 2000000, date: 4, accountId: 'acc1', note: 'Ghi chú đã sửa tay', createdAt: 1, updatedAt: 1 },
      { id: 't5', type: 'expense', amount: 1000000, date: 5, accountId: 'acc1', createdAt: 1, updatedAt: 1 },
    ]

    it('nhận diện giao dịch công nợ theo ID liên kết hoặc tiền tố note', () => {
      const debtIds = new Set(['t4'])
      expect(isDebtTransaction(txs[0]!, debtIds)).toBe(false)
      expect(isDebtTransaction(txs[2]!, debtIds)).toBe(true) // theo prefix [Vay tiền]
      expect(isDebtTransaction(txs[3]!, debtIds)).toBe(true) // theo debtTransactionIds
      expect(isDebtTransaction(txs[4]!)).toBe(false) // note undefined, không có set
    })

    it('lọc chỉ giữ lại giao dịch thu chi riêng không tính công nợ', () => {
      const debtIds = new Set(['t4'])
      const regular = filterRegularTransactions(txs, debtIds)
      expect(regular.map((t) => t.id)).toEqual(['t1', 't2', 't5'])
    })
  })
})
