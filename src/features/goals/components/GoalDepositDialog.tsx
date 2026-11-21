import React from 'react'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/finance'
import type { Goal } from '@shared/types'

interface GoalDepositDialogProps {
  isOpen: boolean
  onClose: () => void
  goal: Goal | null
  onDeposit: (goalId: string, additionalAmount: number) => Promise<void>
}

export function GoalDepositDialog({
  isOpen,
  onClose,
  goal,
  onDeposit,
}: GoalDepositDialogProps) {
  const [addAmount, setAddAmount] = React.useState<number>(0)
  const [formattedAdd, setFormattedAdd] = React.useState<string>('')
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false)

  React.useEffect(() => {
    if (isOpen) {
      setAddAmount(0)
      setFormattedAdd('')
      setIsSubmitting(false)
    }
  }, [isOpen])

  if (!goal) return null

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '')
    if (!rawVal) {
      setAddAmount(0)
      setFormattedAdd('')
      return
    }
    const num = parseInt(rawVal, 10)
    setAddAmount(num)
    setFormattedAdd(new Intl.NumberFormat('vi-VN').format(num))
  }

  const handleQuickAdd = (val: number) => {
    const next = addAmount + val
    setAddAmount(next)
    setFormattedAdd(new Intl.NumberFormat('vi-VN').format(next))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (addAmount <= 0) return
    setIsSubmitting(true)
    try {
      await onDeposit(goal.id, addAmount)
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  const newSaved = goal.savedAmount + addAmount
  const newRemaining = Math.max(0, goal.targetAmount - newSaved)

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={`Tích lũy thêm: ${goal.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Info hiện tại */}
        <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50 space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Mục tiêu:</span>
            <span className="font-semibold text-foreground">{formatCurrency(goal.targetAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Hiện đã tích lũy:</span>
            <span className="font-medium text-foreground">{formatCurrency(goal.savedAmount)}</span>
          </div>
          <div className="flex justify-between text-primary font-semibold pt-1 border-t border-border/40">
            <span>Sau khi tích lũy:</span>
            <span>{formatCurrency(newSaved)}</span>
          </div>
        </div>

        {/* Ô nhập số tiền nạp */}
        <div className="space-y-1.5">
          <Label htmlFor="deposit-amount">Số tiền muốn nạp thêm (đ)</Label>
          <div className="relative">
            <input
              id="deposit-amount"
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={formattedAdd}
              onChange={handleAmountChange}
              autoFocus
              className="flex h-12 w-full rounded-xl border border-input bg-background px-3 py-2 text-lg font-bold text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <span className="absolute right-3.5 top-3 text-sm font-semibold text-muted-foreground pointer-events-none">
              VND
            </span>
          </div>

          {/* Quick chips */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => handleQuickAdd(200000)}
              className="px-2.5 py-1 text-xs rounded-lg border bg-card hover:bg-muted font-medium transition-colors touch-target"
            >
              +200k
            </button>
            <button
              type="button"
              onClick={() => handleQuickAdd(500000)}
              className="px-2.5 py-1 text-xs rounded-lg border bg-card hover:bg-muted font-medium transition-colors touch-target"
            >
              +500k
            </button>
            <button
              type="button"
              onClick={() => handleQuickAdd(1000000)}
              className="px-2.5 py-1 text-xs rounded-lg border bg-card hover:bg-muted font-medium transition-colors touch-target"
            >
              +1 tr
            </button>
            <button
              type="button"
              onClick={() => handleQuickAdd(5000000)}
              className="px-2.5 py-1 text-xs rounded-lg border bg-card hover:bg-muted font-medium transition-colors touch-target"
            >
              +5 tr
            </button>
          </div>
        </div>

        {newRemaining === 0 && addAmount > 0 && (
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-medium text-center">
            🎉 Tuyệt vời! Số tiền này sẽ giúp bạn đạt đủ mục tiêu tiết kiệm!
          </div>
        )}

        {/* Buttons */}
        <div className="pt-2 flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} className="h-11 px-4 touch-target">
            Hủy
          </Button>
          <Button
            type="submit"
            disabled={addAmount <= 0 || isSubmitting}
            className="h-11 px-6 font-semibold touch-target"
          >
            {isSubmitting ? 'Đang lưu...' : 'Xác nhận nạp'}
          </Button>
        </div>
      </form>
    </BottomSheet>
  )
}

