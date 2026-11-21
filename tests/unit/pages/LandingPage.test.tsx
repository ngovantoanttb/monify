import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LandingPage } from '@/pages/LandingPage'
import { useAuthStore } from '@/stores/auth'

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('LandingPage Component Test', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuthStore).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    } as any)
  })

  it('hiển thị đầy đủ Hero banner, card nổi bật và nút Đăng nhập ngay (không có header hay footer)', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    )

    // Tiêu đề nổi bật trong card
    expect(
      screen.getByText('Quản Lý Tài Chính Miễn Phí')
    ).toBeInTheDocument()

    // Nút CTA Đăng nhập ngay
    const loginNowBtns = screen.getAllByRole('link', { name: /Đăng nhập ngay/i })
    expect(loginNowBtns.length).toBeGreaterThan(0)
    expect(loginNowBtns[0]).toHaveAttribute('href', '/login')

    // Không có header (banner) và hiển thị bản quyền © 2026 Monify
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
    expect(screen.getByText('© 2026 Monify')).toBeInTheDocument()
  })

  it('hiển thị đầy đủ các phần giới thiệu về app và điểm nổi bật', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    )

    // Mục giới thiệu
    expect(
      screen.getByText(/Giới thiệu về Monify – Quản lý chi tiêu cả rổ/i)
    ).toBeInTheDocument()

    // Mục an toàn bảo mật Zero Financial Access
    expect(
      screen.getByText(/Nền tảng quản lý tài chính an toàn chuẩn Zero Financial Access/i)
    ).toBeInTheDocument()

    // Điểm nổi bật
    expect(screen.getByText('Điểm nổi bật của Monify')).toBeInTheDocument()
    expect(screen.getByText('Các tính năng mới khi sử dụng Monify')).toBeInTheDocument()
  })

  it('không tự ý chuyển hướng khi đã đăng nhập, chỉ chuyển tiếp khi người dùng bấm nút', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: { uid: 'u1', email: 'test@monify.vn' },
      isAuthenticated: true,
      isLoading: false,
    } as any)

    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    )

    // Tuyệt đối KHÔNG tự ý chuyển hướng
    expect(mockNavigate).not.toHaveBeenCalled()

    // Người dùng bấm nút "Đăng nhập ngay" mới được chuyển tiếp vào /dashboard
    const enterAppBtn = screen.getByRole('link', { name: /Đăng nhập ngay/i })
    expect(enterAppBtn).toBeInTheDocument()
    expect(enterAppBtn).toHaveAttribute('href', '/dashboard')
  })

  it('chuyển hướng người dùng admin đến /admin khi bấm nút Đăng nhập ngay', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: { uid: 'u-admin', email: 'admin@monify.vn', role: 'admin' },
      isAuthenticated: true,
      isLoading: false,
    } as any)

    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    )

    const enterAppBtn = screen.getByRole('link', { name: /Đăng nhập ngay/i })
    expect(enterAppBtn).toHaveAttribute('href', '/admin')
  })
})

