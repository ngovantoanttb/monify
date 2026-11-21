import React from 'react'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/finance'
import type { Debt } from '@shared/types'

interface PaymentDialogProps {
  isOpen: boolean
  onClose: () => void
  debt: Debt | null
  onRecordPayment: (debtId: string, amount: number) => Promise<void>
}

export function PaymentDialog({
  isOpen,
  onClose,
  debt,
  onRecordPayment,
}: PaymentDialogProps) {
  const [payAmount, setPayAmount] = React.useState<number>(0)
  const [formattedPay, setFormattedPay] = React.useState<string>('')
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false)

  React.useEffect(() => {
    if (isOpen) {
      setPayAmount(0)
      setFormattedPay('')
      setIsSubmitting(false)
    }
  }, [isOpen])

  if (!debt) return null

  const isLent = debt.kind === 'lent'
  const currentRemaining = Math.max(0, debt.principal - debt.paidAmount)

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '')
    if (!rawVal) {
      setPayAmount(0)
      setFormattedPay('')
      return
    }
    const num = Math.min(currentRemaining, parseInt(rawVal, 10))
    setPayAmount(num)
    setFormattedPay(new Intl.NumberFormat('vi-VN').format(num))
  }

  const handleQuickPay = (val: number) => {
    const next = Math.min(currentRemaining, payAmount + val)
    setPayAmount(next)
    setFormattedPay(new Intl.NumberFormat('vi-VN').format(next))
  }

  const handlePayAll = () => {
    setPayAmount(currentRemaining)
    setFormattedPay(new Intl.NumberFormat('vi-VN').format(currentRemaining))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (payAmount <= 0) return
    setIsSubmitting(true)
    try {
      await onRecordPayment(debt.id, payAmount)
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  const nextPaid = debt.paidAmount + payAmount
  const nextRemaining = Math.max(0, debt.principal - nextPaid)

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={isLent ? `Ghi nhận thu nợ: ${debt.personName}` : `Ghi nhận trả nợ: ${debt.personName}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Info hiện tại */}
        <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50 space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Số tiền gốc:</span>
            <span className="font-semibold text-foreground">{formatCurrency(debt.principal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {isLent ? 'Đã thu trước đó:' : 'Đã trả trước đó:'}
            </span>
            <span className="font-medium text-foreground">{formatCurrency(debt.paidAmount)}</span>
          </div>
          <div className="flex justify-between text-foreground font-semibold">
            <span>{isLent ? 'Còn phải thu:' : 'Còn phải trả:'}</span>
            <span className="text-primary">{formatCurrency(currentRemaining)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground pt-1 border-t border-border/40">
            <span>Còn lại sau thanh toán:</span>
            <span className={nextRemaining === 0 ? 'text-emerald-600 font-bold' : 'font-semibold'}>
              {formatCurrency(nextRemaining)}
            </span>
          </div>
        </div>

        {/* Ô nhập số tiền thanh toán */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="pay-amount">
              {isLent ? 'Số tiền thu được lần này (đ)' : 'Số tiền trả lần này (đ)'}
            </Label>
            <button
              type="button"
              onClick={handlePayAll}
              className="text-xs text-primary font-semibold hover:underline touch-target"
            >
              Tất toán toàn bộ ({formatCurrency(currentRemaining)})
            </button>
          </div>
          <div className="relative">
            <input
              id="pay-amount"
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={formattedPay}
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
              onClick={() => handleQuickPay(500000)}
              className="px-2.5 py-1 text-xs rounded-lg border bg-card hover:bg-muted font-medium transition-colors touch-target"
            >
              +500k
            </button>
            <button
              type="button"
              onClick={() => handleQuickPay(1000000)}
              className="px-2.5 py-1 text-xs rounded-lg border bg-card hover:bg-muted font-medium transition-colors touch-target"
            >
              +1 tr
            </button>
            <button
              type="button"
              onClick={() => handleQuickPay(2000000)}
              className="px-2.5 py-1 text-xs rounded-lg border bg-card hover:bg-muted font-medium transition-colors touch-target"
            >
              +2 tr
            </button>
            <button
              type="button"
              onClick={() => handleQuickPay(5000000)}
              className="px-2.5 py-1 text-xs rounded-lg border bg-card hover:bg-muted font-medium transition-colors touch-target"
            >
              +5 tr
            </button>
          </div>
        </div>

        {nextRemaining === 0 && payAmount > 0 && (
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-medium text-center">
            🎉 Khoản nợ này sẽ được tất toán xong hoàn toàn!
          </div>
        )}

        {/* Buttons */}
        <div className="pt-2 flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} className="h-11 px-4 touch-target">
            Hủy
          </Button>
          <Button
            type="submit"
            disabled={payAmount <= 0 || isSubmitting}
            className="h-11 px-6 font-semibold touch-target"
          >
            {isSubmitting ? 'Đang lưu...' : 'Xác nhận thanh toán'}
          </Button>
        </div>
      </form>
    </BottomSheet>
  )
}

