import React from 'react'
import { adminApi, type AdminStatsResponse } from '@/lib/api/admin'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft,
  Users,
  Shield,
  Activity,
  Wallet,
  ReceiptText,
  UserCheck,
  RefreshCw,
  Database,
  BarChart2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

export function AdminStatsPage() {
  const [stats, setStats] = React.useState<AdminStatsResponse['stats'] | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [lastRefreshed, setLastRefreshed] = React.useState<Date>(new Date())

  const loadStats = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await adminApi.getStats()
      setStats(res.stats)
      setLastRefreshed(new Date())
    } catch {
      toast.error('Không thể tải dữ liệu thống kê')
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadStats()
  }, [loadStats])

  const totalUsers = stats?.totalUsers || 0
  const activeUsers = stats?.activeUsers || 0
  const lockedUsers = stats?.lockedUsers || 0
  const totalAccounts = stats?.totalAccountsCount || 0
  const totalTransactions = stats?.totalTransactionsCount || 0
  const activeSessions = stats?.activeSessions || 0

  const activeRatio = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 100
  const avgTransactionsPerUser = totalUsers > 0 ? (totalTransactions / totalUsers).toFixed(1) : '0'
  const avgAccountsPerUser = totalUsers > 0 ? (totalAccounts / totalUsers).toFixed(1) : '0'

  return (
    <div className="space-y-6 pb-16 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8 rounded-lg">
            <Link to="/admin" aria-label="Quay lại Tổng quan">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Thống kê Hệ thống
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Chỉ số lượng tổng hợp toàn hệ thống (Cập nhật lúc: {lastRefreshed.toLocaleTimeString('vi-VN')})
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadStats}
          disabled={isLoading}
          className="gap-1.5 touch-target self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
      </div>

      {/* Thông báo Zero Financial Data Access */}
      <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-3 text-xs">
        <Shield className="w-5 h-5 text-primary shrink-0" />
        <span className="text-foreground">
          <strong>Nguyên tắc bảo vệ quyền riêng tư:</strong> Trang thống kê chỉ hiển thị các chỉ số lượng (đếm bản ghi, tỷ lệ hoạt động). Tuyệt đối không tổng hợp hoặc hiển thị số tiền của bất kỳ người dùng nào.
        </span>
      </div>

      {/* Lưới chỉ số chính */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {/* Tổng người dùng */}
          <Card className="p-4 space-y-1.5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Người dùng</span>
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-foreground">{totalUsers}</div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <span className="text-emerald-600 font-semibold">{activeUsers} hoạt động</span>
              <span>•</span>
              <span className="text-destructive font-semibold">{lockedUsers} bị khóa</span>
            </div>
          </Card>

          {/* Phiên đăng nhập hợp lệ */}
          <Card className="p-4 space-y-1.5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Phiên đăng nhập</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{activeSessions}</div>
            <div className="text-[11px] text-muted-foreground">Đang duy trì phiên JWT</div>
          </Card>

          {/* Tổng lượt giao dịch */}
          <Card className="p-4 space-y-1.5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Lượt giao dịch</span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <ReceiptText className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalTransactions}</div>
            <div className="text-[11px] text-muted-foreground">Ghi nhận trong RTDB</div>
          </Card>

          {/* Tổng số ví/tài khoản */}
          <Card className="p-4 space-y-1.5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Tài khoản & Ví</span>
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{totalAccounts}</div>
            <div className="text-[11px] text-muted-foreground">Ví tiền mặt, ngân hàng...</div>
          </Card>
        </div>
      )}

      {/* Chi tiết phân bố & Tỷ lệ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card Tỷ lệ người dùng */}
        <Card className="p-5 space-y-4">
          <CardHeader className="p-0">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              Tỷ lệ trạng thái thành viên
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-foreground">Hoạt động bình thường</span>
                <span className="font-bold text-emerald-600">{activeRatio}%</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${activeRatio}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-lg bg-muted/40">
                <span className="text-muted-foreground">Quản trị viên:</span>
                <p className="text-base font-bold text-primary mt-0.5">{stats?.adminUsers || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/40">
                <span className="text-muted-foreground">Thành viên thông thường:</span>
                <p className="text-base font-bold text-foreground mt-0.5">{stats?.memberUsers || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card Tỷ lệ mật độ dữ liệu */}
        <Card className="p-5 space-y-4">
          <CardHeader className="p-0">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-blue-600" />
              Mật độ dữ liệu trung bình
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-border/80">
                <span className="text-muted-foreground">Giao dịch / người dùng</span>
                <p className="text-lg font-bold text-foreground mt-0.5">{avgTransactionsPerUser}</p>
                <span className="text-[10px] text-muted-foreground">bản ghi/user</span>
              </div>
              <div className="p-3 rounded-lg border border-border/80">
                <span className="text-muted-foreground">Ví tiền / người dùng</span>
                <p className="text-lg font-bold text-foreground mt-0.5">{avgAccountsPerUser}</p>
                <span className="text-[10px] text-muted-foreground">ví/user</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-primary/5 text-xs text-muted-foreground flex items-center gap-2">
              <Database className="w-4 h-4 text-primary shrink-0" />
              <span>Chỉ mục Firebase Realtime Database đảm bảo truy vấn tối ưu khi hệ thống mở rộng.</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
