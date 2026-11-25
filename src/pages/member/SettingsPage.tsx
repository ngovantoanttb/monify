import React from 'react'
import { createPortal } from 'react-dom'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { performLogout } from '@/lib/auth/logout'
import { auth, database } from '@/lib/firebase/client'
import { ref, update, remove, get } from 'firebase/database'
import { updateProfile } from 'firebase/auth'
import { transactionsService } from '@/features/transactions/services/transactions'
import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  User,
  Mail,
  Shield,
  LogOut,
  AlertTriangle,
  Sun,
  Moon,
  Laptop,
  Save,
  Lock,
  Camera,
  Trash2,
  Activity,
  ArrowRight,
  Sparkles,
  X,
  KeyRound,
} from 'lucide-react'
import { ChangePasswordDialog } from '@/components/shared/ChangePasswordDialog'
import { format } from 'date-fns'
import { toast } from 'sonner'

const AVATAR_PACKS = [
  { id: 'pack1', name: 'Hệ Tư Tưởng Carry', count: 39 },
  { id: 'pack2', name: 'Oppa Chạy Bằng Cơm', count: 15 },
  { id: 'pack3', name: 'Pháp Sư Trung Hoa', count: 16 },
  { id: 'pack4', name: 'Hào Khí Đông Á', count: 16 },
  { id: 'pack5', name: 'Tây Lông Hệ Real', count: 15 },
  { id: 'pack6', name: 'Meme Chúa Phù Hộ', count: 8 },
]

