import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/finance'
import { Target, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Goal } from '@shared/types'

interface GoalsSummaryWidgetProps {
  goals: Goal[]
}

export function GoalsSummaryWidget({ goals }: GoalsSummaryWidgetProps) {
  if (goals.length === 0) return null

  let totalTarget = 0
  let totalSaved = 0
  let completedCount = 0

  goals.forEach((g) => {
    totalTarget += g.targetAmount
    totalSaved += Math.min(g.targetAmount, g.savedAmount)
    if (g.savedAmount >= g.targetAmount) {
      completedCount++
    }
  })

  const progressRate = totalTarget > 0 ? totalSaved / totalTarget : 0
  const progressPercent = Math.min(100, Math.round(progressRate * 100))

  return (
    <Card className="border-border/70 shadow-xs">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">Mục tiêu tiết kiệm</CardTitle>
            <p className="text-xs text-muted-foreground">
              Đã hoàn thành {completedCount}/{goals.length} mục tiêu
            </p>
          </div>
        </div>

        <Button variant="ghost" size="sm" asChild className="h-8 text-xs text-primary hover:text-primary">
          <Link to="/goals" className="flex items-center gap-1">
            Chi tiết <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </Button>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex justify-between items-baseline text-xs">
          <span className="text-muted-foreground">
            Đã tích lũy:{' '}
            <strong className="text-foreground font-semibold">
              {formatCurrency(totalSaved)}
            </strong>
          </span>
          <span className="text-muted-foreground">
            Mục tiêu: {formatCurrency(totalTarget)}
          </span>
        </div>

        <Progress value={progressPercent} indicatorClassName="bg-primary" className="h-2.5" />

        <div className="flex justify-between items-center text-xs text-muted-foreground pt-0.5">
          <span>Tiến độ tổng thể: {progressPercent}%</span>
          <span>Còn thiếu: {formatCurrency(Math.max(0, totalTarget - totalSaved))}</span>
        </div>
      </CardContent>
    </Card>
  )
}

