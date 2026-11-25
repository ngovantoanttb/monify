import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { formatCurrency, evaluateDebtStatus } from '@/lib/finance'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  DollarSign,
  History,
  CheckCheck,
} from 'lucide-react'
import type { Debt } from '@shared/types'

interface DebtCardProps {
  debt: Debt
  onEdit: (debt: Debt) => void
  onDelete: (debt: Debt) => void
  onPayment: (debt: Debt) => void
  onSettle?: (debt: Debt) => void
  onViewDetail?: (debt: Debt) => void
}

export function DebtCard({
  debt,
  onEdit,
  onDelete,
  onPayment,
  onSettle,
  onViewDetail,
}: DebtCardProps) {
  const { remainingAmount, status } = evaluateDebtStatus(debt)
  const isLent = debt.kind === 'lent'
  const isSettled = status === 'settled'
  const percentDisplay =
    debt.principal > 0 ? Math.min(100, Math.round((debt.paidAmount / debt.principal) * 100)) : 0

  let statusBadge = (
    <Badge variant="outline" className="text-xs">
      Không có thời hạn
    </Badge>
  )
  if (status === 'settled') {
    statusBadge = (
      <Badge
        variant="secondary"
        className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200"
      >
        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
        Đã tất toán
      </Badge>
    )
  } else if (status === 'overdue') {
    statusBadge = (
      <Badge variant="destructive" className="text-xs">
        <AlertCircle className="w-3.5 h-3.5 mr-1" />
        Quá hạn
      </Badge>
    )
  } else if (status === 'active') {
    statusBadge = (
      <Badge variant="outline" className="text-xs text-foreground font-medium">
        Đang hoạt động
      </Badge>
    )
  }

  let dueDisplay = null
  if (debt.dueDate) {
    const formattedDate = new Intl.DateTimeFormat('vi-VN').format(new Date(debt.dueDate))
    dueDisplay = (
      <div
        className={`flex items-center gap-1.5 text-xs ${status === 'overdue' ? 'text-destructive font-medium' : 'text-muted-foreground'}`}
      >
        <Calendar className="w-3.5 h-3.5" />
        <span>Hạn: {formattedDate}</span>
      </div>
    )
  }

  return (
    <Card
      onClick={onViewDetail ? () => onViewDetail(debt) : undefined}
      className={`p-4 space-y-3.5 hover:shadow-xs transition-shadow border-border/70 ${
        onViewDetail ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
              isLent
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
            }`}
          >
            {isLent ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-sm sm:text-base text-foreground truncate">
                {debt.personName}
              </h4>
              <Badge
                variant={isLent ? 'default' : 'secondary'}
                className={`text-[10px] px-1.5 py-0 ${
                  isLent
                    ? 'bg-emerald-600 text-white'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                }`}
              >
                {isLent ? 'Tôi cho vay' : 'Tôi vay'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{debt.content}</p>
            {dueDisplay}
          </div>
        </div>

        <div className="shrink-0">{statusBadge}</div>
      </div>

      {/* Tiến độ và số tiền */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-baseline text-xs">
          <span className="text-muted-foreground">
            {isLent ? 'Đã thu:' : 'Đã trả:'}{' '}
            <strong className="text-foreground font-semibold">
              {formatCurrency(debt.paidAmount)}
            </strong>
          </span>
          <span className="text-muted-foreground">
            Số gốc: {formatCurrency(debt.principal)}
          </span>
        </div>

        <Progress
          value={percentDisplay}
          indicatorClassName={
            isSettled ? 'bg-emerald-600' : isLent ? 'bg-emerald-500' : 'bg-amber-500'
          }
          className="h-2"
        />

        <div className="flex justify-between items-center text-xs text-muted-foreground pt-0.5">
          <span className={status === 'overdue' ? 'text-destructive font-semibold' : ''}>
            {isSettled
              ? 'Khoản nợ đã được tất toán đầy đủ'
              : `${isLent ? 'Còn phải thu:' : 'Còn phải trả:'} ${formatCurrency(remainingAmount)}`}
          </span>
          {debt.note && <span className="truncate max-w-[140px] italic">"{debt.note}"</span>}
        </div>
      </div>

      {/* Buttons */}
      <div
        className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {!isSettled ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPayment(debt)}
                className="h-8 px-2.5 text-xs font-medium text-primary hover:text-primary hover:bg-primary/10 touch-target"
              >
                <DollarSign className="w-3.5 h-3.5 mr-1" />
                {isLent ? 'Ghi nhận thu nợ' : 'Ghi nhận trả nợ'}
              </Button>
              {onSettle && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSettle(debt)}
                  className="h-8 px-2.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 touch-target"
                >
                  <CheckCheck className="w-3.5 h-3.5 mr-1" />
                  Tất toán
                </Button>
              )}
            </>
          ) : (
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Hoàn tất
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {onViewDetail && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewDetail(debt)}
              className="h-8 px-2 rounded-lg text-xs text-muted-foreground hover:text-foreground touch-target"
              aria-label={`Chi tiết và lịch sử khoản nợ với ${debt.personName}`}
            >
              <History className="w-3.5 h-3.5 mr-1" />
              <span className="hidden sm:inline">Chi tiết</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(debt)}
            className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground touch-target"
            aria-label={`Sửa khoản nợ với ${debt.personName}`}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(debt)}
            className="w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive touch-target"
            aria-label={`Xóa khoản nợ với ${debt.personName}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