export function SettingsPage() {
  const { user, setUser, clearAuth } = useAuthStore()
  const { theme, setTheme } = useThemeStore()
  const navigate = useNavigate()

  // Form profile
  const [displayName, setDisplayName] = React.useState(user?.displayName || '')
  const [photoURL, setPhotoURL] = React.useState(user?.photoURL || '')
  const [tempSelectedAvatar, setTempSelectedAvatar] = React.useState(user?.photoURL || '')
  const [isSavingProfile, setIsSavingProfile] = React.useState(false)
  const [isSavingAvatar, setIsSavingAvatar] = React.useState(false)
  const [activityCount, setActivityCount] = React.useState<number | null>(null)
  const [isGalleryOpen, setIsGalleryOpen] = React.useState(false)
  const [activePackId, setActivePackId] = React.useState('pack1')

  // Xóa dữ liệu 2 bước
  const [showDeleteStep1, setShowDeleteStep1] = React.useState(false)
  const [showDeleteStep2, setShowDeleteStep2] = React.useState(false)
  const [confirmInput, setConfirmInput] = React.useState('')
  const [isDeletingData, setIsDeletingData] = React.useState(false)
  const [isChangePasswordOpen, setIsChangePasswordOpen] = React.useState(false)

  React.useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '')
      setPhotoURL(user.photoURL || '')
    }
  }, [user])

  // Tải số lượng giao dịch của người dùng
  React.useEffect(() => {
    if (user?.uid) {
      transactionsService
        .getAllTransactions(user.uid)
        .then((txs) => setActivityCount(txs.length))
        .catch(() => setActivityCount(0))
    }
  }, [user?.uid])

  // Mở modal đổi ảnh đại diện
  const handleOpenGallery = () => {
    setTempSelectedAvatar(photoURL || '')
    const matchedPack = AVATAR_PACKS.find((p) => photoURL?.includes(`/avatars/${p.id}/`))
    if (matchedPack) {
      setActivePackId(matchedPack.id)
    }
    setIsGalleryOpen(true)
  }

  // Lưu ảnh đại diện từ modal
  const handleSaveAvatarModal = async () => {
    if (!tempSelectedAvatar) {
      setIsGalleryOpen(false)
      return
    }

    if (!user) {
      setPhotoURL(tempSelectedAvatar)
      setIsGalleryOpen(false)
      return
    }

    setIsSavingAvatar(true)
    try {
      const userRef = ref(database, `users/${user.uid}`)
      const now = Date.now()
      const newPhotoURL = tempSelectedAvatar.trim()

      await update(userRef, {
        photoURL: newPhotoURL,
        updatedAt: now,
      })

      if (auth.currentUser) {
        try {
          await updateProfile(auth.currentUser, {
            photoURL: newPhotoURL,
          })
        } catch {
          // Bỏ qua lỗi cập nhật auth cục bộ
        }
      }

      setUser({
        ...user,
        photoURL: newPhotoURL,
        updatedAt: now,
      })
      setPhotoURL(newPhotoURL)
      setIsGalleryOpen(false)
      toast.success('Đã cập nhật ảnh đại diện thành công')
    } catch (err: any) {
      toast.error(err.message || 'Không thể cập nhật ảnh đại diện')
    } finally {
      setIsSavingAvatar(false)
    }
  }

  // Xóa ảnh đại diện (trở về chữ cái đầu)
  const handleRemoveAvatar = () => {
    setPhotoURL('')
    toast.info('Đã xóa ảnh đại diện. Nhấn "Lưu hồ sơ" để áp dụng.')
  }

  // Lưu hồ sơ cá nhân
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    const trimmedName = displayName.trim()
    if (!trimmedName || trimmedName.length < 1 || trimmedName.length > 60) {
      toast.error('Tên hiển thị phải từ 1 đến 60 ký tự')
      return
    }

    setIsSavingProfile(true)
    try {
      const userRef = ref(database, `users/${user.uid}`)
      const now = Date.now()
      const newPhotoURL = photoURL ? photoURL.trim() : null
      const updates = {
        displayName: trimmedName,
        photoURL: newPhotoURL,
        updatedAt: now,
      }

      await update(userRef, updates)

      // Cập nhật Firebase Auth profile nếu có
      if (auth.currentUser) {
        try {
          await updateProfile(auth.currentUser, {
            displayName: trimmedName,
            photoURL: newPhotoURL || '',
          })
        } catch {
          // Bỏ qua lỗi cập nhật auth cục bộ
        }
      }

      // Cập nhật auth store
      setUser({
        ...user,
        displayName: trimmedName,
        photoURL: newPhotoURL,
        updatedAt: now,
      })

      toast.success('Đã cập nhật thông tin hồ sơ thành công')
    } catch (err: any) {
      toast.error(err.message || 'Không thể cập nhật hồ sơ')
    } finally {
      setIsSavingProfile(false)
    }
  }

  // Đăng xuất an toàn tuyệt đối
  const handleLogout = async (allDevices: boolean = false) => {
    try {
      await performLogout(allDevices)
      clearAuth()
      toast.success(allDevices ? 'Đã đăng xuất khỏi mọi thiết bị' : 'Đã đăng xuất thành công')
      navigate('/login', { replace: true })
    } catch {
      toast.error('Lỗi khi đăng xuất, vui lòng thử lại')
    }
  }

  // Bước 2: Thực hiện xóa dữ liệu cá nhân
  const handleExecuteDeleteData = async () => {
    if (!user) return
    if (confirmInput.trim() !== 'XÓA DỮ LIỆU') {
      toast.error('Vui lòng gõ chính xác cụm từ "XÓA DỮ LIỆU" để xác nhận')
      return
    }

    setIsDeletingData(true)
    try {
      // 1. Xóa toàn bộ dữ liệu tài chính trong financial/{uid}
      const financialRef = ref(database, `financial/${user.uid}`)
      await remove(financialRef)

      // 2. Khởi tạo lại danh mục mặc định từ defaultCategories
      const defaultCatsSnap = await get(ref(database, 'defaultCategories'))
      if (defaultCatsSnap.exists()) {
        const catUpdates: Record<string, unknown> = {}
        const now = Date.now()
        defaultCatsSnap.forEach((child) => {
          const val = child.val()
          catUpdates[`categories/${child.key}`] = {
            ...val,
            createdAt: now,
            updatedAt: now,
          }
        })
        await update(ref(database, `financial/${user.uid}`), catUpdates)
      }

      toast.success('Đã xóa toàn bộ dữ liệu tài chính và làm mới danh mục mặc định')
      setShowDeleteStep1(false)
      setShowDeleteStep2(false)
      setConfirmInput('')
    } catch (err: any) {
      toast.error(err.message || 'Không thể xóa dữ liệu')
    } finally {
      setIsDeletingData(false)
    }
  }

  return (
    <div className="space-y-6 pb-16 md:pb-6 max-w-2xl">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Cài đặt Tài khoản
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Quản lý thông tin cá nhân, giao diện và bảo mật tài khoản
        </p>
      </div>

      {/* Card 1: Hồ sơ cá nhân */}
      <Card>
        <form onSubmit={handleSaveProfile}>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Thông tin hồ sơ
            </CardTitle>
            <CardDescription className="text-xs">
              Cập nhật tên hiển thị và hình ảnh đại diện của bạn
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Ảnh đại diện & Tải ảnh */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/70">
              {/* Vòng tròn Avatar với nút Camera - Bấm vào mở modal đổi ảnh */}
              <div
                onClick={handleOpenGallery}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleOpenGallery()
                  }
                }}
                tabIndex={0}
                role="button"
                className="relative group shrink-0 self-start sm:self-center cursor-pointer rounded-full focus:outline-none"
                title="Nhấn để đổi ảnh đại diện"
                aria-label="Đổi ảnh đại diện"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl sm:text-2xl overflow-hidden border-2 border-primary/20 shadow-inner group-hover:border-primary/50 transition-all">
                  {photoURL ? (
                    <img
                      src={photoURL}
                      alt={displayName || 'Avatar'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={() => setPhotoURL('')}
                    />
                  ) : (
                    displayName?.[0]?.toUpperCase() || 'U'
                  )}
                </div>

                {/* Nút camera hover overlay */}
                <div
                  className="absolute inset-0 rounded-full bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs"
                >
                  <Camera className="w-5 h-5" />
                  <span className="text-[10px] font-medium mt-0.5">Đổi ảnh</span>
                </div>
              </div>

              {/* Thông tin & nút thao tác */}
              <div className="flex-1 min-w-0 space-y-2">
                <div>
                  <h4 className="text-sm font-semibold text-foreground truncate">
                    {displayName || 'Người dùng'}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant={user?.role === 'admin' ? 'default' : 'secondary'} className="text-[10px]">
                      {user?.role === 'admin' ? 'Quản trị viên' : 'Thành viên'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">• Hoạt động</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleOpenGallery}
                    className="h-8 text-xs gap-1.5 touch-target"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Bộ sưu tập ảnh
                  </Button>
                  {photoURL && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveAvatar}
                      className="h-8 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1 touch-target"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Gỡ ảnh
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Email (Chỉ đọc) */}
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5 text-muted-foreground">
                <Mail className="w-3.5 h-3.5" />
                Địa chỉ Email (Chỉ đọc)
              </Label>
              <div className="relative">
                <Input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-muted/50 text-muted-foreground cursor-not-allowed pr-8 text-sm"
                />
                <Lock className="w-3.5 h-3.5 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Tên hiển thị */}
            <div className="space-y-1.5">
              <Label htmlFor="displayName" className="text-xs">
                Tên hiển thị
              </Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Nhập tên của bạn"
                maxLength={60}
                className="text-sm"
              />
            </div>
          </CardContent>

          <CardFooter className="flex justify-end border-t border-border pt-4">
            <Button type="submit" disabled={isSavingProfile} className="gap-1.5 touch-target">
              <Save className="w-4 h-4" />
              {isSavingProfile ? 'Đang lưu...' : 'Lưu hồ sơ'}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Card 2: Hoạt động & Thông tin tài khoản */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Hoạt động tài khoản
          </CardTitle>
          <CardDescription className="text-xs">
            Theo dõi trạng thái xác thực và các hoạt động của tài khoản trên Monify
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-1">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                Phương thức đăng nhập
              </span>
              <div className="flex items-center gap-2 pt-0.5">
                {user?.providerId === 'google.com' ||
                auth.currentUser?.providerData?.some((p) => p.providerId === 'google.com') ? (
                  <>
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                    <span className="text-xs font-semibold text-foreground">Tài khoản Google</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-xs font-semibold text-foreground">Email & Mật khẩu</span>
                  </>
                )}
              </div>
              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsChangePasswordOpen(true)}
                  className="h-8 text-xs gap-1.5 w-full sm:w-auto"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                  Đặt mật khẩu mới
                </Button>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-1">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                Trạng thái hoạt động
              </span>
              <div className="flex items-center gap-2 pt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Đang hoạt động bình thường
                </span>
                <Badge variant="secondary" className="text-[10px] ml-auto">
                  {user?.role === 'admin' ? 'Quản trị viên' : 'Thành viên'}
                </Badge>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-1">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                Thời gian tham gia
              </span>
              <p className="text-xs font-medium text-foreground pt-0.5">
                {user?.createdAt ? format(new Date(user.createdAt), 'dd/MM/yyyy HH:mm') : 'Mới tham gia'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-1">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                Tổng hoạt động giao dịch
              </span>
              <div className="flex items-center justify-between pt-0.5">
                <span className="text-xs font-semibold text-foreground">
                  {activityCount !== null ? `${activityCount} giao dịch đã ghi nhận` : 'Đang tải...'}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/transactions')}
                  className="h-6 px-2 text-[11px] text-primary hover:text-primary hover:bg-primary/10 -mr-1"
                >
                  Xem chi tiết
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Giao diện & Chủ đề */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Sun className="w-4 h-4 text-primary" />
            Giao diện ứng dụng
          </CardTitle>
          <CardDescription className="text-xs">
            Chọn chế độ hiển thị sáng, tối hoặc tự động đồng bộ theo hệ điều hành
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2.5">
            {(
              [
                { mode: 'light', label: 'Sáng', icon: Sun },
                { mode: 'dark', label: 'Tối', icon: Moon },
                { mode: 'system', label: 'Hệ thống', icon: Laptop },
              ] as const
            ).map((item) => {
              const Icon = item.icon
              const isSelected = theme === item.mode
              return (
                <button
                  key={item.mode}
                  type="button"
                  onClick={() => setTheme(item.mode)}
                  className={`flex flex-col items-center justify-center p-3.5 rounded-xl border transition-all touch-target ${
                    isSelected
                      ? 'border-primary bg-primary/5 text-primary font-semibold shadow-sm'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }`}
                >
                  <Icon className="w-5 h-5 mb-1.5" />
                  <span className="text-xs">{item.label}</span>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Phiên đăng nhập & Đăng xuất */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Phiên đăng nhập & Bảo mật
          </CardTitle>
          <CardDescription className="text-xs">
            Quản lý việc đăng xuất an toàn trên thiết bị hiện tại hoặc trên toàn bộ các thiết bị
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 rounded-xl bg-muted/40 text-xs text-muted-foreground space-y-1">
            <p>• Phiên đăng nhập được mã hóa an toàn qua <strong>httpOnly cookie</strong>.</p>
            <p>• Khi đăng xuất khỏi mọi thiết bị, toàn bộ phiên JWT trên điện thoại, máy tính sẽ bị thu hồi ngay lập tức.</p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 border-t border-border pt-4">
          <Button
            variant="outline"
            onClick={() => handleLogout(false)}
            className="gap-2 touch-target"
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất thiết bị này
          </Button>
          <Button
            variant="destructive"
            onClick={() => handleLogout(true)}
            className="gap-2 touch-target"
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất mọi thiết bị
          </Button>
        </CardFooter>
      </Card>

      {/* Card 4: Vùng nguy hiểm - Xóa dữ liệu cá nhân (2 bước) */}
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-destructive flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Vùng nguy hiểm
          </CardTitle>
          <CardDescription className="text-xs">
            Xóa vĩnh viễn toàn bộ ví, giao dịch, ngân sách, mục tiêu và công nợ. Tài khoản đăng nhập và hồ sơ cá nhân sẽ được giữ lại.
          </CardDescription>
        </CardHeader>
        <CardFooter className="border-t border-destructive/20 pt-4 flex justify-end">
          <Button
            variant="destructive"
            onClick={() => setShowDeleteStep1(true)}
            className="touch-target"
          >
            Xóa toàn bộ dữ liệu tài chính
          </Button>
        </CardFooter>
      </Card>

      {/* Hộp thoại Bước 1: Cảnh báo xóa dữ liệu */}
      {showDeleteStep1 &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 !m-0 z-[100] w-screen h-screen bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={() => setShowDeleteStep1(false)}
          >
            <div
              className="bg-card rounded-2xl p-6 space-y-4 max-w-md w-full border shadow-xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 text-destructive">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold">Xác nhận xóa dữ liệu (Bước 1/2)</h3>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Hành động này sẽ <strong>xóa vĩnh viễn không thể khôi phục</strong> toàn bộ dữ liệu tài chính của bạn, bao gồm:
              </p>
              <ul className="text-xs list-disc list-inside text-muted-foreground space-y-1 pl-1">
                <li>Tất cả tài khoản và số dư ví</li>
                <li>Toàn bộ lịch sử giao dịch thu, chi, chuyển ví</li>
                <li>Hạn mức ngân sách các tháng</li>
                <li>Mục tiêu tiết kiệm và các khoản công nợ</li>
              </ul>
              <p className="text-xs text-destructive font-medium">
                Hệ thống sẽ làm sạch nhánh tài chính và nạp lại bộ danh mục mặc định để bạn bắt đầu lại từ đầu.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowDeleteStep1(false)}>
                  Hủy bỏ
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setShowDeleteStep1(false)
                    setShowDeleteStep2(true)
                  }}
                >
                  Tiếp tục đến bước 2
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Hộp thoại Bước 2: Nhập cụm từ xác nhận */}
      {showDeleteStep2 &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 !m-0 z-[100] w-screen h-screen bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={() => setShowDeleteStep2(false)}
          >
            <div
              className="bg-card rounded-2xl p-6 space-y-4 max-w-md w-full border shadow-xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 text-destructive">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold">Xác nhận lần cuối (Bước 2/2)</h3>
              </div>

              <p className="text-xs text-muted-foreground">
                Để xác nhận chắc chắn, vui lòng gõ chính xác cụm từ <strong className="text-destructive font-bold">XÓA DỮ LIỆU</strong> vào ô bên dưới:
              </p>

              <Input
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="XÓA DỮ LIỆU"
                className="text-center font-bold tracking-widest text-destructive"
                autoFocus
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteStep2(false)
                    setConfirmInput('')
                  }}
                  disabled={isDeletingData}
                >
                  Hủy bỏ
                </Button>
                <Button
                  variant="destructive"
                  disabled={confirmInput.trim() !== 'XÓA DỮ LIỆU' || isDeletingData}
                  onClick={handleExecuteDeleteData}
                >
                  {isDeletingData ? 'Đang xóa...' : 'Xác nhận xóa vĩnh viễn'}
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Modal Đổi ảnh đại diện */}
      {isGalleryOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 !m-0 z-[100] w-screen h-screen bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
            onClick={() => {
              setTempSelectedAvatar(photoURL || '')
              setIsGalleryOpen(false)
            }}
          >
            <div
              className="bg-[#181f33] text-white rounded-2xl p-5 sm:p-6 max-w-xl w-full border border-white/10 shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header: Tiêu đề + Nút Đóng */}
              <div className="flex items-center justify-between pb-2 shrink-0">
                <h3 className="text-xl font-bold text-white tracking-wide">
                  Đổi ảnh đại diện
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setTempSelectedAvatar(photoURL || '')
                    setIsGalleryOpen(false)
                  }}
                  className="text-white/60 hover:text-white p-1 rounded-md transition-colors"
                  aria-label="Đóng"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Danh sách tab gói ảnh */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 pt-2 pb-2 shrink-0">
                {AVATAR_PACKS.map((pack) => {
                  const isActive = activePackId === pack.id
                  return (
                    <button
                      key={pack.id}
                      type="button"
                      onClick={() => setActivePackId(pack.id)}
                      className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                        isActive
                          ? 'border border-white text-white bg-transparent shadow-sm'
                          : 'text-slate-400 hover:text-white bg-transparent border border-transparent'
                      }`}
                    >
                      {pack.name}
                    </button>
                  )
                })}
              </div>

              {/* Lưới ảnh đại diện của gói đang chọn (5 cột như ảnh mẫu) */}
              <div className="flex-1 overflow-y-auto pr-1 my-3 min-h-0 scrollbar-thin scrollbar-thumb-white/20">
                {(() => {
                  const currentPack = AVATAR_PACKS.find((p) => p.id === activePackId) ?? AVATAR_PACKS[0]!
                  const count = currentPack.count
                  const packId = currentPack.id
                  const items = Array.from({ length: count }, (_, i) => {
                    const numStr = String(i + 1).padStart(2, '0')
                    return `/images/avatars/${packId}/${numStr}.jpg`
                  })

                  return (
                    <div className="grid grid-cols-5 gap-2 sm:gap-2.5">
                      {items.map((src) => {
                        const isSelected = tempSelectedAvatar === src
                        return (
                          <button
                            key={src}
                            type="button"
                            onClick={() => setTempSelectedAvatar(src)}
                            className={`relative aspect-square rounded-md sm:rounded-lg overflow-hidden border-2 transition-all duration-150 cursor-pointer group ${
                              isSelected
                                ? 'border-[#f5c518] ring-2 ring-[#f5c518]/70 scale-[1.02] shadow-lg'
                                : 'border-transparent hover:border-white/40 hover:scale-[1.01]'
                            }`}
                          >
                            <img
                              src={src}
                              alt="Avatar option"
                              className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-200"
                              loading="lazy"
                            />
                          </button>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>

              {/* Footer: Nút Lưu lại (vàng) & Đóng (trắng) */}
              <div className="flex items-center justify-end gap-3 pt-3 shrink-0">
                <button
                  type="button"
                  disabled={isSavingAvatar}
                  onClick={handleSaveAvatarModal}
                  className="h-10 px-6 rounded-lg bg-[#f5c518] hover:bg-[#eab308] text-slate-950 font-bold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isSavingAvatar ? 'Đang lưu...' : 'Lưu lại'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTempSelectedAvatar(photoURL || '')
                    setIsGalleryOpen(false)
                  }}
                  className="h-10 px-6 rounded-lg bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Modal Đặt mật khẩu mới */}
      <ChangePasswordDialog
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </div>
  )
}
