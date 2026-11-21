import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LoginPage } from '@/pages/auth/LoginPage'
import * as firebaseAuth from 'firebase/auth'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('@/lib/firebase/initUserData', () => ({
  ensureUserDataInitialized: vi.fn().mockImplementation((user) =>
    Promise.resolve({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || 'Google User',
      role: 'member',
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  ),
}))

vi.mock('@/lib/api/auth', () => ({
  authApi: {
    login: vi.fn().mockResolvedValue({ user: null }),
    logout: vi.fn().mockResolvedValue(true),
  },
}))

vi.mock('firebase/auth', async () => {
  const actual = await vi.importActual<typeof import('firebase/auth')>('firebase/auth')
  return {
    ...actual,
    fetchSignInMethodsForEmail: vi.fn().mockResolvedValue([]),
    createUserWithEmailAndPassword: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    signInWithPopup: vi.fn(),
    signInWithRedirect: vi.fn(),
    getRedirectResult: vi.fn().mockResolvedValue(null),
    GoogleAuthProvider: vi.fn().mockImplementation(() => ({
      setCustomParameters: vi.fn(),
    })),
  }
})

describe('LoginPage Component Test', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    })
  })
  it('hiển thị form Đăng nhập mặc định với Email, Mật khẩu và nút Đăng nhập vàng', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

    expect(screen.getByText('Monify')).toBeInTheDocument()
    expect(screen.getByText('Quản lý chi tiêu thông minh')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Mật khẩu/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Đăng nhập$/i })).toBeInTheDocument()
    expect(screen.getByText('Quên mật khẩu?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /đăng nhập bằng google/i })).toBeInTheDocument()
  })

  it('không chứa câu Zero Financial Access', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

    expect(screen.queryByText(/Zero Financial Access/i)).not.toBeInTheDocument()
  })

  it('chuyển đổi mượt mà sang form Tạo tài khoản mới khi click đăng ký ngay', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

    // Nhấn link "đăng ký ngay"
    const registerBtn = screen.getByRole('button', { name: /đăng ký ngay/i })
    fireEvent.click(registerBtn)

    expect(screen.getByText('Tạo tài khoản mới')).toBeInTheDocument()
    expect(screen.getByLabelText(/Tên hiển thị/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Mật khẩu/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Nhập lại mật khẩu/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Đăng ký$/i })).toBeInTheDocument()
  })

  it('hỗ trợ mở trực tiếp chế độ Đăng ký khi truyền initialMode="register"', () => {
    render(
      <MemoryRouter>
        <LoginPage initialMode="register" />
      </MemoryRouter>
    )

    expect(screen.getByText('Tạo tài khoản mới')).toBeInTheDocument()
    expect(screen.getByLabelText(/Tên hiển thị/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Nhập lại mật khẩu/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Đăng ký$/i })).toBeInTheDocument()
  })

  it('hiển thị thông báo lỗi khi đăng ký với mật khẩu không khớp', async () => {
    render(
      <MemoryRouter>
        <LoginPage initialMode="register" />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByLabelText(/Tên hiển thị/i), { target: { value: 'Nguyễn Văn A' } })
    fireEvent.change(screen.getByLabelText(/^Email/i), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByLabelText(/^Mật khẩu/i), { target: { value: '123456' } })
    fireEvent.change(screen.getByLabelText(/Nhập lại mật khẩu/i), { target: { value: '654321' } })

    fireEvent.click(screen.getByRole('button', { name: /^Đăng ký$/i }))

    await waitFor(() => {
      expect(screen.getByText('Mật khẩu nhập lại không khớp')).toBeInTheDocument()
    })
  })

  it('chặn đăng ký mật khẩu nếu email đã được đăng ký bằng Google', async () => {
    vi.mocked(firebaseAuth.fetchSignInMethodsForEmail).mockResolvedValueOnce(['google.com'])

    render(
      <MemoryRouter>
        <LoginPage initialMode="register" />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByLabelText(/Tên hiển thị/i), { target: { value: 'Google User' } })
    fireEvent.change(screen.getByLabelText(/^Email/i), { target: { value: 'googleuser@gmail.com' } })
    fireEvent.change(screen.getByLabelText(/^Mật khẩu/i), { target: { value: '123456' } })
    fireEvent.change(screen.getByLabelText(/Nhập lại mật khẩu/i), { target: { value: '123456' } })

    fireEvent.click(screen.getByRole('button', { name: /^Đăng ký$/i }))

    await waitFor(() => {
      expect(firebaseAuth.fetchSignInMethodsForEmail).toHaveBeenCalledWith(
        expect.anything(),
        'googleuser@gmail.com'
      )
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/đã được đăng ký bằng tài khoản Google/i)
      )
      expect(firebaseAuth.createUserWithEmailAndPassword).not.toHaveBeenCalled()
    })
  })

  it('tự động chuyển hướng về /admin nếu tài khoản đã đăng nhập có quyền admin', async () => {
    useAuthStore.setState({
      user: { uid: 'u-admin', email: 'admin@monify.vn', role: 'admin' } as any,
      isAuthenticated: true,
      isLoading: false,
    })

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/admin', { replace: true })
    })
  })

  it('tự động chuyển hướng về /dashboard nếu tài khoản đã đăng nhập có quyền member', async () => {
    useAuthStore.setState({
      user: { uid: 'u-member', email: 'member@monify.vn', role: 'member' } as any,
      isAuthenticated: true,
      isLoading: false,
    })

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true })
    })
  })

  it('đăng nhập Google thành công và chuyển hướng về /dashboard', async () => {
    vi.mocked(firebaseAuth.signInWithPopup).mockResolvedValueOnce({
      user: {
        uid: 'g-user-123',
        email: 'guser@gmail.com',
        displayName: 'Google Guy',
        getIdToken: vi.fn().mockResolvedValue('fake-token'),
      },
    } as any)

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

    const googleBtn = screen.getByRole('button', { name: /đăng nhập bằng google/i })
    fireEvent.click(googleBtn)

    await waitFor(() => {
      expect(firebaseAuth.signInWithPopup).toHaveBeenCalled()
      expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/Chào mừng Google Guy/i))
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true })
    })
  })

  it('không báo lỗi đỏ khi người dùng chủ động tắt popup Google (auth/popup-closed-by-user)', async () => {
    const closedError = new Error('Popup closed')
    ;(closedError as any).code = 'auth/popup-closed-by-user'
    vi.mocked(firebaseAuth.signInWithPopup).mockRejectedValueOnce(closedError)

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

    const googleBtn = screen.getByRole('button', { name: /đăng nhập bằng google/i })
    fireEvent.click(googleBtn)

    await waitFor(() => {
      expect(firebaseAuth.signInWithPopup).toHaveBeenCalled()
      expect(toast.error).not.toHaveBeenCalled()
    })
  })

  it('thông báo tiếng Việt khi email Google đã được đăng ký bằng mật khẩu (account-exists-with-different-credential)', async () => {
    const credError = new Error('Account exists')
    ;(credError as any).code = 'auth/account-exists-with-different-credential'
    vi.mocked(firebaseAuth.signInWithPopup).mockRejectedValueOnce(credError)

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

    const googleBtn = screen.getByRole('button', { name: /đăng nhập bằng google/i })
    fireEvent.click(googleBtn)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/đã được đăng ký bằng Mật khẩu trước đó/i)
      )
    })
  })
})
