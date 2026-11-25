import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/finance'
import { format } from 'date-fns'
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, Clock, FileEdit, Wallet } from 'lucide-react'
import type { Account, DebtHistory, DebtHistoryType } from '@shared/types'

interface DebtHistoryListProps {
  histories: DebtHistory[]
  accounts: Account[]
}

const HISTORY_META: Record<
  DebtHistoryType,
  {
    label: string
    badgeClass: string
    icon: typeof ArrowUpRight
    sign: '+' | '-' | ''
    amountClass: string
  }
> = {
  initial_borrow: {
    label: 'Nhận tiền vay',
    badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
    icon: ArrowDownLeft,
    sign: '+',
    amountClass: 'text-emerald-600 dark:text-emerald-400',
  },
  initial_lend: {
    label: 'Xuất tiền cho vay',
    badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
    icon: ArrowUpRight,
    sign: '-',
    amountClass: 'text-amber-600 dark:text-amber-400',
  },
  repay: {
    label: 'Trả nợ',
    badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
    icon: ArrowUpRight,
    sign: '-',
    amountClass: 'text-amber-600 dark:text-amber-400',
  },
  collect: {
    label: 'Thu hồi nợ',
    badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
    icon: ArrowDownLeft,
    sign: '+',
    amountClass: 'text-emerald-600 dark:text-emerald-400',
  },
  settle_repay: {
    label: 'Tất toán trả nợ',
    badgeClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
    icon: CheckCircle2,
    sign: '-',
    amountClass: 'text-amber-600 dark:text-amber-400',
  },
  settle_collect: {
    label: 'Tất toán thu nợ',
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    icon: CheckCircle2,
    sign: '+',
    amountClass: 'text-emerald-600 dark:text-emerald-400',
  },
  adjustment: {
    label: 'Điều chỉnh công nợ',
    badgeClass: 'bg-muted text-muted-foreground border-border',
    icon: FileEdit,
    sign: '',
    amountClass: 'text-foreground',
  },
}

export function DebtHistoryList({ histories, accounts }: DebtHistoryListProps) {
  const accountMap = new Map(accounts.map((a) => [a.id, a]))
  const sortedHistories = [...histories].sort((a, b) => b.createdAt - a.createdAt)

  if (sortedHistories.length === 0) {
    return (
      <Card className="p-6 text-center border-dashed border-border/80">
        <Clock className="w-8 h-8 mx-auto text-muted-foreground/60 mb-2" />
        <p className="text-sm font-medium text-foreground">Chưa có lịch sử giao dịch</p>
        <p className="text-xs text-muted-foreground mt-1">
          Mỗi lần trả nợ, thu hồi nợ hoặc tất toán sẽ được ghi nhận tại đây.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-2.5">
      {sortedHistories.map((item) => {
        const meta = HISTORY_META[item.type] || HISTORY_META.repay
        const Icon = meta.icon
        const resolvedAccountName =
          (item.accountId ? accountMap.get(item.accountId)?.name : undefined) ||
          item.accountName ||
          (item.hasCashFlow ? 'Nguồn tiền không xác định' : 'Không phát sinh dòng tiền')

        const formattedTime = item.createdAt
          ? format(new Date(item.createdAt), 'dd/MM/yyyy HH:mm')
          : '--'

        return (
          <Card key={item.id} className="p-3.5 sm:p-4 border-border/70 space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${meta.badgeClass}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={`text-[11px] font-semibold ${meta.badgeClass}`}>
                      {meta.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{formattedTime}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
                    <Wallet className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate font-medium text-foreground">{resolvedAccountName}</span>
                    {item.hasCashFlow &&
                      typeof item.accountBalanceBefore === 'number' &&
                      typeof item.accountBalanceAfter === 'number' && (
                        <span className="text-[11px] text-muted-foreground hidden sm:inline">
                          ({formatCurrency(item.accountBalanceBefore)} →{' '}
                          {formatCurrency(item.accountBalanceAfter)})
                        </span>
                      )}
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className={`text-sm sm:text-base font-bold ${meta.amountClass}`}>
                  {meta.sign}
                  {formatCurrency(item.amount)}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Còn lại:{' '}
                  <strong className="text-foreground">
                    {formatCurrency(item.debtRemainingAfter)}
                  </strong>
                </div>
              </div>
            </div>

            {(item.note || (item.hasCashFlow && typeof item.accountBalanceBefore === 'number')) && (
              <div className="pt-2 border-t border-border/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs text-muted-foreground">
                <span className="italic break-words">
                  {item.note ? `Ghi chú: ${item.note}` : 'Không có ghi chú'}
                </span>
                {item.hasCashFlow &&
                  typeof item.accountBalanceBefore === 'number' &&
                  typeof item.accountBalanceAfter === 'number' && (
                    <span className="text-[11px] sm:hidden">
                      Số dư nguồn: {formatCurrency(item.accountBalanceBefore)} →{' '}
                      {formatCurrency(item.accountBalanceAfter)}
                    </span>
                  )}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

