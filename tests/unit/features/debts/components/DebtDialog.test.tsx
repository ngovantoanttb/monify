import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DebtDialog } from '@/features/debts/components/DebtDialog'
import type { Account, Debt } from '@shared/types'

const mockAccounts: Account[] = [
  { id: 'acc_cash', name: 'Tiền mặt', type: 'cash', openingBalance: 1000000, createdAt: 1, updatedAt: 1 },
  { id: 'acc_bank', name: 'Ngân hàng', type: 'bank', openingBalance: 10000000, createdAt: 1, updatedAt: 1 },
]

const mockBalances: Record<string, number> = {
  acc_cash: 1000000,
  acc_bank: 10000000,
}

describe('DebtDialog Component Test', () => {
  it('hiển thị nguồn tiền cộng vào ví khi Tôi vay và trừ khỏi ví khi Tôi cho vay', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(
      <DebtDialog
        isOpen={true}
        onClose={vi.fn()}
        accounts={mockAccounts}
        accountBalances={mockBalances}
        onSubmit={onSubmit}
      />
    )

    // Mặc định Tôi vay -> Nguồn tiền nhận khoản vay
    expect(screen.getByLabelText(/Nguồn tiền nhận khoản vay/i)).toBeInTheDocument()

    // Chuyển sang Tôi cho vay -> Nguồn tiền cho vay
    fireEvent.click(screen.getByRole('button', { name: /Tôi cho vay/i }))
    expect(screen.getByLabelText(/Nguồn tiền cho vay/i)).toBeInTheDocument()

    // Nhập 3,000,000 trong khi Tiền mặt chỉ có 1,000,000 -> cảnh báo không đủ số dư
    fireEvent.change(screen.getByLabelText(/Số tiền gốc/i), { target: { value: '3000000' } })
    expect(screen.getByRole('alert')).toHaveTextContent(/không đủ để cho vay/i)
    expect(screen.getByRole('button', { name: 'Thêm khoản nợ' })).toBeDisabled()

    // Đổi sang Ngân hàng có 10,000,000 -> hợp lệ và submit kèm accountId
    fireEvent.change(screen.getByLabelText(/Nguồn tiền cho vay/i), {
      target: { value: 'acc_bank' },
    })
    fireEvent.change(screen.getByLabelText(/Người vay tiền của tôi/i), {
      target: { value: 'Bạn Minh' },
    })
    fireEvent.change(screen.getByLabelText(/Nội dung khoản nợ/i), {
      target: { value: 'Mượn đóng tiền nhà' },
    })

    const submitBtn = screen.getByRole('button', { name: 'Thêm khoản nợ' })
    expect(submitBtn).not.toBeDisabled()
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1)
    })

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'lent',
        personName: 'Bạn Minh',
        principal: 3000000,
        accountId: 'acc_bank',
        idempotencyKey: expect.any(String),
      })
    )
  })

  it('ở chế độ chỉnh sửa hiển thị lưu ý điều chỉnh thông tin không làm thay đổi số dư ví', () => {
    const existing: Debt = {
      id: 'd1',
      kind: 'borrowed',
      personName: 'Anh Nam',
      content: 'Vay mua xe',
      principal: 5000000,
      paidAmount: 1000000,
      createdAt: 1,
      updatedAt: 1,
    }

    render(
      <DebtDialog
        isOpen={true}
        onClose={vi.fn()}
        initialData={existing}
        accounts={mockAccounts}
        accountBalances={mockBalances}
        onSubmit={vi.fn()}
      />
    )

    expect(screen.getByText(/không làm thay đổi số dư nguồn tiền/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Nguồn tiền nhận khoản vay/i)).not.toBeInTheDocument()
  })
})

