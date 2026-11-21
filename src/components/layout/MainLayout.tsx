import React from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  ReceiptText,
  Plus,
  PieChart,
  Wallet,
  Menu,
  Tags,
  Target,
  HandCoins,
  FileBarChart,
  Settings,
  X,
  LogOut,
  Users,
  Tag,
  BarChart3,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import { performLogout } from '@/lib/auth/logout'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function MainLayout() {
  const { user, clearAuth } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [isMoreOpen, setIsMoreOpen] = React.useState(false)
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = React.useState(false)

  const handleLogout = async () => {
    setIsLogoutConfirmOpen(false)
    await performLogout(false)
    clearAuth()
    toast.success('Đã đăng xuất thành công')
    navigate('/login', { replace: true })
  }

  const isAdmin = user?.role === 'admin'

  // Primary mobile navigation items
  const mainNav = [
    { name: 'Tổng quan', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Giao dịch', path: '/transactions', icon: ReceiptText },
    { name: 'Thêm', path: '/transactions/new', icon: Plus, isAdd: true },
    { name: 'Ngân sách', path: '/budgets', icon: PieChart },
    { name: 'Ví', path: '/accounts', icon: Wallet },
  ]

  // Extended navigation for drawer / sidebar
  const secondaryNav = [
    { name: 'Danh mục', path: '/categories', icon: Tags },
    { name: 'Mục tiêu', path: '/goals', icon: Target },
    { name: 'Công nợ', path: '/debts', icon: HandCoins },
    { name: 'Báo cáo', path: '/reports', icon: FileBarChart },
    { name: 'Cài đặt', path: '/settings', icon: Settings },
  ]

  // Admin exclusive navigation items
  const adminNav = [
    { name: 'Tổng quan', path: '/admin', icon: LayoutDashboard },
    { name: 'Thành viên', path: '/admin/users', icon: Users },
    { name: 'Danh mục mẫu', path: '/admin/default-categories', icon: Tag },
    { name: 'Cấu hình', path: '/admin/config', icon: Settings },
    { name: 'Thống kê', path: '/admin/stats', icon: BarChart3 },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Desktop Sidebar (lg:flex) */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r bg-card p-4 space-y-6 fixed inset-y-0 left-0 z-30 overflow-y-auto">
        <div className="flex items-center gap-3 px-2 py-1 shrink-0">
          <img src="/monify-mark.svg" alt="Monify" className="w-8 h-8" />
          <span className="text-xl font-bold text-[#0F766E] tracking-tight">Monify</span>
        </div>

        <nav className="flex-1 space-y-1">
          {isAdmin ? (
            <>
              <div className="text-xs font-semibold uppercase text-muted-foreground px-3 mb-2 tracking-wider">
                Quản trị hệ thống
              </div>
              {adminNav.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/admin'}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      )
                    }
                  >
                    <Icon className="w-5 h-5" />
                    {item.name}
                  </NavLink>
                )
              })}
            </>
          ) : (
            <>
              <div className="text-xs font-semibold uppercase text-muted-foreground px-3 mb-2 tracking-wider">
                Tài chính
              </div>
              {mainNav
                .filter((item) => !item.isAdd)
                .concat(secondaryNav)
                .map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                        )
                      }
                    >
                      <Icon className="w-5 h-5" />
                      {item.name}
                    </NavLink>
                  )
                })}
            </>
          )}
        </nav>

        {user && (
          <div className="border-t pt-4 flex items-center justify-between gap-3 px-2 shrink-0 mt-auto">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm shrink-0 overflow-hidden border border-border">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Avatar'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      ;(e.target as HTMLElement).style.display = 'none'
                    }}
                  />
                ) : (
                  user.displayName?.[0]?.toUpperCase() || 'U'
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.displayName || 'Người dùng'}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center shrink-0">
              <button
                type="button"
                onClick={() => setIsLogoutConfirmOpen(true)}
                className="w-11 h-11 rounded-xl inline-flex items-center justify-center p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors touch-target cursor-pointer"
                title="Đăng xuất"
                aria-label="Đăng xuất"
              >
                <LogOut className="w-5 h-5 m-auto" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen lg:pl-64 min-w-0 pb-[max(6rem,calc(env(safe-area-inset-bottom)+5rem))] lg:pb-6">
        {/* Mobile / Tablet Header */}
        <header className="sticky top-0 z-40 bg-card/90 backdrop-blur border-b px-4 py-3 flex items-center justify-between lg:hidden">
          <div className="flex items-center gap-2">
            <img src="/monify-mark.svg" alt="Monify" className="w-7 h-7" />
            <span className="font-bold text-[#0F766E] text-lg">Monify</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMoreOpen(true)}
              className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground touch-target"
              aria-label="Menu mở rộng"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </header>

        {/* Page Container */}
        <main className="flex-1 p-4 md:p-6 max-w-6xl mx-auto w-full">
          <Outlet />
        </main>
      </div>

      {/* Mobile Fixed Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t px-2 py-1 lg:hidden pb-[max(0.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-around">
          {(isAdmin ? adminNav : mainNav).map((item: any) => {
            const Icon = item.icon
            const isCurrent =
              item.path === '/admin'
                ? location.pathname === '/admin'
                : location.pathname.startsWith(item.path)

            if (!isAdmin && item.isAdd) {
              return (
                <NavLink
                  key="add-btn"
                  to="/transactions?action=new"
                  className="flex flex-col items-center justify-center -top-3 relative"
                  aria-label="Thêm giao dịch mới"
                >
                  <div className="w-12 h-12 rounded-full bg-[#0D9488] text-white shadow-lg flex items-center justify-center hover:bg-[#0F766E] active:scale-95 transition-transform">
                    <Plus className="w-7 h-7 stroke-[2.5]" />
                  </div>
                </NavLink>
              )
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  'flex flex-col items-center justify-center py-1 px-2 min-w-[56px] text-xs font-medium rounded-lg touch-target transition-colors',
                  isCurrent ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className={cn('w-5 h-5 mb-0.5', isCurrent && 'stroke-[2.5]')} />
                <span>{item.name}</span>
              </NavLink>
            )
          })}
        </div>
      </nav>

      {/* Mobile Bottom Sheet Drawer for "Khác" (More options) */}
      {isMoreOpen && (
        <div
          className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm lg:hidden flex flex-col justify-end p-3 pb-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))]"
          onClick={() => setIsMoreOpen(false)}
        >
          <div
            className="bg-card w-full rounded-2xl p-5 space-y-4 max-h-[75dvh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-muted rounded-full mx-auto" />
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-semibold text-foreground">Menu mở rộng</h3>
              <button
                type="button"
                onClick={() => setIsMoreOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground touch-target"
                aria-label="Đóng menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {user && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden border border-border">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Avatar'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        ;(e.target as HTMLElement).style.display = 'none'
                      }}
                    />
                  ) : (
                    user.displayName?.[0]?.toUpperCase() || 'U'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate text-foreground">
                    {user.displayName || 'Người dùng'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              {(isAdmin ? adminNav : secondaryNav).map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMoreOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-xl border bg-background hover:bg-accent text-sm font-medium touch-target transition-colors"
                  >
                    <Icon className="w-5 h-5 text-primary shrink-0" />
                    <span>{item.name}</span>
                  </NavLink>
                )
              })}

              <button
                type="button"
                onClick={() => {
                  setIsMoreOpen(false)
                  setIsLogoutConfirmOpen(true)
                }}
                className="flex items-center gap-3 p-3 rounded-xl border border-destructive/20 bg-background hover:bg-destructive/10 text-sm font-medium touch-target col-span-2 text-destructive transition-colors text-left"
              >
                <LogOut className="w-5 h-5 shrink-0" />
                <span>Đăng xuất</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsMoreOpen(false)}
              className="w-full mt-4 py-3 rounded-xl bg-secondary text-secondary-foreground font-medium text-sm touch-target active:scale-[0.98] transition-transform"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* Xác nhận Đăng xuất */}
      <ConfirmDialog
        isOpen={isLogoutConfirmOpen}
        onClose={() => setIsLogoutConfirmOpen(false)}
        onConfirm={handleLogout}
        title="Đăng xuất tài khoản"
        description="Bạn có chắc chắn muốn đăng xuất khỏi Monify?"
        confirmText="Đăng xuất"
        isDestructive={true}
      />
    </div>
  )
}
