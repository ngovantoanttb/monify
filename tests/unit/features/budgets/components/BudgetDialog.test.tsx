import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BudgetDialog } from '@/features/budgets/components/BudgetDialog'
import type { Category, Budget } from '@shared/types'

const mockCategories: Category[] = [
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
  {
    id: 'cat_travel',
    name: 'Di chuyển',
    type: 'expense',
    icon: 'Car',
    color: '#F97316',
    isDefault: true,
    createdAt: 1000,
    updatedAt: 1000,
  },
]

describe('BudgetDialog Component Test', () => {
  it('hiển thị đầy đủ form đặt hạn mức ngân sách', () => {
    render(
      <BudgetDialog
        isOpen={true}
        onClose={vi.fn()}
        month="2026-11"
        categories={mockCategories}
        onSubmit={vi.fn()}
      />
    )

    expect(screen.getByText('Đặt hạn mức ngân sách')).toBeInTheDocument()
    expect(screen.getByText('Tháng 11/2026')).toBeInTheDocument()
    expect(screen.getByLabelText(/Hạn mức chi tối đa/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Đặt hạn mức/i })).toBeInTheDocument()
  })

  it('tự động định dạng dấu phân cách nghìn khi nhập số tiền và cộng nhanh qua chip', async () => {
    const user = userEvent.setup()
    render(
      <BudgetDialog
        isOpen={true}
        onClose={vi.fn()}
        month="2026-11"
        categories={mockCategories}
        category={mockCategories[0]}
        onSubmit={vi.fn()}
      />
    )

    const amountInput = screen.getByLabelText(/Hạn mức chi tối đa/i) as HTMLInputElement
    await user.type(amountInput, '2500000')

    expect(amountInput.value).toBe('2.500.000')

    const chip1tr = screen.getByRole('button', { name: '+1 tr' })
    await user.click(chip1tr)

    expect(amountInput.value).toBe('3.500.000')
  })

  it('gửi đúng thông tin ngân sách khi submit form', async () => {
    const user = userEvent.setup()
    const handleSubmit = vi.fn().mockResolvedValue(undefined)
    const handleClose = vi.fn()

    render(
      <BudgetDialog
        isOpen={true}
        onClose={handleClose}
        month="2026-11"
        categories={mockCategories}
        category={mockCategories[0]}
        onSubmit={handleSubmit}
      />
    )

    const amountInput = screen.getByLabelText(/Hạn mức chi tối đa/i)
    await user.type(amountInput, '5000000')

    const submitBtn = screen.getByRole('button', { name: /Đặt hạn mức/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        month: '2026-11',
        categoryId: 'cat_food',
        amount: 5000000,
      })
      expect(handleClose).toHaveBeenCalled()
    })
  })

  it('hiển thị nút Xóa khi cập nhật ngân sách đã có', () => {
    const existingBudget: Budget = {
      id: '2026-11_cat_food',
      month: '2026-11',
      categoryId: 'cat_food',
      amount: 5000000,
      createdAt: 1000,
      updatedAt: 1000,
    }

    render(
      <BudgetDialog
        isOpen={true}
        onClose={vi.fn()}
        month="2026-11"
        categories={mockCategories}
        category={mockCategories[0]}
        initialBudget={existingBudget}
        onSubmit={vi.fn()}
        onDelete={vi.fn()}
      />
    )

    expect(screen.getByText('Cập nhật hạn mức ngân sách')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Xóa/i })).toBeInTheDocument()
  })
})
