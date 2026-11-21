import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { formatCurrency, evaluateBudgetStatus } from '@/lib/finance'
import { Edit2, Plus, AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { Category, Budget } from '@shared/types'

interface BudgetCardProps {
  category: Category
  budget?: Budget | null
  spent: number
  warningThreshold?: number
  onSetBudget: (category: Category, budget?: Budget | null) => void
}

export function BudgetCard({
  category,
  budget,
  spent,
  warningThreshold = 0.8,
  onSetBudget,
}: BudgetCardProps) {
  const budgetLimit = budget?.amount ?? 0
  const evaluation = evaluateBudgetStatus(budgetLimit, spent, warningThreshold)
  const isBudgeted = budgetLimit > 0

  let statusBadgeVariant: 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' = 'outline'
  let statusBadgeText = 'Chưa đặt ngân sách'
  let progressColor = 'bg-primary'
  let statusIcon = null

  if (isBudgeted) {
    if (evaluation.status === 'exceeded') {
      statusBadgeVariant = 'destructive'
      statusBadgeText = `Vượt ${((evaluation.percentage - 1) * 100).toFixed(0)}%`
      progressColor = 'bg-destructive'
      statusIcon = <AlertCircle className="w-3.5 h-3.5 mr-1" />
    } else if (evaluation.status === 'warning') {
      statusBadgeVariant = 'warning'
      statusBadgeText = `Sắp chạm (${(evaluation.percentage * 100).toFixed(0)}%)`
      progressColor = 'bg-amber-500'
      statusIcon = <AlertTriangle className="w-3.5 h-3.5 mr-1" />
    } else {
      statusBadgeVariant = 'secondary'
      statusBadgeText = 'Trong ngân sách'
      progressColor = 'bg-emerald-600 dark:bg-emerald-500'
      statusIcon = <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
    }
  }

  const progressPercent = isBudgeted
    ? Math.min(100, Math.round(evaluation.percentage * 100))
    : 0

  return (
    <Card className="p-4 space-y-3 hover:shadow-xs transition-shadow border-border/70">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs"
            style={{ backgroundColor: category.color }}
          >
            {category.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h4 className="font-semibold text-sm text-foreground truncate">{category.name}</h4>
            <span className="text-xs text-muted-foreground">
              Đã chi {formatCurrency(spent)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={statusBadgeVariant} className="text-xs px-2 py-0.5 font-medium">
            {statusIcon}
            {statusBadgeText}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSetBudget(category, budget)}
            className="h-8 px-2.5 rounded-lg text-muted-foreground hover:text-foreground touch-target"
            aria-label={isBudgeted ? `Sửa ngân sách ${category.name}` : `Đặt ngân sách ${category.name}`}
          >
            {isBudgeted ? (
              <>
                <Edit2 className="w-3.5 h-3.5 mr-1" />
                <span className="text-xs hidden sm:inline">Sửa</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 mr-1" />
                <span className="text-xs font-medium text-primary">Đặt hạn mức</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {isBudgeted && (
        <div className="space-y-1.5 pt-1 border-t border-border/40">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">
              Hạn mức: <strong className="text-foreground">{formatCurrency(budgetLimit)}</strong>
            </span>
            <span
              className={
                evaluation.remaining < 0
                  ? 'text-destructive font-semibold'
                  : 'text-muted-foreground'
              }
            >
              {evaluation.remaining < 0
                ? `Vượt ${formatCurrency(Math.abs(evaluation.remaining))}`
                : `Còn lại ${formatCurrency(evaluation.remaining)}`}
            </span>
          </div>

          <Progress value={progressPercent} indicatorClassName={progressColor} className="h-2" />
        </div>
      )}
    </Card>
  )
}

