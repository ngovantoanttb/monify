import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/finance'
import { Wallet, Landmark, Smartphone, PiggyBank, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Account } from '@shared/types'

interface AccountsSummaryWidgetProps {
  accounts: Account[]
  balances: Record<string, number>
}

const iconMap: Record<string, any> = {
  cash: Wallet,
  bank: Landmark,
  ewallet: Smartphone,
  savings: PiggyBank,
}

export function AccountsSummaryWidget({ accounts, balances }: AccountsSummaryWidgetProps) {
  const totalBalance = Object.values(balances).reduce((sum, b) => sum + b, 0)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">Tài khoản & Ví</CardTitle>
        <Link to="/accounts" className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">
          <span>Xem tất cả</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between border-b pb-2">
          <span className="text-xs text-muted-foreground font-medium">Tổng tài sản ròng</span>
          <span className="text-lg font-bold text-primary">{formatCurrency(totalBalance)}</span>
        </div>

        <div className="space-y-2">
          {accounts.map((acc) => {
            const Icon = iconMap[acc.type] || Wallet
            const balance = balances[acc.id] ?? acc.openingBalance ?? 0
            return (
              <div key={acc.id} className="flex items-center justify-between py-1 text-sm">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-foreground">{acc.name}</span>
                </div>
                <span className="font-semibold">{formatCurrency(balance)}</span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

