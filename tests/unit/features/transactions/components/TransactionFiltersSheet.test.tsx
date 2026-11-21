import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TransactionFiltersSheet } from '@/features/transactions/components/TransactionFiltersSheet'
import type { Account, Category } from '@shared/types'
import type { TransactionFilter } from '@/types'

const mockAccounts: Account[] = [
  { id: 'acc_1', name: 'Tiền mặt', type: 'cash', openingBalance: 1000000, createdAt: 1, updatedAt: 1 },
]

const mockCategories: Category[] = [
  { id: 'cat_food', name: 'Ăn uống', type: 'expense', icon: 'Utensils', color: '#EF4444', isDefault: true, createdAt: 1, updatedAt: 1 },
]

describe('TransactionFiltersSheet Component Test', () => {
  it('hiển thị đầy đủ các tùy chọn lọc theo ngày, khoảng ngày và nút chọn nhanh', () => {
    const onApplyFilters = vi.fn()
    const onResetFilters = vi.fn()
    const filters: TransactionFilter = {}

    render(
      <TransactionFiltersSheet
        isOpen={true}
        onClose={vi.fn()}
        filters={filters}
        onApplyFilters={onApplyFilters}
        onResetFilters={onResetFilters}
        accounts={mockAccounts}
        categories={mockCategories}
      />
    )

    // Kiểm tra các nút chọn nhanh theo ngày
    expect(screen.getByRole('button', { name: 'Hôm nay' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hôm qua' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '7 ngày qua' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tháng này' })).toBeInTheDocument()

    // Kiểm tra các ô nhập Từ ngày và Đến ngày
    expect(screen.getByLabelText('Từ ngày')).toBeInTheDocument()
    expect(screen.getByLabelText('Đến ngày')).toBeInTheDocument()

    // Kiểm tra dropdown chọn theo tháng
    expect(screen.getByLabelText('Hoặc chọn theo tháng')).toBeInTheDocument()
  })

  it('gọi onApplyFilters khi bấm nút chọn nhanh Hôm nay', () => {
    const onApplyFilters = vi.fn()
    render(
      <TransactionFiltersSheet
        isOpen={true}
        onClose={vi.fn()}
        filters={{}}
        onApplyFilters={onApplyFilters}
        onResetFilters={vi.fn()}
        accounts={mockAccounts}
        categories={mockCategories}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Hôm nay' }))

    expect(onApplyFilters).toHaveBeenCalledTimes(1)
    const callArg = onApplyFilters.mock.calls[0]?.[0] as any
    expect(callArg).toBeDefined()
    expect(callArg).toHaveProperty('startDate')
    expect(callArg).toHaveProperty('endDate')
    expect(callArg.startDate).toBeLessThanOrEqual(callArg.endDate)
  })

  it('gọi onApplyFilters khi nhập Từ ngày và Đến ngày tùy chọn', () => {
    const onApplyFilters = vi.fn()
    render(
      <TransactionFiltersSheet
        isOpen={true}
        onClose={vi.fn()}
        filters={{}}
        onApplyFilters={onApplyFilters}
        onResetFilters={vi.fn()}
        accounts={mockAccounts}
        categories={mockCategories}
      />
    )

    const fromInput = screen.getByLabelText('Từ ngày')
    fireEvent.change(fromInput, { target: { value: '2026-11-01' } })

    expect(onApplyFilters).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: expect.any(Number),
      })
    )

    const toInput = screen.getByLabelText('Đến ngày')
    fireEvent.change(toInput, { target: { value: '2026-11-21' } })

    expect(onApplyFilters).toHaveBeenCalledWith(
      expect.objectContaining({
        endDate: expect.any(Number),
      })
    )
  })
})

