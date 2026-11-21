import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SettingsPage } from '@/pages/member/SettingsPage'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/lib/api/auth'
import * as firebaseDatabase from 'firebase/database'

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('@/lib/api/auth', () => ({
  authApi: {
    logout: vi.fn().mockResolvedValue({ message: 'Success' }),
  },
}))

vi.mock('@/features/transactions/services/transactions', () => ({
  transactionsService: {
    getAllTransactions: vi.fn().mockResolvedValue([
      { id: 'tx_1', amount: 50000, date: 1000, type: 'expense' },
    ]),
  },
}))

vi.mock('@/lib/firebase/client', () => ({
  auth: {
    signOut: vi.fn().mockResolvedValue(undefined),
  },
  database: {},
}))

vi.mock('firebase/database', () => ({
  ref: vi.fn(),
  update: vi.fn().mockResolvedValue(undefined),
  remove: vi.fn().mockResolvedValue(undefined),
  get: vi.fn().mockResolvedValue({
    exists: () => false,
  }),
}))

describe('SettingsPage Component Test', () => {
  const mockSetUser = vi.fn()
  const mockClearAuth = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useAuthStore).mockReturnValue({
      user: {
        uid: 'user_123',
        email: 'user@monify.vn',
        displayName: 'Nguyễn Văn Người Dùng',
        photoURL: 'https://example.com/avatar.jpg',
        role: 'member',
        status: 'active',
        createdAt: 1000,
        updatedAt: 1000,
      },
      setUser: mockSetUser,
      clearAuth: mockClearAuth,
    } as any)
  })

  it('hiển thị thông tin hồ sơ và email ở chế độ chỉ đọc (disabled)', () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    )

    expect(screen.getByText('Cài đặt Tài khoản')).toBeInTheDocument()
    expect(screen.getByDisplayValue('user@monify.vn')).toBeDisabled()
    expect(screen.getByDisplayValue('Nguyễn Văn Người Dùng')).toBeInTheDocument()
  })

  it('cập nhật tên hiển thị khi nhấn Lưu hồ sơ', async () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    )

    const nameInput = screen.getByLabelText('Tên hiển thị')
    fireEvent.change(nameInput, { target: { value: 'Nguyễn Văn Mới' } })

    const saveBtn = screen.getByRole('button', { name: /Lưu hồ sơ/i })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(firebaseDatabase.update).toHaveBeenCalled()
      expect(mockSetUser).toHaveBeenCalledWith(
        expect.objectContaining({
          displayName: 'Nguyễn Văn Mới',
        })
      )
    })
  })

  it('gọi authApi.logout khi nhấn Đăng xuất', async () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    )

    const logoutDeviceBtn = screen.getByRole('button', { name: /Đăng xuất thiết bị này/i })
    fireEvent.click(logoutDeviceBtn)

    await waitFor(() => {
      expect(authApi.logout).toHaveBeenCalledWith(false)
      expect(mockClearAuth).toHaveBeenCalled()
    })
  })

  it('hiển thị quy trình 2 bước khi chọn xóa toàn bộ dữ liệu tài chính', async () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    )

    // Nhấn nút xóa ở Card Vùng nguy hiểm
    const deleteBtn = screen.getByRole('button', { name: /Xóa toàn bộ dữ liệu tài chính/i })
    fireEvent.click(deleteBtn)

    // Bước 1: Hộp thoại cảnh báo
    expect(screen.getByText(/Xác nhận xóa dữ liệu \(Bước 1\/2\)/i)).toBeInTheDocument()

    // Chuyển sang Bước 2
    const step2Btn = screen.getByRole('button', { name: /Tiếp tục đến bước 2/i })
    fireEvent.click(step2Btn)

    // Bước 2: Hộp thoại nhập từ khóa
    expect(screen.getByText(/Xác nhận lần cuối \(Bước 2\/2\)/i)).toBeInTheDocument()
    const confirmInput = screen.getByPlaceholderText('XÓA DỮ LIỆU')

    // Nhập sai -> Nút xóa bị disabled
    fireEvent.change(confirmInput, { target: { value: 'sai roi' } })
    const confirmDeleteBtn = screen.getByRole('button', { name: /Xác nhận xóa vĩnh viễn/i })
    expect(confirmDeleteBtn).toBeDisabled()

    // Nhập đúng 'XÓA DỮ LIỆU' -> Nút kích hoạt và gọi remove
    fireEvent.change(confirmInput, { target: { value: 'XÓA DỮ LIỆU' } })
    expect(confirmDeleteBtn).not.toBeDisabled()
    fireEvent.click(confirmDeleteBtn)

    await waitFor(() => {
      expect(firebaseDatabase.remove).toHaveBeenCalled()
    })
  })

  it('hiển thị nút bộ sưu tập ảnh và thẻ thông tin hoạt động tài khoản', async () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    )

    expect(screen.getByRole('button', { name: /Bộ sưu tập ảnh/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Tải ảnh lên/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Gỡ ảnh/i })).toBeInTheDocument()
    expect(screen.getByText('Hoạt động tài khoản')).toBeInTheDocument()
    expect(screen.getByText('Phương thức đăng nhập')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText(/1 giao dịch đã ghi nhận/i)).toBeInTheDocument()
    })
  })

  it('mở modal đổi ảnh đại diện với 6 gói và lưu ảnh được chọn', async () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    )

    // Nhấn nút Bộ sưu tập ảnh
    const openModalBtn = screen.getByRole('button', { name: /Bộ sưu tập ảnh/i })
    fireEvent.click(openModalBtn)

    // Kiểm tra tiêu đề modal
    expect(screen.getByRole('heading', { name: 'Đổi ảnh đại diện' })).toBeInTheDocument()

    // Kiểm tra 6 gói ảnh theo thiết kế
    expect(screen.getByText('Hệ Tư Tưởng Carry')).toBeInTheDocument()
    expect(screen.getByText('Oppa Chạy Bằng Cơm')).toBeInTheDocument()
    expect(screen.getByText('Pháp Sư Trung Hoa')).toBeInTheDocument()
    expect(screen.getByText('Hào Khí Đông Á')).toBeInTheDocument()
    expect(screen.getByText('Tây Lông Hệ Real')).toBeInTheDocument()
    expect(screen.getByText('Meme Chúa Phù Hộ')).toBeInTheDocument()

    // Chuyển sang gói 'Oppa Chạy Bằng Cơm'
    const oppaTab = screen.getByText('Oppa Chạy Bằng Cơm')
    fireEvent.click(oppaTab)

    // Chọn ảnh đầu tiên trong gói
    const avatarImages = screen.getAllByAltText('Avatar option')
    expect(avatarImages.length).toBe(15) // Oppa Chạy Bằng Cơm có đúng 15 ảnh
    const firstAvatar = avatarImages[0]!
    fireEvent.click(firstAvatar.parentElement!)

    // Nhấn nút Lưu lại
    const saveBtn = screen.getByRole('button', { name: 'Lưu lại' })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(firebaseDatabase.update).toHaveBeenCalled()
      expect(mockSetUser).toHaveBeenCalledWith(
        expect.objectContaining({
          photoURL: '/images/avatars/pack2/01.jpg',
        })
      )
    })
  })
})

