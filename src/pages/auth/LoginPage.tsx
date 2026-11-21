import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Eye, EyeOff, X } from 'lucide-react'
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { auth } from '@/lib/firebase/client'
import { authApi } from '@/lib/api/auth'
import { ensureUserDataInitialized } from '@/lib/firebase/initUserData'
import { useAuthStore } from '@/stores/auth'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// Schema đăng nhập
const loginSchema = z.object({
  email: z.string().min(1, 'Vui lòng nhập email').email('Định dạng email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
})
type LoginFormValues = z.infer<typeof loginSchema>

// Schema đăng ký (Tên hiển thị, Email, Mật khẩu, Nhập lại mật khẩu)
const registerSchema = z
  .object({
    displayName: z
      .string()
      .min(1, 'Vui lòng nhập tên hiển thị')
      .min(2, 'Tên hiển thị cần ít nhất 2 ký tự')
      .max(60, 'Tên hiển thị tối đa 60 ký tự'),
    email: z.string().min(1, 'Vui lòng nhập email').email('Định dạng email không hợp lệ'),
    password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
    confirmPassword: z.string().min(1, 'Vui lòng nhập lại mật khẩu'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu nhập lại không khớp',
    path: ['confirmPassword'],
  })
type RegisterFormValues = z.infer<typeof registerSchema>

function getFirebaseErrorMessage(err: any): string {
  const code = err?.code || ''
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Email này đã tồn tại trên hệ thống. Mỗi tài khoản chỉ dùng một phương thức duy nhất. Vui lòng đăng nhập bằng Google hoặc Mật khẩu đã tạo.'
    case 'auth/account-exists-with-different-credential':
      return 'Email này đã được đăng ký bằng phương thức khác. Mỗi tài khoản chỉ dùng một phương thức duy nhất. Vui lòng đăng nhập bằng phương thức ban đầu.'
    case 'auth/credential-already-in-use':
      return 'Thông tin xác thực này đã được liên kết với một tài khoản khác.'
    case 'auth/invalid-email':
      return 'Địa chỉ email không hợp lệ.'
    case 'auth/operation-not-allowed':
      return 'Phương thức đăng nhập này chưa được kích hoạt.'
    case 'auth/weak-password':
      return 'Mật khẩu quá ngắn, vui lòng nhập ít nhất 6 ký tự.'
    case 'auth/user-disabled':
      return 'Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Email hoặc mật khẩu không chính xác.'
    case 'auth/too-many-requests':
      return 'Quá nhiều lần thử thất bại. Vui lòng thử lại sau ít phút.'
    case 'auth/popup-closed-by-user':
      return 'Bạn đã đóng cửa sổ đăng nhập Google.'
    case 'auth/network-request-failed':
      return 'Lỗi kết nối mạng, vui lòng kiểm tra lại đường truyền.'
    default:
      return err?.message || 'Đã có lỗi xảy ra, vui lòng thử lại.'
  }
}

interface LoginPageProps {
  initialMode?: 'login' | 'register'
}

export function LoginPage({ initialMode = 'login' }: LoginPageProps) {
  const [mode, setMode] = React.useState<'login' | 'register'>(initialMode)
  const [isLoading, setIsLoading] = React.useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)

  const { user, isAuthenticated, setUser } = useAuthStore()
  const navigate = useNavigate()

  // Tự động chuyển về Dashboard hoặc Admin nếu người dùng đã có phiên hợp lệ
  React.useEffect(() => {
    if (isAuthenticated && user) {
      const target = user.role === 'admin' ? '/admin' : '/dashboard'
      navigate(target, { replace: true })
    }
  }, [isAuthenticated, user, navigate])

  // Xử lý kết quả đăng nhập Google chuyển hướng (nếu trình duyệt fallback sang redirect)
  React.useEffect(() => {
    let isMounted = true
    getRedirectResult(auth)
      .then(async (result) => {
        if (!isMounted || !result?.user) return
        setIsLoading(true)
        try {
          const userProfile = await ensureUserDataInitialized(result.user)
          setUser(userProfile)

          try {
            const idToken = await result.user.getIdToken()
            await authApi.login(idToken)
          } catch {
            // Backend cookie session tùy chọn
          }

          toast.success(`Chào mừng ${userProfile.displayName} đến với Monify!`)
          navigate(userProfile.role === 'admin' ? '/admin' : '/dashboard')
        } catch (err: any) {
          toast.error(getFirebaseErrorMessage(err))
        } finally {
          if (isMounted) setIsLoading(false)
        }
      })
      .catch((err) => {
        if (err && err.code !== 'auth/popup-closed-by-user') {
          toast.error(getFirebaseErrorMessage(err))
        }
      })

    return () => {
      isMounted = false
    }
  }, [navigate, setUser])

  // Form Đăng nhập
  const {
    register: registerLogin,
    handleSubmit: handleSubmitLogin,
    formState: { errors: loginErrors },
    getValues: getLoginValues,
    reset: resetLogin,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  // Form Đăng ký
  const {
    register: registerReg,
    handleSubmit: handleSubmitReg,
    formState: { errors: regErrors },
    reset: resetReg,
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: '', email: '', password: '', confirmPassword: '' },
  })

  const switchMode = (newMode: 'login' | 'register') => {
    setMode(newMode)
    setShowPassword(false)
    setShowConfirmPassword(false)
    if (newMode === 'login') {
      resetLogin()
    } else {
      resetReg()
    }
  }

  // Đăng nhập
  const onLogin = async (data: LoginFormValues) => {
    setIsLoading(true)
    try {
      const cred = await signInWithEmailAndPassword(auth, data.email, data.password)
      const userProfile = await ensureUserDataInitialized(cred.user)
      setUser(userProfile)

      try {
        const idToken = await cred.user.getIdToken()
        await authApi.login(idToken)
      } catch {
        // Backend cookie session tùy chọn
      }

      toast.success(`Chào mừng ${userProfile.displayName} quay trở lại!`)
      navigate(userProfile.role === 'admin' ? '/admin' : '/dashboard')
    } catch (err: any) {
      // Kiểm tra nếu tài khoản này thực chất được đăng ký bằng Google
      try {
        const methods = await fetchSignInMethodsForEmail(auth, data.email)
        if (methods.includes('google.com') && !methods.includes('password')) {
          toast.error(
            'Tài khoản này được đăng ký bằng Google. Vui lòng nhấn nút "Đăng nhập bằng Google" bên dưới.'
          )
          return
        }
      } catch {
        // Bỏ qua lỗi phụ nếu tính năng bảo vệ enumeration của Firebase được bật
      }
      toast.error(getFirebaseErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  // Đăng ký
  const onRegister = async (data: RegisterFormValues) => {
    setIsLoading(true)
    try {
      
      try {
        const methods = await fetchSignInMethodsForEmail(auth, data.email)
        if (methods.includes('google.com')) {
          toast.error(
            'Email này đã được đăng ký bằng tài khoản Google. Vui lòng nhấn "Đăng nhập bằng Google", mỗi tài khoản chỉ dùng một phương thức duy nhất.'
          )
          setIsLoading(false)
          return
        }
        if (methods.includes('password')) {
          toast.error(
            'Email này đã được tạo tài khoản bằng Mật khẩu. Vui lòng chuyển sang tab Đăng nhập.'
          )
          setIsLoading(false)
          return
        }
        if (methods.length > 0) {
          toast.error(
            'Email này đã được đăng ký trên hệ thống. Vui lòng chuyển sang tab Đăng nhập.'
          )
          setIsLoading(false)
          return
        }
      } catch {
        // Tiếp tục nếu fetchSignInMethodsForEmail bị hạn chế bởi cấu hình dự án
      }

      const cred = await createUserWithEmailAndPassword(auth, data.email, data.password)
      try {
        await updateProfile(cred.user, { displayName: data.displayName })
      } catch {
        // Bỏ qua nếu lỗi cập nhật profile cục bộ
      }
      const userProfile = await ensureUserDataInitialized(cred.user, data.displayName)
      setUser(userProfile)

      try {
        const idToken = await cred.user.getIdToken()
        await authApi.login(idToken)
      } catch {
        // Backend cookie session tùy chọn
      }

      toast.success(`Đăng ký thành công! Chào mừng ${data.displayName} đến với Monify.`)
      navigate(userProfile.role === 'admin' ? '/admin' : '/dashboard')
    } catch (err: any) {
      toast.error(getFirebaseErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  // Đăng nhập Google
  const handleGoogleLogin = async () => {
    if (isLoading || isGoogleLoading) return
    setIsGoogleLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })

      // 1. Thực hiện mở popup đăng nhập tài khoản Google
      let result: any = null
      try {
        result = await signInWithPopup(auth, provider)
      } catch (popupErr: any) {
        if (popupErr?.code === 'auth/popup-closed-by-user') {
          // Người dùng chủ động tắt popup Google - không hiển thị lỗi
          return
        }
        if (popupErr?.code === 'auth/cancelled-popup-request') {
          // Yêu cầu trùng lặp - bỏ qua an toàn
          return
        }
        if (popupErr?.code === 'auth/account-exists-with-different-credential') {
          toast.error(
            'Email này đã được đăng ký bằng Mật khẩu trước đó. Vui lòng chuyển sang tab Đăng nhập bằng Email và Mật khẩu.'
          )
          return
        }
        if (popupErr?.code === 'auth/popup-blocked') {
          // Nếu trình duyệt bật chế độ chặn popup nghiêm ngặt, tự động chuyển sang chế độ Redirect
          console.warn('[Google Auth] Popup bị chặn bởi trình duyệt, chuyển sang Redirect...')
          await signInWithRedirect(auth, provider)
          return
        }

        throw popupErr
      }

      // 2. Khi đăng nhập thành công
      if (result?.user) {
        const userProfile = await ensureUserDataInitialized(result.user)
        setUser(userProfile)

        // Đồng bộ cookie session với backend (không chặn luồng người dùng)
        try {
          const idToken = await result.user.getIdToken()
          await authApi.login(idToken)
        } catch (sessionErr) {
          console.warn('[Google Auth] Backend session sync:', sessionErr)
        }

        toast.success(`Chào mừng ${userProfile.displayName} đến với Monify!`)
        const target = userProfile.role === 'admin' ? '/admin' : '/dashboard'
        navigate(target, { replace: true })
      }
    } catch (err: any) {
      toast.error(getFirebaseErrorMessage(err))
    } finally {
      setIsGoogleLoading(false)
    }
  }

  // Quên mật khẩu
  const handleForgotPassword = async () => {
    const email = getLoginValues('email')
    if (!email) {
      toast.info('Vui lòng nhập địa chỉ Email vào ô phía trên rồi nhấn Quên mật khẩu')
      return
    }
    try {
      await sendPasswordResetEmail(auth, email)
      toast.success('Đã gửi email khôi phục mật khẩu! Vui lòng kiểm tra hộp thư.')
    } catch (err: any) {
      toast.error(getFirebaseErrorMessage(err))
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#0e111d] select-none">
      {/* Khung Modal đăng nhập / đăng ký chia đôi 2 cột */}
      <div className="w-full max-w-[860px] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl bg-[#161a2e] border border-white/5 flex flex-col md:flex-row relative min-h-[500px]">
        {/* Nút đóng X ở góc trên bên phải */}
        <button
          type="button"
          onClick={() => navigate('/')}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cột trái: Poster & Logo Monify (Desktop) */}
        <div className="hidden md:flex md:w-[45%] relative flex-col justify-end p-8 overflow-hidden bg-gradient-to-br from-[#121829] via-[#161c33] to-[#0f1322]">
          {/* Lớp trang trí đồ họa tài chính phía sau */}
          <div className="absolute inset-0 opacity-25 pointer-events-none">
            <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-[#0D9488]/30 blur-2xl" />
            <div className="absolute top-1/3 -right-8 w-44 h-44 rounded-full bg-[#f5c518]/20 blur-2xl" />
            {/* Lưới các thẻ tài chính phong cách collage */}
            <div className="p-4 space-y-3 rotate-[-6deg] scale-105 translate-y-4">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 shadow-lg backdrop-blur">
                <div className="text-[11px] text-slate-400">Thu nhập tháng này</div>
                <div className="text-base font-bold text-emerald-400">+35.800.000 ₫</div>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 shadow-lg backdrop-blur ml-6">
                <div className="text-[11px] text-slate-400">Tiết kiệm mục tiêu</div>
                <div className="text-base font-bold text-[#f5c518]">82.5% Hoàn thành</div>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 shadow-lg backdrop-blur">
                <div className="text-[11px] text-slate-400">Tổng tài sản ví</div>
                <div className="text-base font-bold text-white">128.450.000 ₫</div>
              </div>
            </div>
          </div>

          {/* Lớp phủ gradient mờ tối để nổi bật thương hiệu ở góc dưới */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#101424] via-[#101424]/75 to-transparent" />

          {/* Logo & Tên Monify ở góc dưới bên trái (như mẫu RoPhim) */}
          <div className="relative z-10 flex items-center gap-3.5 mt-auto">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#065F46] p-2.5 shadow-xl flex items-center justify-center shrink-0 border border-white/10">
              <img src="/monify-mark.svg" alt="Monify" className="w-full h-full" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white tracking-tight leading-none">Monify</div>
              <p className="text-xs text-slate-300 font-medium mt-1">Quản lý chi tiêu thông minh</p>
            </div>
          </div>
        </div>

        {/* Cột phải: Form Đăng nhập hoặc Tạo tài khoản mới */}
        <div className="w-full md:w-[55%] p-6 sm:p-10 flex flex-col justify-center bg-[#161a2e]">
          {/* Form Đăng nhập (Ảnh 1) */}
          {mode === 'login' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Đăng nhập</h2>
                <p className="text-sm text-slate-400 mt-2">
                  Nếu bạn chưa có tài khoản,{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('register')}
                    className="text-[#f5c518] hover:underline font-semibold cursor-pointer"
                  >
                    đăng ký ngay
                  </button>
                </p>
              </div>

              <form onSubmit={handleSubmitLogin(onLogin)} className="space-y-3.5 pt-2">
                <div>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="Email"
                    aria-label="Email"
                    autoComplete="email"
                    disabled={isLoading}
                    className="h-12 w-full rounded-lg bg-[#121524] border border-white/10 px-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488] focus-visible:ring-1 focus-visible:ring-[#0D9488] focus-visible:ring-offset-0 text-sm sm:text-base transition-all"
                    {...registerLogin('email')}
                  />
                  {loginErrors.email && (
                    <p className="text-xs text-rose-400 mt-1">{loginErrors.email.message}</p>
                  )}
                </div>

                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mật khẩu"
                    aria-label="Mật khẩu"
                    autoComplete="current-password"
                    disabled={isLoading}
                    className="h-12 w-full rounded-lg bg-[#121524] border border-white/10 px-4 pr-11 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488] focus-visible:ring-1 focus-visible:ring-[#0D9488] focus-visible:ring-offset-0 text-sm sm:text-base transition-all"
                    {...registerLogin('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 touch-target flex items-center justify-center transition-colors"
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  {loginErrors.password && (
                    <p className="text-xs text-rose-400 mt-1">{loginErrors.password.message}</p>
                  )}
                </div>

                {/* Nút Đăng nhập màu vàng nổi bật */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="h-12 w-full rounded-lg bg-[#f5c518] hover:bg-[#eab308] text-slate-950 font-bold text-base shadow-md transition-all active:scale-[0.99] flex items-center justify-center touch-target mt-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Đăng nhập'}
                </Button>
              </form>

              {/* Link Quên mật khẩu? */}
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Quên mật khẩu?
                </button>
              </div>

              {/* Nút Đăng nhập bằng Google nền trắng viền đẹp */}
              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoading || isGoogleLoading}
                  className="w-full sm:w-auto min-w-[240px] h-11 bg-white hover:bg-slate-100 text-slate-800 font-semibold text-sm rounded-lg px-6 flex items-center justify-center gap-3 shadow-md transition-all active:scale-95 touch-target disabled:opacity-70 disabled:pointer-events-none cursor-pointer"
                >
                  {isGoogleLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                      <span>Đang kết nối Google...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                        />
                      </svg>
                      <span>Đăng nhập bằng Google</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Form Tạo tài khoản mới (Ảnh 2) */}
          {mode === 'register' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Tạo tài khoản mới</h2>
                <p className="text-sm text-slate-400 mt-2">
                  Nếu bạn đã có tài khoản,{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="text-[#f5c518] hover:underline font-semibold cursor-pointer"
                  >
                    đăng nhập
                  </button>
                </p>
              </div>

              <form onSubmit={handleSubmitReg(onRegister)} className="space-y-3 pt-2">
                <div>
                  <Input
                    id="reg-name"
                    type="text"
                    placeholder="Tên hiển thị"
                    aria-label="Tên hiển thị"
                    autoComplete="name"
                    disabled={isLoading}
                    className="h-12 w-full rounded-lg bg-[#121524] border border-white/10 px-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488] focus-visible:ring-1 focus-visible:ring-[#0D9488] focus-visible:ring-offset-0 text-sm sm:text-base transition-all"
                    {...registerReg('displayName')}
                  />
                  {regErrors.displayName && (
                    <p className="text-xs text-rose-400 mt-1">{regErrors.displayName.message}</p>
                  )}
                </div>

                <div>
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="Email"
                    aria-label="Email"
                    autoComplete="email"
                    disabled={isLoading}
                    className="h-12 w-full rounded-lg bg-[#121524] border border-white/10 px-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488] focus-visible:ring-1 focus-visible:ring-[#0D9488] focus-visible:ring-offset-0 text-sm sm:text-base transition-all"
                    {...registerReg('email')}
                  />
                  {regErrors.email && (
                    <p className="text-xs text-rose-400 mt-1">{regErrors.email.message}</p>
                  )}
                </div>

                <div className="relative">
                  <Input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mật khẩu"
                    aria-label="Mật khẩu"
                    autoComplete="new-password"
                    disabled={isLoading}
                    className="h-12 w-full rounded-lg bg-[#121524] border border-white/10 px-4 pr-11 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488] focus-visible:ring-1 focus-visible:ring-[#0D9488] focus-visible:ring-offset-0 text-sm sm:text-base transition-all"
                    {...registerReg('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 touch-target flex items-center justify-center transition-colors"
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  {regErrors.password && (
                    <p className="text-xs text-rose-400 mt-1">{regErrors.password.message}</p>
                  )}
                </div>

                <div className="relative">
                  <Input
                    id="reg-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Nhập lại mật khẩu"
                    aria-label="Nhập lại mật khẩu"
                    autoComplete="new-password"
                    disabled={isLoading}
                    className="h-12 w-full rounded-lg bg-[#121524] border border-white/10 px-4 pr-11 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488] focus-visible:ring-1 focus-visible:ring-[#0D9488] focus-visible:ring-offset-0 text-sm sm:text-base transition-all"
                    {...registerReg('confirmPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 touch-target flex items-center justify-center transition-colors"
                    aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  {regErrors.confirmPassword && (
                    <p className="text-xs text-rose-400 mt-1">{regErrors.confirmPassword.message}</p>
                  )}
                </div>

                {/* Nút Đăng ký màu vàng */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="h-12 w-full rounded-lg bg-[#f5c518] hover:bg-[#eab308] text-slate-950 font-bold text-base shadow-md transition-all active:scale-[0.99] flex items-center justify-center touch-target mt-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Đăng ký'}
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
