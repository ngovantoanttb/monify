import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ReportsPage } from '@/pages/member/ReportsPage'
import { useAuthStore } from '@/stores/auth'
import { transactionsService } from '@/features/transactions/services/transactions'
import { categoriesService } from '@/features/categories/services/categories'
import { accountsService } from '@/features/accounts/services/accounts'
import * as exportCsvModule from '@/lib/finance/exportCsv'

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('@/features/transactions/services/transactions', () => ({
  transactionsService: {
    getAllTransactions: vi.fn(),
  },
}))

vi.mock('@/features/categories/services/categories', () => ({
  categoriesService: {
    getCategories: vi.fn(),
  },
}))

vi.mock('@/features/accounts/services/accounts', () => ({
  accountsService: {
    getAccounts: vi.fn(),
  },
}))

vi.mock('@/lib/finance/exportCsv', async () => {
  const actual = await vi.importActual<any>('@/lib/finance/exportCsv')
  return {
    ...actual,
    downloadCsv: vi.fn(),
  }
})

describe('ReportsPage Component Test', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useAuthStore).mockReturnValue({
      user: { uid: 'user_1', email: 'test@monify.vn', displayName: 'Test User' },
    } as any)

    vi.mocked(transactionsService.getAllTransactions).mockResolvedValue([
      {
        id: 'tx_1',
        type: 'income',
        amount: 20000000,
        date: Date.now(),
        accountId: 'acc_1',
        categoryId: 'cat_salary',
        note: 'Tiền lương',
        createdAt: 1000,
        updatedAt: 1000,
      },
      {
        id: 'tx_2',
        type: 'expense',
        amount: 5000000,
        date: Date.now(),
        accountId: 'acc_1',
        categoryId: 'cat_food',
        note: 'Ăn uống cả tháng',
        createdAt: 2000,
        updatedAt: 2000,
      },
    ])

    vi.mocked(categoriesService.getCategories).mockResolvedValue([
      {
        id: 'cat_salary',
        name: 'Tiền lương',
        type: 'income',
        icon: 'Banknote',
        color: '#10B981',
        isDefault: true,
        createdAt: 1000,
        updatedAt: 1000,
      },
      {
        id: 'cat_food',
        name: 'Ăn uống',
        type: 'expense',
        icon: 'Utensils',
        color: '#EF4444',
        isDefault: true,
        createdAt: 1000,
        updatedAt: 1000,
      },
    ])

    vi.mocked(accountsService.getAccounts).mockResolvedValue([
      {
        id: 'acc_1',
        name: 'Ví chính',
        type: 'cash',
        openingBalance: 10000000,
        createdAt: 1000,
        updatedAt: 1000,
      },
    ])
  })

  it('hiển thị tiêu đề trang, bộ chọn kỳ và tổng hợp tài chính', async () => {
    render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    )

    expect(screen.getByText('Báo cáo Tài chính')).toBeInTheDocument()
    expect(screen.getByText('Tháng này')).toBeInTheDocument()
    expect(screen.getByText('Tháng trước')).toBeInTheDocument()
    expect(screen.getByText('Quý này')).toBeInTheDocument()
    expect(screen.getByText('Năm nay')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText(/20\.000\.000/i)).toBeInTheDocument() // Tổng thu
      expect(screen.getAllByText(/5\.000\.000/i).length).toBeGreaterThanOrEqual(2) // Tổng chi & Danh mục
      expect(screen.getByText(/15\.000\.000/i)).toBeInTheDocument() // Tiết kiệm ròng
      expect(screen.getByText('75%')).toBeInTheDocument() // Tỷ lệ tiết kiệm (15/20)
    })
  })

  it('hiển thị danh mục chi tiêu theo tỷ lệ', async () => {
    render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Ăn uống')).toBeInTheDocument()
      expect(screen.getByText('100.0%')).toBeInTheDocument()
    })
  })

  it('gọi hàm downloadCsv khi nhấn Xuất file CSV (Excel)', async () => {
    render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('20.000.000 ₫')).toBeInTheDocument()
    })

    const exportBtn = screen.getByRole('button', { name: /Xuất file CSV/i })
    expect(exportBtn).not.toBeDisabled()
    fireEvent.click(exportBtn)

    expect(exportCsvModule.downloadCsv).toHaveBeenCalled()
  })
})
