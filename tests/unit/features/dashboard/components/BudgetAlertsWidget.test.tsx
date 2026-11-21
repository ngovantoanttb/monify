import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BudgetAlertsWidget, type BudgetAlertItem } from '@/features/dashboard/components/BudgetAlertsWidget'

describe('BudgetAlertsWidget Component Test', () => {
  it('không render gì nếu danh sách alerts rỗng', () => {
    const { container } = render(<BudgetAlertsWidget alerts={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('hiển thị danh sách cảnh báo ngân sách khi vượt hạn mức hoặc đạt 80%', () => {
    const alerts: BudgetAlertItem[] = [
      {
        categoryId: 'cat_food',
        categoryName: 'Ăn uống',
        limit: 3000000,
        spent: 3200000,
        percentage: 1.066,
        isExceeded: true,
      },
      {
        categoryId: 'cat_shopping',
        categoryName: 'Mua sắm',
        limit: 2000000,
        spent: 1700000,
        percentage: 0.85,
        isExceeded: false,
      },
    ]

    render(<BudgetAlertsWidget alerts={alerts} />)

    expect(screen.getByText('Cảnh báo hạn mức ngân sách')).toBeInTheDocument()
    expect(screen.getByText('Ăn uống')).toBeInTheDocument()
    expect(screen.getByText('Vượt hạn mức')).toBeInTheDocument()
    expect(screen.getByText('Mua sắm')).toBeInTheDocument()
    expect(screen.getByText('85%')).toBeInTheDocument()
  })
})

