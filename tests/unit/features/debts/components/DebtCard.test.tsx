import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DebtCard } from '@/features/debts/components/DebtCard'
import type { Debt } from '@shared/types'

const mockDebt: Debt = {
  id: 'd1',
  kind: 'borrowed',
  personName: 'Anh Nam',
  content: 'Vay mua laptop',
  principal: 20000000,
  paidAmount: 5000000,
  dueDate: Date.now() + 86400000 * 5,
  note: 'Trả trước Tết',
  createdAt: 1000,
  updatedAt: 1000,
}

describe('DebtCard Component Test', () => {
  it('hiển thị thông tin khoản vay, số tiền và trạng thái Đang hoạt động', () => {
    render(
      <DebtCard
        debt={mockDebt}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onPayment={vi.fn()}
      />
    )

    expect(screen.getByText('Anh Nam')).toBeInTheDocument()
    expect(screen.getByText('Tôi vay')).toBeInTheDocument()
    expect(screen.getByText('Đang hoạt động')).toBeInTheDocument()
    expect(screen.getByText(/Còn phải trả: 15\.000\.000/)).toBeInTheDocument()
    expect(screen.getByText(/Ghi nhận trả nợ/i)).toBeInTheDocument()
  })

  it('hiển thị badge Quá hạn khi ngày đến hạn đã qua', () => {
    const overdueDebt: Debt = {
      ...mockDebt,
      dueDate: Date.now() - 86400000 * 2, // 2 days ago
    }

    render(
      <DebtCard
        debt={overdueDebt}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onPayment={vi.fn()}
      />
    )

    expect(screen.getByText('Quá hạn')).toBeInTheDocument()
  })

  it('hiển thị Đã tất toán khi đã trả hết tiền gốc', () => {
    const settledDebt: Debt = {
      ...mockDebt,
      paidAmount: 20000000,
    }

    render(
      <DebtCard
        debt={settledDebt}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onPayment={vi.fn()}
      />
    )

    expect(screen.getByText('Đã tất toán')).toBeInTheDocument()
    expect(screen.getByText('Khoản nợ đã được tất toán đầy đủ')).toBeInTheDocument()
  })

  it('gọi callback onPayment khi nhấn nút Ghi nhận trả nợ', async () => {
    const user = userEvent.setup()
    const handlePayment = vi.fn()

    render(
      <DebtCard
        debt={mockDebt}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onPayment={handlePayment}
      />
    )

    const paymentBtn = screen.getByRole('button', { name: /Ghi nhận trả nợ/i })
    await user.click(paymentBtn)

    expect(handlePayment).toHaveBeenCalledWith(mockDebt)
  })

  it('gọi callback onSettle và onViewDetail khi nhấn Tất toán hoặc Chi tiết', async () => {
    const user = userEvent.setup()
    const handleSettle = vi.fn()
    const handleViewDetail = vi.fn()

    render(
      <DebtCard
        debt={mockDebt}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onPayment={vi.fn()}
        onSettle={handleSettle}
        onViewDetail={handleViewDetail}
      />
    )

    await user.click(screen.getByRole('button', { name: /Tất toán/i }))
    expect(handleSettle).toHaveBeenCalledWith(mockDebt)

    await user.click(screen.getByRole('button', { name: /Chi tiết và lịch sử/i }))
    expect(handleViewDetail).toHaveBeenCalledWith(mockDebt)
  })
})

