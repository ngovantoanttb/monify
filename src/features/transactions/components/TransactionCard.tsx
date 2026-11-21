import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/finance'
import { format } from 'date-fns'
import { ArrowUpRight, ArrowDownLeft, ArrowRightLeft, Edit2, Trash2 } from 'lucide-react'
import type { Transaction, Account, Category } from '@shared/types'

interface TransactionCardProps {
  transaction: Transaction
  accounts: Account[]
  categories: Category[]
  onEdit: (tx: Transaction) => void
  onDelete: (tx: Transaction) => void
}

export function TransactionCard({
  transaction,
  accounts,
  categories,
  onEdit,
  onDelete,
}: TransactionCardProps) {
  const fromAccount = accounts.find((a) => a.id === transaction.accountId)
  const toAccount = transaction.toAccountId ? accounts.find((a) => a.id === transaction.toAccountId) : null
  const category = transaction.categoryId ? categories.find((c) => c.id === transaction.categoryId) : null

  const formattedDate = format(new Date(transaction.date), 'dd/MM/yyyy')

  const isIncome = transaction.type === 'income'
  const isExpense = transaction.type === 'expense'
  const isTransfer = transaction.type === 'transfer'

  return (
    <Card
      onClick={() => onEdit(transaction)}
      className="p-3 sm:p-3.5 flex items-center justify-between hover:shadow-xs transition-all border-border/70 gap-2.5 sm:gap-4 cursor-pointer active:bg-accent/30 rounded-xl"
    >
      {/* Cụm thông tin bên trái: Icon + Tên + Ví/Ghi chú */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
        {/* Type Icon */}
        <div
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
            isIncome
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
              : isExpense
              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
              : 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400'
          }`}
        >
          {isIncome && <ArrowDownLeft className="w-4 h-4 sm:w-5 sm:h-5" />}
          {isExpense && <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5" />}
          {isTransfer && <ArrowRightLeft className="w-4 h-4 sm:w-5 sm:h-5" />}
        </div>

        {/* Text Info */}
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-sm sm:text-base text-foreground truncate leading-tight">
            {isTransfer
              ? `Chuyển: ${fromAccount?.name || 'Ví'} ➔ ${toAccount?.name || 'Ví'}`
              : category?.name || 'Chưa phân loại'}
          </h4>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 min-w-0">
            <span className="truncate max-w-[90px] sm:max-w-[150px]">
              {isTransfer ? 'Chuyển khoản' : fromAccount?.name || 'Ví'}
            </span>
            {transaction.note && (
              <>
                <span className="shrink-0 text-muted-foreground/60">•</span>
                <span className="truncate italic max-w-[110px] sm:max-w-xs">{transaction.note}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Cụm bên phải: Số tiền & Ngày (mobile) & Thao tác */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        <div className="text-right">
          <div
            className={`font-bold text-sm sm:text-base whitespace-nowrap tracking-tight ${
              isIncome
                ? 'text-emerald-600 dark:text-emerald-400'
                : isExpense
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-sky-600 dark:text-sky-400'
            }`}
          >
            {isIncome ? '+' : isExpense ? '-' : ''}
            {formatCurrency(transaction.amount)}
          </div>
          <div className="text-[11px] text-muted-foreground whitespace-nowrap mt-0.5 font-medium">
            {formattedDate}
          </div>
        </div>

        <div className="flex items-center -mr-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(transaction)}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-muted-foreground hover:text-foreground touch-target"
            aria-label="Sửa giao dịch"
          >
            <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(transaction)}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-muted-foreground hover:text-destructive touch-target"
            aria-label="Xóa giao dịch"
          >
            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}

