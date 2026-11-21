import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MonthSelector } from '@/features/dashboard/components/MonthSelector'
import { useViewPeriodStore } from '@/stores/viewPeriod'

describe('MonthSelector Component Test', () => {
  it('hiển thị nút chọn tháng với tháng và năm hiện tại', () => {
    useViewPeriodStore.setState({ year: 2026, month: 11 })
    render(<MonthSelector />)

    expect(screen.getByText('Tháng 11/2026')).toBeInTheDocument()
  })

  it('nhấn vào nút sẽ mở MonthPickerSheet và cho phép chọn tháng mới', async () => {
    const user = userEvent.setup()
    useViewPeriodStore.setState({ year: 2026, month: 11 })

    render(<MonthSelector />)

    const selectorBtn = screen.getByRole('button', { name: /chọn kỳ tháng xem/i })
    await user.click(selectorBtn)

    expect(screen.getByText('Chọn tháng xem')).toBeInTheDocument()
    expect(screen.getByText('Năm 2026')).toBeInTheDocument()

    // Chọn Tháng 5
    const month5Btn = screen.getByRole('button', { name: 'Tháng 5' })
    await user.click(month5Btn)

    expect(useViewPeriodStore.getState().month).toBe(5)
    expect(useViewPeriodStore.getState().year).toBe(2026)
  })
})

