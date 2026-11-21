import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/finance'
import { AlertTriangle, AlertCircle } from 'lucide-react'

export interface BudgetAlertItem {
  categoryId: string
  categoryName: string
  limit: number
  spent: number
  percentage: number
  isExceeded: boolean
}

interface BudgetAlertsWidgetProps {
  alerts: BudgetAlertItem[]
}

export function BudgetAlertsWidget({ alerts }: BudgetAlertsWidgetProps) {
  if (alerts.length === 0) return null

  return (
    <Card className="border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <CardTitle className="text-base font-semibold text-amber-900 dark:text-amber-300">
            Cảnh báo hạn mức ngân sách
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.categoryId}
            className="flex items-center justify-between p-3 rounded-xl bg-card border shadow-xs"
          >
            <div className="flex items-center gap-2.5">
              {alert.isExceeded ? (
                <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              )}
              <div>
                <h5 className="font-semibold text-sm text-foreground">{alert.categoryName}</h5>
                <p className="text-xs text-muted-foreground">
                  Đã chi {formatCurrency(alert.spent)} / Hạn mức {formatCurrency(alert.limit)}
                </p>
              </div>
            </div>

            <Badge variant={alert.isExceeded ? 'destructive' : 'warning'} className="text-xs shrink-0">
              {alert.isExceeded ? 'Vượt hạn mức' : `${(alert.percentage * 100).toFixed(0)}%`}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

