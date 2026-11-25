import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PaymentDialog } from '@/features/debts/components/PaymentDialog'
import type { Account, Debt } from '@shared/types'

const mockAccounts: Account[] = [
  { id: 'acc_cash', name: 'Tiền mặt', type: 'cash', openingBalance: 2000000, createdAt: 1, updatedAt: 1 },
  { id: 'acc_bank', name: 'Ngân hàng', type: 'bank', openingBalance: 10000000, createdAt: 1, updatedAt: 1 },
]

const mockBalances: Record<string, number> = {
  acc_cash: 2000000,
  acc_bank: 10000000,
}

const borrowedDebt: Debt = {
  id: 'd_borrowed',
  kind: 'borrowed',
  personName: 'Anh Nam',
  content: 'Vay mua xe',
  principal: 5000000,
  paidAmount: 1000000, // remaining 4,000,000
  createdAt: 1,
  updatedAt: 1,
}

describe('PaymentDialog Component Test', () => {
  it('hiển thị nguồn tiền kèm số dư và cảnh báo khi nguồn tiền không đủ số dư', async () => {
    render(
      <PaymentDialog
        isOpen={true}
        onClose={vi.fn()}
        debt={borrowedDebt}
        accounts={mockAccounts}
        accountBalances={mockBalances}
        initialMode="payment"
        onRecordPayment={vi.fn()}
      />
    )

    const amountInput = screen.getByLabelText(/Số tiền muốn trả/i)
    fireEvent.change(amountInput, { target: { value: '3000000' } })

    // Tiền mặt chỉ có 2,000,000 -> báo lỗi không đủ số dư
    expect(screen.getByRole('alert')).toHaveTextContent(/không đủ/i)
    expect(screen.getByRole('button', { name: 'Tiếp tục' })).toBeDisabled()

    // Đổi sang Ngân hàng có 10,000,000 -> hợp lệ và đi qua bước xác nhận
    const accountSelect = screen.getByLabelText(/Nguồn tiền thanh toán/i)
    fireEvent.change(accountSelect, { target: { value: 'acc_bank' } })

    const continueBtn = screen.getByRole('button', { name: 'Tiếp tục' })
    expect(continueBtn).not.toBeDisabled()
    fireEvent.click(continueBtn)

    expect(screen.getByText('Xác nhận thông tin giao dịch')).toBeInTheDocument()
  })

  it('tự động lấy số dư công nợ còn lại ở chế độ tất toán và gửi payload kèm idempotencyKey', async () => {
    const onRecordPayment = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()

    render(
      <PaymentDialog
        isOpen={true}
        onClose={onClose}
        debt={borrowedDebt}
        accounts={mockAccounts}
        accountBalances={mockBalances}
        initialMode="settle"
        onRecordPayment={onRecordPayment}
      />
    )

    const accountSelect = screen.getByLabelText(/Nguồn tiền thanh toán/i)
    fireEvent.change(accountSelect, { target: { value: 'acc_bank' } })
    fireEvent.change(screen.getByLabelText('Ghi chú'), { target: { value: 'Tất toán hết' } })

    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục tất toán/i }))
    expect(screen.getByText('Xác nhận thông tin giao dịch')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Xác nhận tất toán/i }))

    await waitFor(() => {
      expect(onRecordPayment).toHaveBeenCalledTimes(1)
    })

    expect(onRecordPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        debtId: 'd_borrowed',
        accountId: 'acc_bank',
        amount: 4000000,
        mode: 'settle',
        note: 'Tất toán hết',
        idempotencyKey: expect.any(String),
      })
    )
  })
})

