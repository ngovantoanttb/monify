import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/finance'
import { Wallet, Landmark, Smartphone, PiggyBank, Edit2, Trash2 } from 'lucide-react'
import type { Account, AccountType } from '@shared/types'

interface AccountCardProps {
  account: Account
  currentBalance?: number
  onEdit: (account: Account) => void
  onDelete: (account: Account) => void
}

const typeMap: Record<AccountType, { label: string; icon: any; color: string }> = {
  cash: {
    label: 'Tiền mặt',
    icon: Wallet,
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  bank: {
    label: 'Ngân hàng',
    icon: Landmark,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  },
  ewallet: {
    label: 'Ví điện tử',
    icon: Smartphone,
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  },
  savings: {
    label: 'Tiết kiệm',
    icon: PiggyBank,
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  },
}

export function AccountCard({ account, currentBalance, onEdit, onDelete }: AccountCardProps) {
  const typeInfo = typeMap[account.type] || typeMap.cash
  const Icon = typeInfo.icon
  const displayBalance = currentBalance !== undefined ? currentBalance : account.openingBalance

  return (
    <Card className="p-4 flex flex-col justify-between space-y-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${typeInfo.color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-foreground text-base truncate max-w-[160px] sm:max-w-none">
              {account.name}
            </h4>
            <Badge variant="secondary" className="text-[11px] font-normal px-2 py-0 mt-0.5">
              {typeInfo.label}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(account)}
            className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground touch-target"
            aria-label={`Sửa ví ${account.name}`}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(account)}
            className="w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive touch-target"
            aria-label={`Xóa ví ${account.name}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="border-t pt-3 flex flex-col gap-1">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-muted-foreground">Số dư hiện tại</span>
          <span
            className={`text-lg font-bold ${
              displayBalance < 0 ? 'text-destructive' : 'text-primary'
            }`}
          >
            {formatCurrency(displayBalance)}
          </span>
        </div>
        {account.openingBalance > 0 && currentBalance !== undefined && (
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Ban đầu: {formatCurrency(account.openingBalance)}</span>
            <span>
              Biến động: {displayBalance - account.openingBalance >= 0 ? '+' : ''}
              {formatCurrency(displayBalance - account.openingBalance)}
            </span>
          </div>
        )}
      </div>

      {account.note && <p className="text-xs text-muted-foreground italic truncate">{account.note}</p>}
    </Card>
  )
}
