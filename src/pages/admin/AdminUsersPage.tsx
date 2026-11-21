import React from 'react'
import { adminApi } from '@/lib/api/admin'
import { useAuthStore } from '@/stores/auth'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { Pagination } from '@/components/shared/Pagination'
import { Users, Search, Lock, Unlock, Shield, ShieldAlert, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import type { UserProfile, UserRole, UserStatus } from '@shared/types'

export function AdminUsersPage() {
  const { user: currentAdmin } = useAuthStore()

  const [users, setUsers] = React.useState<UserProfile[]>([])
  const [total, setTotal] = React.useState(0)
  const [page, setPage] = React.useState(1)
  const [totalPages, setTotalPages] = React.useState(1)
  const [isLoading, setIsLoading] = React.useState(true)

  const [search, setSearch] = React.useState('')
  const [roleFilter, setRoleFilter] = React.useState('all')
  const [statusFilter, setStatusFilter] = React.useState('all')

  const [statusDialogUser, setStatusDialogUser] = React.useState<UserProfile | null>(null)
  const [roleDialogUser, setRoleDialogUser] = React.useState<UserProfile | null>(null)

  const loadUsers = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await adminApi.getUsers({
        page,
        size: 15,
        search,
        role: roleFilter,
        status: statusFilter,
      })
      setUsers(res.users)
      setTotal(res.total)
      setTotalPages(res.totalPages)
    } catch {
      toast.error('Không thể tải danh sách thành viên')
    } finally {
      setIsLoading(false)
    }
  }, [page, search, roleFilter, statusFilter])

  React.useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const handleToggleStatus = async () => {
    if (!statusDialogUser) return
    const nextStatus: UserStatus = statusDialogUser.status === 'active' ? 'locked' : 'active'
    try {
      await adminApi.updateUserStatus(statusDialogUser.uid, nextStatus)
      toast.success(
        nextStatus === 'locked'
          ? `Đã khóa tài khoản ${statusDialogUser.displayName}`
          : `Đã mở khóa tài khoản ${statusDialogUser.displayName}`
      )
      setStatusDialogUser(null)
      await loadUsers()
    } catch (err: any) {
      toast.error(err.message || 'Không thể cập nhật trạng thái')
    }
  }

  const handleToggleRole = async () => {
    if (!roleDialogUser) return
    const nextRole: UserRole = roleDialogUser.role === 'admin' ? 'member' : 'admin'
    try {
      await adminApi.updateUserRole(roleDialogUser.uid, nextRole)
      toast.success(
        nextRole === 'admin'
          ? `Đã cấp quyền Quản trị viên cho ${roleDialogUser.displayName}`
          : `Đã chuyển ${roleDialogUser.displayName} về Thành viên`
      )
      setRoleDialogUser(null)
      await loadUsers()
    } catch (err: any) {
      toast.error(err.message || 'Không thể đổi vai trò')
    }
  }

  return (
    <div className="space-y-5 pb-16 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8 rounded-lg">
            <Link to="/admin" aria-label="Quay lại Tổng quan">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Quản lý Thành viên
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Tổng số {total} tài khoản trong hệ thống
            </p>
          </div>
        </div>
      </div>

      {/* Bộ lọc và tìm kiếm */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Tìm theo tên, email, uid..."
            className="pl-9 h-10 rounded-xl text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Lọc vai trò */}
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value)
              setPage(1)
            }}
            className="h-10 rounded-xl border bg-background px-3 text-xs font-medium text-foreground focus-visible:outline-none"
          >
            <option value="all">Tất cả vai trò</option>
            <option value="member">Thành viên</option>
            <option value="admin">Quản trị viên</option>
          </select>

          {/* Lọc trạng thái */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            className="h-10 rounded-xl border bg-background px-3 text-xs font-medium text-foreground focus-visible:outline-none"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="locked">Bị khóa</option>
          </select>
        </div>
      </div>

      {/* Danh sách người dùng */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Không tìm thấy người dùng"
          description="Không có tài khoản nào phù hợp với bộ lọc tìm kiếm hiện tại."
        />
      ) : (
        <div className="space-y-3">
          {users.map((u) => {
            const isSelf = u.uid === currentAdmin?.uid
            const isLocked = u.status === 'locked'
            const isAdmin = u.role === 'admin'

            return (
              <Card
                key={u.uid}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-border/70 hover:shadow-xs transition-shadow"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center shrink-0 overflow-hidden border border-border">
                    {u.photoURL ? (
                      <img
                        src={u.photoURL}
                        alt={u.displayName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          ;(e.target as HTMLElement).style.display = 'none'
                        }}
                      />
                    ) : (
                      u.displayName?.slice(0, 1).toUpperCase() || 'U'
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm text-foreground truncate">
                        {u.displayName || 'Chưa đặt tên'}
                      </h4>
                      {isSelf && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 text-primary border-primary/30">
                          Bạn
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant={isAdmin ? 'default' : 'secondary'}
                        className={`text-[10px] px-1.5 py-0 ${isAdmin ? 'bg-primary' : ''}`}
                      >
                        {isAdmin ? 'Admin' : 'Member'}
                      </Badge>
                      <Badge
                        variant={isLocked ? 'destructive' : 'outline'}
                        className={`text-[10px] px-1.5 py-0 ${
                          !isLocked ? 'text-emerald-600 border-emerald-300 dark:border-emerald-800' : ''
                        }`}
                      >
                        {isLocked ? 'Bị khóa' : 'Hoạt động'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                  {/* Nút Khóa / Mở khóa */}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isSelf}
                    onClick={() => setStatusDialogUser(u)}
                    className={`h-8 px-2.5 text-xs touch-target ${
                      isLocked
                        ? 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
                        : 'text-destructive hover:text-destructive hover:bg-destructive/10'
                    }`}
                  >
                    {isLocked ? (
                      <>
                        <Unlock className="w-3.5 h-3.5 mr-1" />
                        Mở khóa
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 mr-1" />
                        Khóa
                      </>
                    )}
                  </Button>

                  {/* Nút Đổi vai trò */}
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isSelf}
                    onClick={() => setRoleDialogUser(u)}
                    className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground touch-target"
                  >
                    {isAdmin ? (
                      <>
                        <ShieldAlert className="w-3.5 h-3.5 mr-1 text-amber-500" />
                        Hạ xuống Member
                      </>
                    ) : (
                      <>
                        <Shield className="w-3.5 h-3.5 mr-1 text-primary" />
                        Lên Admin
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            )
          })}

          {/* Phân trang dùng chung */}
          <div className="pt-4 border-t border-border flex flex-col items-center justify-center gap-2">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        </div>
      )}

      {/* Xác nhận Khóa / Mở khóa */}
      <ConfirmDialog
        isOpen={!!statusDialogUser}
        onClose={() => setStatusDialogUser(null)}
        onConfirm={handleToggleStatus}
        title={statusDialogUser?.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
        description={
          statusDialogUser?.status === 'active'
            ? `Bạn có chắc chắn muốn khóa tài khoản của "${statusDialogUser?.displayName}" (${statusDialogUser?.email})? Người này sẽ bị đăng xuất khỏi mọi thiết bị và không thể đăng nhập.`
            : `Mở khóa tài khoản cho "${statusDialogUser?.displayName}" (${statusDialogUser?.email})? Người này sẽ có thể đăng nhập lại bình thường.`
        }
        confirmText={statusDialogUser?.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa'}
        isDestructive={statusDialogUser?.status === 'active'}
      />

      {/* Xác nhận Đổi vai trò */}
      <ConfirmDialog
        isOpen={!!roleDialogUser}
        onClose={() => setRoleDialogUser(null)}
        onConfirm={handleToggleRole}
        title={roleDialogUser?.role === 'admin' ? 'Hạ quyền Quản trị viên' : 'Cấp quyền Quản trị viên'}
        description={
          roleDialogUser?.role === 'admin'
            ? `Bạn có chắc chắn muốn hạ quyền Quản trị viên của "${roleDialogUser?.displayName}" về Thành viên? Phiên hiện tại của họ sẽ bị thu hồi để cập nhật quyền.`
            : `Bạn có chắc chắn muốn nâng quyền tài khoản "${roleDialogUser?.displayName}" thành Quản trị viên hệ thống? Họ sẽ có toàn quyền quản trị người dùng và cấu hình.`
        }
        confirmText={roleDialogUser?.role === 'admin' ? 'Hạ xuống Member' : 'Cấp quyền Admin'}
        isDestructive={roleDialogUser?.role === 'admin'}
      />
    </div>
  )
}

