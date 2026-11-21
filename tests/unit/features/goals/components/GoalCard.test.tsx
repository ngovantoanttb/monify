import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GoalCard } from '@/features/goals/components/GoalCard'
import type { Goal } from '@shared/types'

const mockGoal: Goal = {
  id: 'g1',
  name: 'Mua xe máy',
  targetAmount: 30000000,
  savedAmount: 15000000,
  deadline: Date.now() + 86400000 * 10,
  note: 'Honda Vision',
  createdAt: 1000,
  updatedAt: 1000,
}

describe('GoalCard Component Test', () => {
  it('hiển thị đầy đủ thông tin mục tiêu, tiến độ 50% và nút hành động', () => {
    render(
      <GoalCard
        goal={mockGoal}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onDeposit={vi.fn()}
      />
    )

    expect(screen.getByText('Mua xe máy')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByText(/Còn thiếu: 15\.000\.000/)).toBeInTheDocument()
    expect(screen.getByText(/Tiết kiệm thêm/i)).toBeInTheDocument()
  })

  it('hiển thị badge Đã hoàn thành khi đã tiết kiệm đủ mục tiêu', () => {
    const completedGoal: Goal = {
      ...mockGoal,
      savedAmount: 30000000,
    }

    render(
      <GoalCard
        goal={completedGoal}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onDeposit={vi.fn()}
      />
    )

    expect(screen.getByText('Đã hoàn thành')).toBeInTheDocument()
    expect(screen.getByText(/Đã đạt chỉ tiêu!/)).toBeInTheDocument()
  })

  it('gọi callback onDeposit khi nhấn nút Tiết kiệm thêm', async () => {
    const user = userEvent.setup()
    const handleDeposit = vi.fn()

    render(
      <GoalCard
        goal={mockGoal}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onDeposit={handleDeposit}
      />
    )

    const depositBtn = screen.getByRole('button', { name: /Tiết kiệm thêm/i })
    await user.click(depositBtn)

    expect(handleDeposit).toHaveBeenCalledWith(mockGoal)
  })
})

