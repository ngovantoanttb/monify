import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { adminApi, type AdminStatsResponse } from '@/lib/api/admin'
import { Users, Shield, UserCheck, UserX, Activity, ArrowRight, Settings, Tag, BarChart3, Database } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

export function AdminDashboardPage() {
  const [stats, setStats] = React.useState<AdminStatsResponse['stats'] | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    async function loadStats() {
      try {
        const res = await adminApi.getStats()
        setStats(res.stats)
      } catch {
        toast.error('Không thể tải thông tin thống kê quản trị')
      } finally {
        setIsLoading(false)
      }
    }
    loadStats()
  }, [])

  return (
    <div className="space-y-6 pb-16 md:pb-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Tổng quan Quản trị Hệ thống
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Quản lý người dùng, cấu hình tham số và giám sát toàn hệ thống
        </p>
      </div>

      {/* Thông báo bảo mật Zero Financial Access */}
      <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-3 text-xs text-primary-foreground">
        <Shield className="w-5 h-5 text-primary shrink-0" />
        <span className="text-foreground">
          Hệ thống tuân thủ nguyên tắc <strong>Zero Financial Data Access</strong>: Quản trị viên chỉ quản lý người dùng và cấu hình, không bao giờ có quyền xem hoặc tổng hợp số tiền của người dùng.
        </span>
      </div>

      {/* Thẻ thống kê số lượng */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {/* Tổng người dùng */}
          <Card className="p-4 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Tổng người dùng</span>
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl md:text-2xl font-bold text-foreground">{stats?.totalUsers || 0}</div>
          </Card>

          {/* Đang hoạt động */}
          <Card className="p-4 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Đang hoạt động</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl md:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats?.activeUsers || 0}
            </div>
          </Card>

          {/* Bị khóa */}
          <Card className="p-4 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Tài khoản bị khóa</span>
              <div className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
                <UserX className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl md:text-2xl font-bold text-destructive">{stats?.lockedUsers || 0}</div>
          </Card>

          {/* Phiên hoạt động */}
          <Card className="p-4 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Phiên đăng nhập</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl md:text-2xl font-bold text-amber-600 dark:text-amber-400">
              {stats?.activeSessions || 0}
            </div>
          </Card>
        </div>
      )}

      {/* Điều hướng nhanh các phân hệ quản trị */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-foreground">Phân hệ quản trị</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Quản lý thành viên */}
          <Link
            to="/admin/users"
            className="p-4 rounded-xl border bg-card hover:bg-muted/40 transition-colors space-y-2 group block touch-target"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-foreground">Thành viên</h4>
              <p className="text-xs text-muted-foreground">Khóa, mở khóa, phân quyền quản trị</p>
            </div>
          </Link>

          {/* Danh mục mặc định */}
          <Link
            to="/admin/default-categories"
            className="p-4 rounded-xl border bg-card hover:bg-muted/40 transition-colors space-y-2 group block touch-target"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <Tag className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-foreground">Danh mục mặc định</h4>
              <p className="text-xs text-muted-foreground">Cấu hình danh mục khởi tạo cho người mới</p>
            </div>
          </Link>

          {/* Cấu hình hệ thống */}
          <Link
            to="/admin/config"
            className="p-4 rounded-xl border bg-card hover:bg-muted/40 transition-colors space-y-2 group block touch-target"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Settings className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-foreground">Cấu hình hệ thống</h4>
              <p className="text-xs text-muted-foreground">Ngưỡng cảnh báo ngân sách</p>
            </div>
          </Link>

          {/* Thống kê chi tiết */}
          <Link
            to="/admin/stats"
            className="p-4 rounded-xl border bg-card hover:bg-muted/40 transition-colors space-y-2 group block touch-target"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-foreground">Thống kê số lượng</h4>
              <p className="text-xs text-muted-foreground">Số lượng giao dịch, ví, tăng trưởng</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Thông số dữ liệu hệ thống */}
      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            Quy mô dữ liệu toàn hệ thống
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground">Tổng số ví đã tạo</span>
              <p className="text-base font-bold text-foreground mt-0.5">{stats?.totalAccountsCount || 0}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Tổng lượt giao dịch</span>
              <p className="text-base font-bold text-foreground mt-0.5">{stats?.totalTransactionsCount || 0}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Quản trị viên</span>
              <p className="text-base font-bold text-primary mt-0.5">{stats?.adminUsers || 0}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Thành viên thông thường</span>
              <p className="text-base font-bold text-foreground mt-0.5">{stats?.memberUsers || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

