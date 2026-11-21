import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CategoryDialog } from '@/features/categories/components/CategoryDialog'

describe('CategoryDialog Component Test', () => {
  it('hiển thị tiêu đề, các trường nhập liệu và nút thêm mới', () => {
    render(<CategoryDialog isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} />)

    expect(screen.getByText('Thêm danh mục mới')).toBeInTheDocument()
    expect(screen.getByLabelText(/tên danh mục/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/phân loại/i)).toBeInTheDocument()
  })

  it('báo lỗi tiếng Việt khi để trống tên danh mục', async () => {
    const user = userEvent.setup()
    render(<CategoryDialog isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} />)

    const submitBtn = screen.getByRole('button', { name: /thêm mới/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText('Tên danh mục không được để trống')).toBeInTheDocument()
    })
  })

  it('gửi đúng thông tin danh mục khi form hợp lệ', async () => {
    const user = userEvent.setup()
    const handleSubmit = vi.fn().mockResolvedValue(undefined)

    render(<CategoryDialog isOpen={true} onClose={vi.fn()} onSubmit={handleSubmit} defaultType="expense" />)

    const nameInput = screen.getByLabelText(/tên danh mục/i)
    await user.type(nameInput, 'Cà phê sáng')

    const submitBtn = screen.getByRole('button', { name: /thêm mới/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Cà phê sáng',
          type: 'expense',
        })
      )
    })
  })
})
