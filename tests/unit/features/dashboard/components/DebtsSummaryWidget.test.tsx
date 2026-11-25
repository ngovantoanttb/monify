import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DebtsSummaryWidget } from '@/features/dashboard/components/DebtsSummaryWidget'
import type { Debt, DebtHistory } from '@shared/types'

describe('DebtsSummaryWidget Component Test', () => {
  it('hiển thị đúng thống kê tổng tiền vay/đã trả/còn phải trả, cho vay/đã thu/còn phải thu và phát sinh trong tháng', () => {
    const year = 2026
    const month = 11
    const inMonthDate = new Date(2026, 10, 15, 12, 0, 0).getTime()
    const prevMonthDate = new Date(2026, 9, 10, 12, 0, 0).getTime()

    const debts: Debt[] = [
      {
        id: 'd1',
        kind: 'borrowed',
        personName: 'Anh Nam',
        content: 'Vay mua xe',
        principal: 10000000,
        paidAmount: 4000000,
        createdAt: prevMonthDate,
        updatedAt: inMonthDate,
      },
      {
        id: 'd2',
        kind: 'lent',
        personName: 'Bạn Tuấn',
        content: 'Cho mượn tiền nhà',
        principal: 6000000,
        paidAmount: 2500000,
        createdAt: inMonthDate,
        updatedAt: inMonthDate,
      },
    ]

    const histories: DebtHistory[] = [
      {
        id: 'h1',
        debtId: 'd1',
        type: 'initial_borrow',
        hasCashFlow: true,
        amount: 10000000,
        debtRemainingBefore: 0,
        debtRemainingAfter: 10000000,
        createdAt: prevMonthDate, // Tháng 10 - không tính vào phát sinh tháng 11
        actorUid: 'u1',
      },
      {
        id: 'h2',
        debtId: 'd1',
        type: 'repay',
        hasCashFlow: true,
        amount: 4000000,
        debtRemainingBefore: 10000000,
        debtRemainingAfter: 6000000,
        createdAt: inMonthDate,
        actorUid: 'u1',
      },
      {
        id: 'h3',
        debtId: 'd2',
        type: 'initial_lend',
        hasCashFlow: true,
        amount: 6000000,
        debtRemainingBefore: 0,
        debtRemainingAfter: 6000000,
        createdAt: inMonthDate,
        actorUid: 'u1',
      },
      {
        id: 'h4',
        debtId: 'd2',
        type: 'collect',
        hasCashFlow: true,
        amount: 2500000,
        debtRemainingBefore: 6000000,
        debtRemainingAfter: 3500000,
        createdAt: inMonthDate,
        actorUid: 'u1',
      },
    ]

    render(
      <MemoryRouter>
        <DebtsSummaryWidget
          debts={debts}
          debtHistories={histories}
          year={year}
          month={month}
        />
      </MemoryRouter>
    )

    expect(screen.getByText('Thống kê Công nợ (Vay & Trả)')).toBeInTheDocument()
    expect(screen.getByText('40% đã trả')).toBeInTheDocument()
    expect(screen.getByText('42% đã thu')).toBeInTheDocument()
    expect(screen.getByText(/10\.000\.000/)).toBeInTheDocument() // tổng đã vay
    expect(screen.getByText(/3\.500\.000/)).toBeInTheDocument() // còn phải thu
    expect(screen.getByText('Phát sinh công nợ trong Tháng 11/2026')).toBeInTheDocument()
    expect(screen.getAllByText(/2\.500\.000/)).toHaveLength(2) // tổng đã thu & đã thu trong tháng
    expect(screen.getAllByText(/4\.000\.000/)).toHaveLength(2) // tổng đã trả & đã trả trong tháng
    expect(screen.getAllByText(/6\.000\.000/)).toHaveLength(3) // còn phải trả, tổng cho vay, cho vay mới tháng 11
  })
})
