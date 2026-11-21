import React from 'react'
import { adminApi } from '@/lib/api/admin'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Settings, Save, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { DEFAULT_BUDGET_WARNING_THRESHOLD } from '@shared/constants'

export function AdminConfigPage() {
  const [thresholdPercent, setThresholdPercent] = React.useState<number>(80)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [updatedAt, setUpdatedAt] = React.useState<number | null>(null)

  const loadConfig = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const config = await adminApi.getSystemConfig()
      setThresholdPercent(Math.round(config.budgetWarningThreshold * 100))
      setUpdatedAt(config.updatedAt)
    } catch {
      toast.error('Không thể tải cấu hình hệ thống')
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadConfig()
  }, [loadConfig])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isNaN(thresholdPercent) || thresholdPercent < 50 || thresholdPercent > 100) {
      toast.error('Ngưỡng cảnh báo phải là số nguyên từ 50% đến 100%')
      return
    }

    setIsSaving(true)
    try {
      const thresholdDecimal = thresholdPercent / 100
      await adminApi.updateSystemConfig({ budgetWarningThreshold: thresholdDecimal })
      toast.success('Đã lưu cấu hình hệ thống thành công')
      setUpdatedAt(Date.now())
    } catch (err: any) {
      toast.error(err.message || 'Không thể lưu cấu hình')
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetDefault = () => {
    setThresholdPercent(Math.round(DEFAULT_BUDGET_WARNING_THRESHOLD * 100))
  }

  return (
    <div className="space-y-6 pb-16 md:pb-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8 rounded-lg">
          <Link to="/admin" aria-label="Quay lại Tổng quan">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Cấu hình Hệ thống
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Quản lý các tham số vận hành chung của ứng dụng Monify
          </p>
        </div>
      </div>

      {isLoading ? (
        <Card className="p-6 space-y-4">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-28" />
        </Card>
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          {/* Card Cấu hình Ngân sách */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                <Settings className="w-4 h-4 text-primary" />
                Ngưỡng cảnh báo ngân sách
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Quy định mức chi tiêu trong tháng so với hạn mức để kích hoạt trạng thái "Sắp chạm ngân sách".
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="threshold" className="text-sm font-medium">
                    Ngưỡng cảnh báo (%)
                  </Label>
                  <span className="text-sm font-bold text-primary">{thresholdPercent}%</span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    id="threshold-slider"
                    min="50"
                    max="100"
                    step="5"
                    value={thresholdPercent}
                    onChange={(e) => setThresholdPercent(Number(e.target.value))}
                    className="w-full accent-primary h-2 bg-muted rounded-lg cursor-pointer"
                  />
                  <Input
                    type="number"
                    id="threshold"
                    min="50"
                    max="100"
                    value={thresholdPercent}
                    onChange={(e) => setThresholdPercent(Number(e.target.value))}
                    className="w-20 text-center font-bold"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Phạm vi cho phép: từ <strong>50%</strong> (0.5) đến <strong>100%</strong> (1.0). Giá trị mặc định là <strong>80%</strong>.
                </p>
              </div>

              {/* Box minh họa */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  Cơ chế hoạt động của cảnh báo:
                </div>
                <p>
                  Khi người dùng đặt hạn mức ngân sách cho một danh mục (ví dụ 5.000.000đ), nếu đã chi từ{' '}
                  <strong>{((5000000 * thresholdPercent) / 100).toLocaleString('vi-VN')}đ</strong> ({thresholdPercent}%), thanh tiến độ sẽ đổi sang màu vàng cảnh báo "Sắp chạm ngân sách".
                </p>
              </div>

              {updatedAt && (
                <p className="text-[11px] text-muted-foreground">
                  Lần cập nhật gần nhất: {new Date(updatedAt).toLocaleString('vi-VN')}
                </p>
              )}
            </CardContent>

            <CardFooter className="flex items-center justify-between border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetDefault}
                className="gap-1.5 touch-target"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Về mặc định (80%)
              </Button>

              <Button type="submit" disabled={isSaving} className="gap-1.5 touch-target">
                <Save className="w-4 h-4" />
                {isSaving ? 'Đang lưu...' : 'Lưu cấu hình'}
              </Button>
            </CardFooter>
          </Card>

          {/* Card Thông tin xác thực & chính sách */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Quy định bảo mật & Đăng ký
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <p>
                • <strong>Đăng nhập Google:</strong> Người dùng đăng nhập lần đầu sẽ tự động được cấp vai trò <code>member</code> và khởi tạo hồ sơ cùng bộ danh mục mặc định.
              </p>
              <p>
                • <strong>Phân quyền quản trị:</strong> Chỉ các tài khoản có vai trò <code>admin</code> được phép truy cập và điều chỉnh cấu hình hệ thống này.
              </p>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  )
}

