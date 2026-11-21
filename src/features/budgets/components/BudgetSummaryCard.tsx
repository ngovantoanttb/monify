import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/finance'
import { Wallet, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react'

interface BudgetSummaryCardProps {
  totalBudget: number
  totalSpent: number
  totalRemaining: number
  overallPercentage: number
  exceededCount: number
  warningCount: number
  normalCount: number
  unbudgetedCount: number
}

export function BudgetSummaryCard({
  totalBudget,
  totalSpent,
  totalRemaining,
  overallPercentage,
  exceededCount,
  warningCount,
  normalCount,
  unbudgetedCount,
}: BudgetSummaryCardProps) {
  const isOverBudget = totalSpent > totalBudget && totalBudget > 0
  const progressPercent = totalBudget > 0 ? Math.min(100, Math.round(overallPercentage * 100)) : 0

  let indicatorColor = 'bg-primary'
  if (isOverBudget) {
    indicatorColor = 'bg-destructive'
  } else if (overallPercentage >= 0.8) {
    indicatorColor = 'bg-amber-500'
  }

  return (
    <Card className="border-border/60 shadow-xs bg-gradient-to-br from-card to-card/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Tổng quan ngân sách tháng</CardTitle>
              <p className="text-xs text-muted-foreground">Theo dõi tổng hạn mức và mức chi tiêu</p>
            </div>
          </div>
          {totalBudget > 0 && (
            <Badge
              variant={isOverBudget ? 'destructive' : overallPercentage >= 0.8 ? 'warning' : 'outline'}
              className="text-xs font-medium"
            >
              {isOverBudget ? 'Vượt ngân sách' : `${(overallPercentage * 100).toFixed(0)}%`}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 py-1">
          <div className="space-y-0.5">
            <span className="text-xs text-muted-foreground">Tổng hạn mức</span>
            <p className="text-sm sm:text-base font-bold text-foreground truncate">
              {formatCurrency(totalBudget)}
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="text-xs text-muted-foreground">Đã chi tiêu</span>
            <p
              className={`text-sm sm:text-base font-bold truncate ${
                isOverBudget ? 'text-destructive' : 'text-foreground'
              }`}
            >
              {formatCurrency(totalSpent)}
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="text-xs text-muted-foreground">
              {totalRemaining >= 0 ? 'Còn lại' : 'Vượt quá'}
            </span>
            <p
              className={`text-sm sm:text-base font-bold truncate ${
                totalRemaining >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
              }`}
            >
              {formatCurrency(Math.abs(totalRemaining))}
            </p>
          </div>
        </div>

        {totalBudget > 0 ? (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Tiến độ chi tiêu tổng thể</span>
              <span className="font-medium text-foreground">
                {(overallPercentage * 100).toFixed(1)}%
              </span>
            </div>
            <Progress value={progressPercent} indicatorClassName={indicatorColor} className="h-3" />
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-muted/40 text-center text-xs text-muted-foreground">
            Chưa có danh mục nào được đặt hạn mức trong tháng này.
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          {exceededCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              {exceededCount} vượt hạn mức
            </span>
          )}
          {warningCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              {warningCount} sắp chạm ngưỡng
            </span>
          )}
          {normalCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {normalCount} trong ngân sách
            </span>
          )}
          {unbudgetedCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {unbudgetedCount} chưa đặt
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

