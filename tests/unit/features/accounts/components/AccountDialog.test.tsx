import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AccountDialog } from '@/features/accounts/components/AccountDialog'

describe('AccountDialog Component Test', () => {
  it('hiển thị đầy đủ các trường nhập liệu khi mở dialog', () => {
    render(<AccountDialog isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} />)

    expect(screen.getByText('Thêm ví mới')).toBeInTheDocument()
    expect(screen.getByLabelText(/tên ví/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/loại ví/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/số dư ban đầu/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/ghi chú/i)).toBeInTheDocument()
  })

  it('báo lỗi tiếng Việt khi để trống tên ví', async () => {
    const user = userEvent.setup()
    render(<AccountDialog isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} />)

    const submitBtn = screen.getByRole('button', { name: /thêm mới/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText('Tên ví không được để trống')).toBeInTheDocument()
    })
  })

  it('gọi onSubmit với dữ liệu hợp lệ', async () => {
    const user = userEvent.setup()
    const handleSubmit = vi.fn().mockResolvedValue(undefined)

    render(<AccountDialog isOpen={true} onClose={vi.fn()} onSubmit={handleSubmit} />)

    const nameInput = screen.getByLabelText(/tên ví/i)
    await user.type(nameInput, 'Techcombank')

    const balanceInput = screen.getByLabelText(/số dư ban đầu/i)
    await user.clear(balanceInput)
    await user.type(balanceInput, '5000000')

    const submitBtn = screen.getByRole('button', { name: /thêm mới/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Techcombank',
          openingBalance: 5000000,
          type: 'cash',
        })
      )
    })
  })
})
