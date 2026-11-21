import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { formatCurrency, evaluateGoalProgress } from '@/lib/finance'
import { Target, CheckCircle2, Calendar, Plus, Edit2, Trash2 } from 'lucide-react'
import type { Goal } from '@shared/types'

interface GoalCardProps {
  goal: Goal
  onEdit: (goal: Goal) => void
  onDelete: (goal: Goal) => void
  onDeposit: (goal: Goal) => void
}

export function GoalCard({ goal, onEdit, onDelete, onDeposit }: GoalCardProps) {
  const { remainingAmount, progressRate, isCompleted } = evaluateGoalProgress(goal)
  const percentDisplay = Math.min(100, Math.round(progressRate * 100))

  // Tính số ngày còn lại đến deadline
  let deadlineInfo = 'Không có thời hạn'
  if (goal.deadline) {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const deadlineDate = new Date(goal.deadline)
    deadlineDate.setHours(0, 0, 0, 0)

    const diffDays = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const dateFormatted = new Intl.DateTimeFormat('vi-VN').format(new Date(goal.deadline))

    if (diffDays < 0) {
      deadlineInfo = `Quá hạn (${dateFormatted})`
    } else if (diffDays === 0) {
      deadlineInfo = 'Đến hạn hôm nay'
    } else {
      deadlineInfo = `Còn ${diffDays} ngày (${dateFormatted})`
    }
  }

  return (
    <Card className="p-4 space-y-3.5 hover:shadow-xs transition-shadow border-border/70">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
              isCompleted
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-primary/10 text-primary'
            }`}
          >
            {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Target className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <h4 className="font-semibold text-sm sm:text-base text-foreground truncate">
              {goal.name}
            </h4>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>{deadlineInfo}</span>
            </div>
          </div>
        </div>

        <Badge
          variant={isCompleted ? 'secondary' : 'outline'}
          className={`text-xs shrink-0 font-medium ${
            isCompleted
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200'
              : ''
          }`}
        >
          {isCompleted ? 'Đã hoàn thành' : `${percentDisplay}%`}
        </Badge>
      </div>

      {/* Progress & Số tiền */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-baseline text-xs">
          <span className="text-muted-foreground">
            Đã tích lũy:{' '}
            <strong className="text-foreground font-semibold">
              {formatCurrency(goal.savedAmount)}
            </strong>
          </span>
          <span className="text-muted-foreground">
            Mục tiêu: {formatCurrency(goal.targetAmount)}
          </span>
        </div>

        <Progress
          value={percentDisplay}
          indicatorClassName={isCompleted ? 'bg-emerald-600' : 'bg-primary'}
          className="h-2.5"
        />

        <div className="flex justify-between items-center text-xs text-muted-foreground pt-0.5">
          <span>
            {isCompleted
              ? 'Đã đạt chỉ tiêu!'
              : `Còn thiếu: ${formatCurrency(remainingAmount)}`}
          </span>
          {goal.note && <span className="truncate max-w-[150px] italic">"{goal.note}"</span>}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-1 border-t border-border/40">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDeposit(goal)}
          className="h-8 px-2.5 text-xs font-medium text-primary hover:text-primary hover:bg-primary/10 touch-target"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Tiết kiệm thêm
        </Button>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(goal)}
            className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground touch-target"
            aria-label={`Sửa mục tiêu ${goal.name}`}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(goal)}
            className="w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive touch-target"
            aria-label={`Xóa mục tiêu ${goal.name}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}

