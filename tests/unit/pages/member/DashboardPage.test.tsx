import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DashboardPage } from '@/pages/member/DashboardPage'

const { year, month, txDate } = vi.hoisted(() => {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  return {
    year: y,
    month: m,
    txDate: new Date(y, m - 1, 10, 12, 0, 0).getTime(),
  }
})

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    user: { uid: 'u1', email: 'test@example.com', displayName: 'Test', role: 'member', status: 'active' },
  }),
}))

vi.mock('@/stores/viewPeriod', () => ({
  useViewPeriodStore: () => ({ year, month, setPeriod: vi.fn(), prevMonth: vi.fn(), nextMonth: vi.fn() }),
}))

vi.mock('@/features/accounts/services/accounts', () => ({
  accountsService: {
    getAccounts: vi.fn().mockResolvedValue([
      { id: 'acc_1', name: 'Tiền mặt', type: 'cash', openingBalance: 1000000, createdAt: 1, updatedAt: 1 },
    ]),
  },
}))

vi.mock('@/features/categories/services/categories', () => ({
  categoriesService: {
    getCategories: vi.fn().mockResolvedValue([
      { id: 'cat_1', name: 'Ăn uống', type: 'expense', icon: 'Utensils', color: '#EF4444', isDefault: true, createdAt: 1, updatedAt: 1 },
      { id: 'cat_9', name: 'Lương', type: 'income', icon: 'Banknote', color: '#16A34A', isDefault: true, createdAt: 1, updatedAt: 1 },
    ]),
  },
}))

vi.mock('@/features/transactions/services/transactions', () => ({
  transactionsService: {
    getAllTransactions: vi.fn().mockResolvedValue([
      { id: 'tx_income', type: 'income', amount: 10000000, date: txDate, accountId: 'acc_1', categoryId: 'cat_9', note: 'Lương', createdAt: 1, updatedAt: 1 },
      { id: 'tx_expense', type: 'expense', amount: 2000000, date: txDate, accountId: 'acc_1', categoryId: 'cat_1', note: 'Ăn uống', createdAt: 1, updatedAt: 1 },
      { id: 'tx_borrow', type: 'income', amount: 5000000, date: txDate, accountId: 'acc_1', categoryId: 'cat_13', note: '[Vay tiền] Anh Nam', createdAt: 1, updatedAt: 1 },
    ]),
  },
}))

vi.mock('@/features/goals/services/goals', () => ({
  goalsService: { getGoals: vi.fn().mockResolvedValue([]) },
}))

vi.mock('@/features/budgets/services/budgets', () => ({
  budgetsService: { getBudgets: vi.fn().mockResolvedValue([]) },
}))

vi.mock('@/features/debts/services/debts', () => ({
  debtsService: {
    getDebts: vi.fn().mockResolvedValue([
      {
        id: 'd1',
        kind: 'borrowed',
        personName: 'Anh Nam',
        content: 'Vay mua xe',
        principal: 5000000,
        paidAmount: 2000000,
        createdAt: txDate,
        updatedAt: txDate,
      },
    ]),
    getDebtHistories: vi.fn().mockResolvedValue([
      { id: 'h1', debtId: 'd1', transactionId: 'tx_borrow', type: 'initial_borrow', hasCashFlow: true, amount: 5000000, debtRemainingBefore: 0, debtRemainingAfter: 5000000, createdAt: txDate, actorUid: 'u1' },
      { id: 'h2', debtId: 'd1', transactionId: 'tx_repay', type: 'repay', hasCashFlow: true, amount: 2000000, debtRemainingBefore: 5000000, debtRemainingAfter: 3000000, createdAt: txDate, actorUid: 'u1' },
    ]),
  },
}))

// Tránh lỗi ResizeObserver của Recharts trong jsdom
vi.mock('@/features/dashboard/components/CategoryPieChart', () => ({
  CategoryPieChart: () => <div data-testid="pie-chart" />,
}))
vi.mock('@/features/dashboard/components/MonthlyTrendChart', () => ({
  MonthlyTrendChart: () => <div data-testid="trend-chart" />,
}))

describe('DashboardPage debt separation tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('mặc định chỉ tính giao dịch thu/chi riêng (không tính công nợ) và vẫn giữ đúng số dư ví thực tế', async () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/10\.000\.000/)).toBeInTheDocument()
    })

    // Thu nhập riêng = 10.000.000, Chi tiêu riêng = 2.000.000, Số dư tháng = 8.000.000
    expect(screen.getByText(/8\.000\.000/)).toBeInTheDocument()
    expect(screen.getByText(/Đang loại trừ/i)).toBeInTheDocument()

    // Số dư ví thực tế vẫn tính đủ (1.000.000 đầu + 10.000.000 lương - 2.000.000 chi + 5.000.000 vay = 14.000.000)
    expect(screen.getAllByText(/14\.000\.000/).length).toBeGreaterThan(0)

    // Khi chuyển sang "Gồm công nợ" -> Tổng thu nhập trở thành 15.000.000
    fireEvent.click(screen.getByRole('button', { name: 'Gồm công nợ' }))
    expect(screen.getByText(/15\.000\.000/)).toBeInTheDocument()
  })
})
