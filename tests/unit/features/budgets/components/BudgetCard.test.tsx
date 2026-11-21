import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BudgetCard } from '@/features/budgets/components/BudgetCard'
import type { Category, Budget } from '@shared/types'

const mockCategory: Category = {
  id: 'cat_food',
  name: 'Ăn uống',
  type: 'expense',
  icon: 'Utensils',
  color: '#EF4444',
  isDefault: true,
  createdAt: 1000,
  updatedAt: 1000,
}

describe('BudgetCard Component Test', () => {
  it('hiển thị trạng thái Chưa đặt ngân sách khi chưa có hạn mức', async () => {
    const handleSet = vi.fn()
    render(
      <BudgetCard
        category={mockCategory}
        budget={null}
        spent={250000}
        onSetBudget={handleSet}
      />
    )

    expect(screen.getByText('Ăn uống')).toBeDefined()
    expect(screen.getByText(/Chưa đặt ngân sách/)).toBeDefined()
    expect(screen.getByText(/Đặt hạn mức/)).toBeDefined()

    const btn = screen.getByRole('button', { name: /Đặt ngân sách Ăn uống/i })
    await userEvent.click(btn)
    expect(handleSet).toHaveBeenCalledWith(mockCategory, null)
  })

  it('hiển thị trạng thái Trong ngân sách khi chi tiêu dưới ngưỡng cảnh báo', () => {
    const mockBudget: Budget = {
      id: '2026-11_cat_food',
      month: '2026-11',
      categoryId: 'cat_food',
      amount: 5000000,
      createdAt: 1000,
      updatedAt: 1000,
    }

    render(
      <BudgetCard
        category={mockCategory}
        budget={mockBudget}
        spent={2000000} // 40%
        warningThreshold={0.8}
        onSetBudget={vi.fn()}
      />
    )

    expect(screen.getByText('Trong ngân sách')).toBeDefined()
    expect(screen.getByText(/Còn lại 3\.000\.000/)).toBeDefined()
  })

  it('hiển thị trạng thái Sắp chạm khi chi tiêu đạt ngưỡng 80%', () => {
    const mockBudget: Budget = {
      id: '2026-11_cat_food',
      month: '2026-11',
      categoryId: 'cat_food',
      amount: 5000000,
      createdAt: 1000,
      updatedAt: 1000,
    }

    render(
      <BudgetCard
        category={mockCategory}
        budget={mockBudget}
        spent={4200000} // 84%
        warningThreshold={0.8}
        onSetBudget={vi.fn()}
      />
    )

    expect(screen.getByText(/Sắp chạm \(84%\)/)).toBeDefined()
    expect(screen.getByText(/Còn lại 800\.000/)).toBeDefined()
  })

  it('hiển thị trạng thái Vượt ngân sách khi chi tiêu vượt hạn mức', () => {
    const mockBudget: Budget = {
      id: '2026-11_cat_food',
      month: '2026-11',
      categoryId: 'cat_food',
      amount: 5000000,
      createdAt: 1000,
      updatedAt: 1000,
    }

    render(
      <BudgetCard
        category={mockCategory}
        budget={mockBudget}
        spent={6500000} // 130%
        warningThreshold={0.8}
        onSetBudget={vi.fn()}
      />
    )

    expect(screen.getByText(/Vượt 30%/)).toBeDefined()
    expect(screen.getByText(/Vượt 1\.500\.000/)).toBeDefined()
  })
})

