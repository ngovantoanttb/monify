import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
    <Card className="p-3.5 flex items-center justify-between hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-3 min-w-0">
        {/* Type Icon */}
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
            isIncome
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : isExpense
              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
          }`}
        >
          {isIncome && <ArrowDownLeft className="w-5 h-5" />}
          {isExpense && <ArrowUpRight className="w-5 h-5" />}
          {isTransfer && <ArrowRightLeft className="w-5 h-5" />}
        </div>

        {/* Info */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm text-foreground truncate">
              {isTransfer
                ? `Chuyển ví: ${fromAccount?.name || 'Ví'} ➔ ${toAccount?.name || 'Ví'}`
                : category?.name || 'Chưa phân loại'}
            </h4>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
              {formattedDate}
            </Badge>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <span>{isTransfer ? 'Chuyển khoản' : fromAccount?.name || 'Ví'}</span>
            {transaction.note && (
              <>
                <span>•</span>
                <span className="truncate italic max-w-[140px] sm:max-w-xs">{transaction.note}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Amount & Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <div
          className={`text-right font-bold text-sm sm:text-base ${
            isIncome ? 'text-green-600' : isExpense ? 'text-red-600' : 'text-blue-600'
          }`}
        >
          {isIncome ? '+' : isExpense ? '-' : ''}
          {formatCurrency(transaction.amount)}
        </div>

        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(transaction)}
            className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground touch-target"
            aria-label="Sửa giao dịch"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(transaction)}
            className="w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive touch-target"
            aria-label="Xóa giao dịch"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}

