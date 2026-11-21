import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ChangePasswordDialog } from '@/components/shared/ChangePasswordDialog'
import * as firebaseAuth from 'firebase/auth'
import { toast } from 'sonner'

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('@/lib/firebase/client', () => ({
  auth: {
    currentUser: {
      uid: 'user-123',
      email: 'test@example.com',
    },
  },
}))

vi.mock('firebase/auth', () => ({
  updatePassword: vi.fn(),
}))

describe('ChangePasswordDialog Component Test', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('không render khi isOpen = false', () => {
    render(<ChangePasswordDialog isOpen={false} onClose={vi.fn()} />)
    expect(screen.queryByText('Đặt mật khẩu mới')).not.toBeInTheDocument()
  })

  it('hiển thị đầy đủ tiêu đề, các trường mật khẩu và nút hành động khi isOpen = true', () => {
    render(<ChangePasswordDialog isOpen={true} onClose={vi.fn()} />)

    expect(screen.getByText('Đặt mật khẩu mới')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Mật khẩu$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Xác nhận mật khẩu$/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Đặt mật khẩu$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Đóng$/i })).toBeInTheDocument()
  })

  it('hỗ trợ bật/tắt hiển thị mật khẩu (Show/Hide Password toggle)', () => {
    render(<ChangePasswordDialog isOpen={true} onClose={vi.fn()} />)

    const passwordInput = screen.getByLabelText(/^Mật khẩu$/i)
    const confirmInput = screen.getByLabelText(/^Xác nhận mật khẩu$/i)

    // Mặc định là password
    expect(passwordInput).toHaveAttribute('type', 'password')
    expect(confirmInput).toHaveAttribute('type', 'password')

    // Bấm nút hiện mật khẩu ở ô Mật khẩu
    const showPasswordBtn = screen.getByLabelText('Hiện mật khẩu')
    fireEvent.click(showPasswordBtn)
    expect(passwordInput).toHaveAttribute('type', 'text')

    // Bấm nút ẩn mật khẩu ở ô Mật khẩu
    const hidePasswordBtn = screen.getByLabelText('Ẩn mật khẩu')
    fireEvent.click(hidePasswordBtn)
    expect(passwordInput).toHaveAttribute('type', 'password')

    // Bấm nút hiện ở ô Xác nhận mật khẩu
    const showConfirmBtn = screen.getByLabelText('Hiện xác nhận mật khẩu')
    fireEvent.click(showConfirmBtn)
    expect(confirmInput).toHaveAttribute('type', 'text')

    // Bấm nút ẩn ở ô Xác nhận mật khẩu
    const hideConfirmBtn = screen.getByLabelText('Ẩn xác nhận mật khẩu')
    fireEvent.click(hideConfirmBtn)
    expect(confirmInput).toHaveAttribute('type', 'password')
  })

  it('báo lỗi khi mật khẩu ngắn hơn 6 ký tự', async () => {
    render(<ChangePasswordDialog isOpen={true} onClose={vi.fn()} />)

    fireEvent.change(screen.getByLabelText(/^Mật khẩu$/i), { target: { value: '123' } })
    fireEvent.change(screen.getByLabelText(/^Xác nhận mật khẩu$/i), { target: { value: '123' } })
    fireEvent.click(screen.getByRole('button', { name: /^Đặt mật khẩu$/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Mật khẩu phải có ít nhất 6 ký tự')
    })
  })

  it('báo lỗi khi xác nhận mật khẩu không khớp', async () => {
    render(<ChangePasswordDialog isOpen={true} onClose={vi.fn()} />)

    fireEvent.change(screen.getByLabelText(/^Mật khẩu$/i), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText(/^Xác nhận mật khẩu$/i), { target: { value: 'different123' } })
    fireEvent.click(screen.getByRole('button', { name: /^Đặt mật khẩu$/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Xác nhận mật khẩu không khớp')
    })
  })

  it('gọi updatePassword thành công khi thông tin hợp lệ', async () => {
    vi.mocked(firebaseAuth.updatePassword).mockResolvedValueOnce(undefined as any)
    const onClose = vi.fn()

    render(<ChangePasswordDialog isOpen={true} onClose={onClose} />)

    fireEvent.change(screen.getByLabelText(/^Mật khẩu$/i), { target: { value: 'securePass123' } })
    fireEvent.change(screen.getByLabelText(/^Xác nhận mật khẩu$/i), { target: { value: 'securePass123' } })
    fireEvent.click(screen.getByRole('button', { name: /^Đặt mật khẩu$/i }))

    await waitFor(() => {
      expect(firebaseAuth.updatePassword).toHaveBeenCalledWith(
        expect.objectContaining({ uid: 'user-123' }),
        'securePass123'
      )
      expect(toast.success).toHaveBeenCalledWith('Đã đặt mật khẩu mới thành công!')
      expect(onClose).toHaveBeenCalled()
    })
  })
})

