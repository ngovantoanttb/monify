import React from 'react'
import { createPortal } from 'react-dom'
import { Eye, EyeOff, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { auth } from '@/lib/firebase/client'
import { updatePassword } from 'firebase/auth'
import { toast } from 'sonner'

interface ChangePasswordDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function ChangePasswordDialog({ isOpen, onClose }: ChangePasswordDialogProps) {
  const [password, setPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)

  if (!isOpen) return null

  const handleClose = () => {
    setPassword('')
    setConfirmPassword('')
    setShowPassword(false)
    setShowConfirmPassword(false)
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!password) {
      toast.error('Vui lòng nhập mật khẩu mới')
      return
    }

    if (password.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Xác nhận mật khẩu không khớp')
      return
    }

    const currentUser = auth.currentUser
    if (!currentUser) {
      toast.error('Không tìm thấy phiên đăng nhập. Vui lòng đăng nhập lại.')
      return
    }

    setIsLoading(true)
    try {
      await updatePassword(currentUser, password)
      toast.success('Đã đặt mật khẩu mới thành công!')
      handleClose()
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        toast.error('Phiên đăng nhập đã hết hạn bảo mật. Vui lòng đăng xuất và đăng nhập lại để đổi mật khẩu.')
      } else if (err.code === 'auth/weak-password') {
        toast.error('Mật khẩu quá yếu, vui lòng chọn mật khẩu phức tạp hơn.')
      } else {
        toast.error(err.message || 'Không thể đặt mật khẩu mới. Vui lòng thử lại.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const content = (
    <div
      className="fixed inset-0 top-0 left-0 right-0 bottom-0 !m-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      style={{ top: 0, left: 0, right: 0, bottom: 0, margin: 0 }}
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-md bg-[#182032] border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-7 text-slate-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        {/* Nút đóng góc phải */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Đóng hộp thoại"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tiêu đề Modal */}
        <div className="text-center mb-6">
          <h3 id="dialog-title" className="text-xl font-bold text-white tracking-tight">
            Đặt mật khẩu mới
          </h3>
        </div>

        {/* Form nhập mật khẩu */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Ô Mật khẩu */}
          <div className="space-y-1.5">
            <Label htmlFor="new-password" className="text-xs text-slate-300 font-medium">
              Mật khẩu
            </Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
                autoComplete="new-password"
                className="h-11 bg-[#101626] border-white/10 text-white placeholder:text-slate-500 rounded-xl pr-10 focus-visible:ring-amber-400 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Ô Xác nhận mật khẩu */}
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password" className="text-xs text-slate-300 font-medium">
              Xác nhận mật khẩu
            </Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                autoComplete="new-password"
                className="h-11 bg-[#101626] border-white/10 text-white placeholder:text-slate-500 rounded-xl pr-10 focus-visible:ring-amber-400 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
                aria-label={showConfirmPassword ? 'Ẩn xác nhận mật khẩu' : 'Hiện xác nhận mật khẩu'}
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Nút hành động */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="h-10 px-6 rounded-lg bg-[#f5c518] hover:bg-[#eab308] text-slate-950 font-bold text-sm shadow-md transition-all active:scale-95"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  Đang lưu...
                </>
              ) : (
                'Đặt mật khẩu'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="h-10 px-6 rounded-lg bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm border-transparent transition-all active:scale-95"
            >
              Đóng
            </Button>
          </div>
        </form>
      </div>
    </div>
  )

  if (typeof document !== 'undefined') {
    return createPortal(content, document.body)
  }

  return content
}

