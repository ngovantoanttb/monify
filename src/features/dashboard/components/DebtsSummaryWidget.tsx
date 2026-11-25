import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { evaluateDebtStatus, formatCurrency, getMonthInterval } from '@/lib/finance'
import { AlertCircle, ArrowDownLeft, ArrowRight, ArrowUpRight, HandCoins } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Debt, DebtHistory } from '@shared/types'

interface DebtsSummaryWidgetProps {
  debts: Debt[]
  debtHistories: DebtHistory[]
  year: number
  month: number
}

export function DebtsSummaryWidget({
  debts,
  debtHistories,
  year,
  month,
}: DebtsSummaryWidgetProps) {
  let borrowedPrincipal = 0
  let borrowedPaid = 0
  let lentPrincipal = 0
  let lentPaid = 0
  let unsettledCount = 0
  let overdueCount = 0

  debts.forEach((d) => {
    const { status } = evaluateDebtStatus(d)
    if (status !== 'settled') unsettledCount++
    if (status === 'overdue') overdueCount++

    if (d.kind === 'borrowed') {
      borrowedPrincipal += d.principal
      borrowedPaid += d.paidAmount
    } else {
      lentPrincipal += d.principal
      lentPaid += d.paidAmount
    }
  })

  const borrowedRemaining = Math.max(0, borrowedPrincipal - borrowedPaid)
  const lentRemaining = Math.max(0, lentPrincipal - lentPaid)
  const borrowedProgress =
    borrowedPrincipal > 0 ? Math.min(100, Math.round((borrowedPaid / borrowedPrincipal) * 100)) : 0
  const lentProgress =
    lentPrincipal > 0 ? Math.min(100, Math.round((lentPaid / lentPrincipal) * 100)) : 0

  // Thống kê biến động công nợ trong tháng đang chọn
  const monthInterval = getMonthInterval(year, month)
  const startMs = monthInterval.start.getTime()
  const endMs = monthInterval.end.getTime()

  let monthBorrowed = 0
  let monthLent = 0
  let monthRepaid = 0
  let monthCollected = 0

  debtHistories.forEach((h) => {
    if (h.createdAt < startMs || h.createdAt > endMs) return
    if (h.type === 'initial_borrow') {
      monthBorrowed += h.amount
    } else if (h.type === 'initial_lend') {
      monthLent += h.amount
    } else if (h.type === 'repay' || h.type === 'settle_repay') {
      monthRepaid += h.amount
    } else if (h.type === 'collect' || h.type === 'settle_collect') {
      monthCollected += h.amount
    }
  })

  return (
    <Card className="border-border/70 shadow-xs">
      <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
            <HandCoins className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base font-semibold">Thống kê Công nợ (Vay & Trả)</CardTitle>
              {overdueCount > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {overdueCount} quá hạn
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {debts.length === 0
                ? 'Chưa có khoản công nợ nào'
                : `${unsettledCount} khoản chưa tất toán / ${debts.length} tổng khoản`}
            </p>
          </div>
        </div>

        <Link
          to="/debts"
          className="text-xs text-primary hover:underline flex items-center gap-1 font-medium shrink-0"
        >
          <span>Chi tiết</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Tổng hợp dư nợ phải trả & phải thu */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Tôi vay (Phải trả) */}
          <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                <ArrowDownLeft className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                Tiền tôi vay (Phải trả)
              </span>
              <span className="text-[11px] font-medium text-muted-foreground">
                {borrowedProgress}% đã trả
              </span>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Tổng đã vay:</span>
                <span className="font-semibold text-foreground">{formatCurrency(borrowedPrincipal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Đã trả nợ:</span>
                <span className="font-medium text-foreground">{formatCurrency(borrowedPaid)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-amber-500/15">
                <span className="font-semibold text-foreground">Còn phải trả:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {formatCurrency(borrowedRemaining)}
                </span>
              </div>
            </div>

            <Progress value={borrowedProgress} indicatorClassName="bg-amber-500" className="h-1.5" />
          </div>

          {/* Tôi cho vay (Phải thu) */}
          <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Tiền cho vay (Phải thu)
              </span>
              <span className="text-[11px] font-medium text-muted-foreground">
                {lentProgress}% đã thu
              </span>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Tổng cho vay:</span>
                <span className="font-semibold text-foreground">{formatCurrency(lentPrincipal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Đã thu hồi:</span>
                <span className="font-medium text-foreground">{formatCurrency(lentPaid)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-emerald-500/15">
                <span className="font-semibold text-foreground">Còn phải thu:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(lentRemaining)}
                </span>
              </div>
            </div>

            <Progress value={lentProgress} indicatorClassName="bg-emerald-500" className="h-1.5" />
          </div>
        </div>

        {/* Biến động vay & trả trong tháng */}
        <div className="pt-2 border-t border-border/50">
          <div className="text-xs font-semibold text-muted-foreground mb-2">
            Phát sinh công nợ trong Tháng {month}/{year}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50">
              <div className="text-[11px] text-muted-foreground">Vay mới</div>
              <div className="text-sm font-bold text-foreground mt-0.5 truncate">
                {formatCurrency(monthBorrowed)}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50">
              <div className="text-[11px] text-muted-foreground">Đã trả nợ</div>
              <div className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-0.5 truncate">
                {formatCurrency(monthRepaid)}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50">
              <div className="text-[11px] text-muted-foreground">Cho vay mới</div>
              <div className="text-sm font-bold text-foreground mt-0.5 truncate">
                {formatCurrency(monthLent)}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50">
              <div className="text-[11px] text-muted-foreground">Đã thu hồi nợ</div>
              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">
                {formatCurrency(monthCollected)}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

