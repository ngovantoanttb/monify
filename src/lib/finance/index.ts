import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import type { Transaction, Debt, Goal } from '@shared/types'
import { DEFAULT_BUDGET_WARNING_THRESHOLD } from '@shared/constants'

/**
 * Định dạng số tiền VND theo chuẩn tiếng Việt (vi-VN)
 * @example formatCurrency(1500000) => "1.500.000 ₫"
 */
export function formatCurrency(amount: number): string {
  const rounded = Math.round(amount)
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(rounded)
}

/**
 * Rút gọn số tiền lớn cho các thẻ hiển thị nhỏ
 * @example formatCompactCurrency(1500000) => "1,5 tr"
 */
export function formatCompactCurrency(amount: number): string {
  const abs = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''
  if (abs >= 1_000_000_000) {
    const val = (abs / 1_000_000_000).toFixed(1).replace('.0', '').replace('.', ',')
    return `${sign}${val} tỷ`
  }
  if (abs >= 1_000_000) {
    const val = (abs / 1_000_000).toFixed(1).replace('.0', '').replace('.', ',')
    return `${sign}${val} tr`
  }
  if (abs >= 1_000) {
    const val = (abs / 1_000).toFixed(0)
    return `${sign}${val} k`
  }
  return `${amount} ₫`
}

/**
 * Tính tổng thu nhập trong một khoảng thời gian hoặc danh sách giao dịch
 */
export function calculateTotalIncome(transactions: Transaction[], dateInterval?: { start: Date; end: Date }): number {
  return transactions
    .filter((t) => t.type === 'income')
    .filter((t) => (!dateInterval ? true : isWithinInterval(new Date(t.date), dateInterval)))
    .reduce((sum, t) => sum + Math.round(t.amount), 0)
}

/**
 * Tính tổng chi tiêu trong một khoảng thời gian hoặc danh sách giao dịch
 */
export function calculateTotalExpense(transactions: Transaction[], dateInterval?: { start: Date; end: Date }): number {
  return transactions
    .filter((t) => t.type === 'expense')
    .filter((t) => (!dateInterval ? true : isWithinInterval(new Date(t.date), dateInterval)))
    .reduce((sum, t) => sum + Math.round(t.amount), 0)
}

/**
 * Tính số dư trong kỳ (Tổng thu - Tổng chi)
 */
export function calculateNetBalance(totalIncome: number, totalExpense: number): number {
  return Math.round(totalIncome) - Math.round(totalExpense)
}

/**
 * Tính tỷ lệ tiết kiệm (Số dư / Tổng thu)
 * Nếu tổng thu <= 0 hoặc số dư <= 0, tỷ lệ là 0
 */
export function calculateSavingsRate(totalIncome: number, netBalance: number): number {
  if (totalIncome <= 0 || netBalance <= 0) return 0
  return Number((netBalance / totalIncome).toFixed(4))
}

/**
 * Tính số dư hiện tại của một ví cụ thể:
 * Số dư = Số dư đầu + Tổng thu vào ví - Tổng chi từ ví + Chuyển đến ví - Chuyển đi từ ví
 */
export function calculateAccountBalance(
  openingBalance: number,
  accountId: string,
  transactions: Transaction[]
): number {
  let balance = Math.round(openingBalance)

  for (const t of transactions) {
    const amount = Math.round(t.amount)
    if (t.accountId === accountId) {
      if (t.type === 'income') {
        balance += amount
      } else if (t.type === 'expense') {
        balance -= amount
      } else if (t.type === 'transfer') {
        balance -= amount
      }
    }
    if (t.type === 'transfer' && t.toAccountId === accountId) {
      balance += amount
    }
  }

  return balance
}

export type BudgetStatus = 'unbudgeted' | 'exceeded' | 'warning' | 'normal'

/**
 * Đánh giá trạng thái của ngân sách danh mục
 */
export function evaluateBudgetStatus(
  budgetLimit: number,
  spentAmount: number,
  warningThreshold: number = DEFAULT_BUDGET_WARNING_THRESHOLD
): {
  spent: number
  remaining: number
  percentage: number
  status: BudgetStatus
} {
  const limit = Math.round(budgetLimit)
  const spent = Math.round(spentAmount)
  const remaining = limit - spent

  if (limit <= 0) {
    return {
      spent,
      remaining,
      percentage: 0,
      status: 'unbudgeted',
    }
  }

  const percentage = Number((spent / limit).toFixed(4))

  let status: BudgetStatus = 'normal'
  if (spent > limit) {
    status = 'exceeded'
  } else if (percentage >= warningThreshold) {
    status = 'warning'
  }

  return {
    spent,
    remaining,
    percentage,
    status,
  }
}

/**
 * Tính toán tiến độ mục tiêu tiết kiệm
 */
export function evaluateGoalProgress(goal: Pick<Goal, 'targetAmount' | 'savedAmount'>): {
  remainingAmount: number
  progressRate: number
  isCompleted: boolean
} {
  const target = Math.round(goal.targetAmount)
  const saved = Math.max(0, Math.round(goal.savedAmount))
  const remaining = Math.max(0, target - saved)
  const rate = target <= 0 ? 0 : Number((saved / target).toFixed(4))

  return {
    remainingAmount: remaining,
    progressRate: rate,
    isCompleted: target > 0 && saved >= target,
  }
}

export type DebtStatus = 'settled' | 'no_due_date' | 'overdue' | 'active'

/**
 * Đánh giá trạng thái công nợ
 */
export function evaluateDebtStatus(
  debt: Pick<Debt, 'principal' | 'paidAmount' | 'dueDate'>,
  nowMs: number = Date.now()
): {
  remainingAmount: number
  status: DebtStatus
} {
  const principal = Math.round(debt.principal)
  const paid = Math.min(principal, Math.max(0, Math.round(debt.paidAmount)))
  const remaining = Math.max(0, principal - paid)

  if (remaining === 0) {
    return { remainingAmount: 0, status: 'settled' }
  }

  if (!debt.dueDate) {
    return { remainingAmount: remaining, status: 'no_due_date' }
  }

  // So sánh ngày đến hạn với ngày hiện tại (múi giờ địa phương)
  const dueDateEndOfDay = new Date(debt.dueDate)
  dueDateEndOfDay.setHours(23, 59, 59, 999)

  if (nowMs > dueDateEndOfDay.getTime()) {
    return { remainingAmount: remaining, status: 'overdue' }
  }

  return { remainingAmount: remaining, status: 'active' }
}

/**
 * Sinh ID chuẩn cho budget document: `${yyyy-MM}_${categoryId}`
 */
export function formatBudgetId(year: number, month: number, categoryId: string): string {
  const formattedMonth = month.toString().padStart(2, '0')
  return `${year}-${formattedMonth}_${categoryId}`
}

/**
 * Lấy khoảng thời gian của một tháng cụ thể
 */
export function getMonthInterval(year: number, month: number): { start: Date; end: Date } {
  const date = new Date(year, month - 1, 1)
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  }
}
