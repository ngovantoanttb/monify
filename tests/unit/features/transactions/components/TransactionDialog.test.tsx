import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TransactionDialog } from '@/features/transactions/components/TransactionDialog'
import type { Account, Category } from '@shared/types'

const mockAccounts: Account[] = [
  { id: 'acc_1', name: 'Tiền mặt', type: 'cash', openingBalance: 1000000, createdAt: 1, updatedAt: 1 },
  { id: 'acc_2', name: 'Techcombank', type: 'bank', openingBalance: 5000000, createdAt: 1, updatedAt: 1 },
]

const mockCategories: Category[] = [
  { id: 'cat_food', name: 'Ăn uống', type: 'expense', icon: 'Utensils', color: '#EF4444', isDefault: true, createdAt: 1, updatedAt: 1 },
  { id: 'cat_salary', name: 'Lương', type: 'income', icon: 'Banknote', color: '#16A34A', isDefault: true, createdAt: 1, updatedAt: 1 },
]

describe('TransactionDialog Component Test', () => {
  it('hiển thị đầy đủ form với loại mặc định là Chi tiêu', () => {
    render(
      <TransactionDialog
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        accounts={mockAccounts}
        categories={mockCategories}
      />
    )

    expect(screen.getByText('Thêm giao dịch mới')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Chi tiêu' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thu nhập' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Chuyển ví' })).toBeInTheDocument()
    expect(screen.getByLabelText(/số tiền/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/danh mục/i)).toBeInTheDocument()
  })

  it('tự động định dạng dấu phân cách nghìn khi nhập số tiền', async () => {
    const user = userEvent.setup()
    render(
      <TransactionDialog
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        accounts={mockAccounts}
        categories={mockCategories}
      />
    )

    const amountInput = screen.getByLabelText(/số tiền/i)
    await user.type(amountInput, '1500000')

    expect(amountInput).toHaveValue('1.500.000')
  })

  it('chuyển sang loại Chuyển ví sẽ ẩn Danh mục và hiện Đến ví', async () => {
    const user = userEvent.setup()
    render(
      <TransactionDialog
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        accounts={mockAccounts}
        categories={mockCategories}
      />
    )

    const transferBtn = screen.getByRole('button', { name: 'Chuyển ví' })
    await user.click(transferBtn)

    expect(screen.queryByLabelText(/danh mục/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/từ ví/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/đến ví/i)).toBeInTheDocument()
  })

  it('gửi form thành công với dữ liệu hợp lệ', async () => {
    const user = userEvent.setup()
    const handleSubmit = vi.fn().mockResolvedValue(undefined)

    render(
      <TransactionDialog
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={handleSubmit}
        accounts={mockAccounts}
        categories={mockCategories}
      />
    )

    const amountInput = screen.getByLabelText(/số tiền/i)
    await user.type(amountInput, '50000')

    const submitBtn = screen.getByRole('button', { name: /lưu giao dịch/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'expense',
          amount: 50000,
          accountId: 'acc_1',
          categoryId: 'cat_food',
        })
      )
    })
  })
})

