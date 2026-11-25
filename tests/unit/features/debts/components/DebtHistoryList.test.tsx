import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DebtHistoryList } from '@/features/debts/components/DebtHistoryList'
import type { Account, DebtHistory } from '@shared/types'

const mockAccounts: Account[] = [
  { id: 'acc_1', name: 'Tiền mặt', type: 'cash', openingBalance: 5000000, createdAt: 1, updatedAt: 1 },
  { id: 'acc_2', name: 'Ngân hàng', type: 'bank', openingBalance: 10000000, createdAt: 1, updatedAt: 1 },
]

const mockHistories: DebtHistory[] = [
  {
    id: 'h1',
    debtId: 'd1',
    transactionId: 'tx1',
    type: 'repay',
    hasCashFlow: true,
    amount: 1000000,
    accountId: 'acc_1',
    accountName: 'Tiền mặt',
    accountBalanceBefore: 5000000,
    accountBalanceAfter: 4000000,
    debtRemainingBefore: 3000000,
    debtRemainingAfter: 2000000,
    createdAt: new Date('2026-11-01T09:00:00').getTime(),
    actorUid: 'u1',
    note: 'Trả đợt 1',
  },
  {
    id: 'h2',
    debtId: 'd1',
    transactionId: 'tx2',
    type: 'settle_repay',
    hasCashFlow: true,
    amount: 2000000,
    accountId: 'acc_2',
    accountName: 'Ngân hàng',
    accountBalanceBefore: 10000000,
    accountBalanceAfter: 8000000,
    debtRemainingBefore: 2000000,
    debtRemainingAfter: 0,
    createdAt: new Date('2026-11-02T14:30:00').getTime(),
    actorUid: 'u1',
    note: 'Tất toán cuối kỳ',
  },
]

describe('DebtHistoryList Component Test', () => {
  it('hiển thị trạng thái trống khi chưa có lịch sử giao dịch', () => {
    render(<DebtHistoryList histories={[]} accounts={mockAccounts} />)
    expect(screen.getByText('Chưa có lịch sử giao dịch')).toBeInTheDocument()
  })

  it('hiển thị danh sách lịch sử sắp xếp mới nhất lên đầu với đầy đủ thông tin', () => {
    render(<DebtHistoryList histories={mockHistories} accounts={mockAccounts} />)

    const items = screen.getAllByText(/Tất toán trả nợ|Trả nợ/)
    expect(items[0]).toHaveTextContent('Tất toán trả nợ')
    expect(items[1]).toHaveTextContent('Trả nợ')

    expect(screen.getByText('Ngân hàng')).toBeInTheDocument()
    expect(screen.getByText('Tiền mặt')).toBeInTheDocument()
    expect(screen.getByText(/Tất toán cuối kỳ/)).toBeInTheDocument()
    expect(screen.getByText(/Trả đợt 1/)).toBeInTheDocument()
  })
})

