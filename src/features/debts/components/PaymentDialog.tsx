import React from 'react'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/finance'
import { AlertCircle, ArrowRight, CheckCircle2, Loader2, Wallet } from 'lucide-react'
import type { Account, Debt } from '@shared/types'

export interface PaymentSubmitPayload {
  debtId: string
  accountId: string
  amount: number
  mode: 'payment' | 'settle'
  note?: string
  idempotencyKey: string
}

interface PaymentDialogProps {
  isOpen: boolean
  onClose: () => void
  debt: Debt | null
  accounts: Account[]
  accountBalances: Record<string, number>
  initialMode?: 'payment' | 'settle'
  onRecordPayment: (payload: PaymentSubmitPayload) => Promise<void>
}

function generateAttemptKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `debt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export function PaymentDialog({
  isOpen,
  onClose,
  debt,
  accounts,
  accountBalances,
  initialMode = 'payment',
  onRecordPayment,
}: PaymentDialogProps) {
  const [mode, setMode] = React.useState<'payment' | 'settle'>(initialMode)
  const [selectedAccountId, setSelectedAccountId] = React.useState<string>('')
  const [payAmount, setPayAmount] = React.useState<number>(0)
  const [formattedPay, setFormattedPay] = React.useState<string>('')
  const [note, setNote] = React.useState<string>('')
  const [step, setStep] = React.useState<'form' | 'confirm'>('form')
  const [errorMessage, setErrorMessage] = React.useState<string>('')
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false)

  const isSubmittingRef = React.useRef<boolean>(false)
  const idempotencyKeyRef = React.useRef<string>(generateAttemptKey())

  const currentRemaining = debt ? Math.max(0, debt.principal - debt.paidAmount) : 0

  React.useEffect(() => {
    if (isOpen && debt) {
      const remaining = Math.max(0, debt.principal - debt.paidAmount)
      const nextMode = initialMode
      setMode(nextMode)
      setStep('form')
      setErrorMessage('')
      setIsSubmitting(false)
      isSubmittingRef.current = false
      idempotencyKeyRef.current = generateAttemptKey()

      const defaultAccountId = accounts[0]?.id || ''
      setSelectedAccountId(defaultAccountId)

      if (nextMode === 'settle') {
        setPayAmount(remaining)
        setFormattedPay(remaining > 0 ? new Intl.NumberFormat('vi-VN').format(remaining) : '')
        setNote('')
      } else {
        setPayAmount(0)
        setFormattedPay('')
        setNote('')
      }
    }
  }, [isOpen, debt, initialMode, accounts])

  if (!debt) return null

  const isLent = debt.kind === 'lent'
  const isSettle = mode === 'settle'
  const effectiveAmount = isSettle ? currentRemaining : payAmount

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) || null
  const selectedAccountBalance =
    selectedAccountId && accountBalances[selectedAccountId] !== undefined
      ? accountBalances[selectedAccountId]
      : selectedAccount?.openingBalance ?? 0

  const projectedAccountBalance = isLent
    ? selectedAccountBalance + effectiveAmount
    : selectedAccountBalance - effectiveAmount

  const nextPaid = Math.min(debt.principal, debt.paidAmount + effectiveAmount)
  const nextRemaining = Math.max(0, debt.principal - nextPaid)

  const isInsufficientBalance =
    !isLent && Boolean(selectedAccountId) && effectiveAmount > 0 && selectedAccountBalance < effectiveAmount
  const isExceedingDebt = effectiveAmount > currentRemaining

  const handleModeSwitch = (nextMode: 'payment' | 'settle') => {
    setMode(nextMode)
    setErrorMessage('')
    if (nextMode === 'settle') {
      setPayAmount(currentRemaining)
      setFormattedPay(
        currentRemaining > 0 ? new Intl.NumberFormat('vi-VN').format(currentRemaining) : ''
      )
    } else {
      setPayAmount(0)
      setFormattedPay('')
    }
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '')
    setErrorMessage('')
    if (!rawVal) {
      setPayAmount(0)
      setFormattedPay('')
      return
    }
    const num = parseInt(rawVal, 10)
    setPayAmount(num)
    setFormattedPay(new Intl.NumberFormat('vi-VN').format(num))
  }

  const handleQuickPay = (val: number) => {
    setErrorMessage('')
    const next = Math.min(currentRemaining, payAmount + val)
    setPayAmount(next)
    setFormattedPay(new Intl.NumberFormat('vi-VN').format(next))
  }

  const validateForm = (): string | null => {
    if (!selectedAccountId || !selectedAccount) {
      return 'Vui lòng chọn nguồn tiền'
    }
    if (currentRemaining <= 0) {
      return 'Khoản công nợ này đã được tất toán'
    }
    if (effectiveAmount <= 0 || !Number.isInteger(effectiveAmount)) {
      return 'Vui lòng nhập số tiền lớn hơn 0'
    }
    if (effectiveAmount > currentRemaining) {
      return `Số tiền không được vượt quá công nợ còn lại (${formatCurrency(currentRemaining)})`
    }
    if (!isLent && selectedAccountBalance < effectiveAmount) {
      return `Số dư nguồn tiền "${selectedAccount.name}" không đủ (hiện có ${formatCurrency(selectedAccountBalance)})`
    }
    if (note.trim().length > 500) {
      return 'Ghi chú tối đa 500 ký tự'
    }
    return null
  }

  const handleContinueToConfirm = (e: React.FormEvent) => {
    e.preventDefault()
    const validationErr = validateForm()
    if (validationErr) {
      setErrorMessage(validationErr)
      return
    }
    setErrorMessage('')
    idempotencyKeyRef.current = generateAttemptKey()
    setStep('confirm')
  }

  const handleConfirmSubmit = async () => {
    if (isSubmittingRef.current || isSubmitting) return

    const validationErr = validateForm()
    if (validationErr) {
      setErrorMessage(validationErr)
      setStep('form')
      return
    }

    isSubmittingRef.current = true
    setIsSubmitting(true)
    setErrorMessage('')

    try {
      await onRecordPayment({
        debtId: debt.id,
        accountId: selectedAccountId,
        amount: effectiveAmount,
        mode,
        note: note.trim(),
        idempotencyKey: idempotencyKeyRef.current,
      })
      onClose()
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Không thể thực hiện giao dịch công nợ'
      setErrorMessage(message)
      // Cấp key mới cho lần thử lại tiếp theo sau khi lỗi
      idempotencyKeyRef.current = generateAttemptKey()
      setStep('form')
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }
  }

  const dialogTitle = isSettle
    ? isLent
      ? `Tất toán thu hồi nợ: ${debt.personName}`
      : `Tất toán trả nợ: ${debt.personName}`
    : isLent
      ? `Ghi nhận thu hồi nợ: ${debt.personName}`
      : `Ghi nhận trả nợ: ${debt.personName}`

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={() => {
        if (!isSubmitting) onClose()
      }}
      title={dialogTitle}
    >
      {step === 'form' ? (
        <form onSubmit={handleContinueToConfirm} className="space-y-4">
          {/* Chuyển đổi nhanh giữa Trả/Thu một phần và Tất toán */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl">
            <button
              type="button"
              onClick={() => handleModeSwitch('payment')}
              className={`py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors touch-target ${
                mode === 'payment'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {isLent ? 'Thu hồi nợ' : 'Trả nợ'}
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch('settle')}
              className={`py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors touch-target ${
                mode === 'settle'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Tất toán toàn bộ
            </button>
          </div>

          {/* Info công nợ hiện tại */}
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
              <span>Công nợ còn lại sau giao dịch:</span>
              <span className={nextRemaining === 0 ? 'text-emerald-600 font-bold' : 'font-semibold'}>
                {formatCurrency(nextRemaining)}
              </span>
            </div>
          </div>

          {/* Chọn nguồn tiền */}
          <div className="space-y-1.5">
            <Label htmlFor="payment-account">
              {isLent ? 'Tài khoản nhận tiền *' : 'Nguồn tiền thanh toán *'}
            </Label>
            {accounts.length === 0 ? (
              <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/10 text-xs text-destructive">
                Bạn chưa có tài khoản/ví nào. Vui lòng tạo tài khoản trong mục Ví trước khi thực hiện giao dịch.
              </div>
            ) : (
              <>
                <select
                  id="payment-account"
                  value={selectedAccountId}
                  onChange={(e) => {
                    setSelectedAccountId(e.target.value)
                    setErrorMessage('')
                  }}
                  className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm sm:text-base touch-target focus:outline-none focus-visible:outline-none"
                >
                  <option value="">-- Chọn nguồn tiền --</option>
                  {accounts.map((acc) => {
                    const bal =
                      accountBalances[acc.id] !== undefined
                        ? accountBalances[acc.id]!
                        : acc.openingBalance
                    return (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({formatCurrency(bal)})
                      </option>
                    )
                  })}
                </select>

                {selectedAccount && (
                  <div
                    className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                      isInsufficientBalance
                        ? 'bg-destructive/10 border-destructive/30 text-destructive'
                        : 'bg-card border-border/70 text-muted-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Wallet className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">
                        Số dư hiện tại:{' '}
                        <strong className="text-foreground">
                          {formatCurrency(selectedAccountBalance)}
                        </strong>
                      </span>
                    </div>
                    {effectiveAmount > 0 && (
                      <span className="shrink-0 font-medium">
                        Sau GD:{' '}
                        <strong
                          className={
                            projectedAccountBalance < 0
                              ? 'text-destructive'
                              : isLent
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-foreground'
                          }
                        >
                          {formatCurrency(projectedAccountBalance)}
                        </strong>
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Số tiền giao dịch */}
          {isSettle ? (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
              <div className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                Số tiền cần tất toán
              </div>
              <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                {formatCurrency(currentRemaining)}
              </div>
              <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
                Sau khi xác nhận, số dư công nợ sẽ về 0 ₫ và chuyển sang trạng thái Đã tất toán.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="pay-amount">
                  {isLent ? 'Số tiền thu được (đ) *' : 'Số tiền muốn trả (đ) *'}
                </Label>
                <button
                  type="button"
                  onClick={() => handleModeSwitch('settle')}
                  className="text-xs text-primary font-semibold hover:underline touch-target"
                >
                  Tất toán ({formatCurrency(currentRemaining)})
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
                  className="flex h-12 w-full rounded-xl border border-input bg-background px-3 py-2 text-lg font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:outline-none"
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
          )}

          {/* Ghi chú */}
          <div className="space-y-1.5">
            <Label htmlFor="payment-note">Ghi chú</Label>
            <Input
              id="payment-note"
              placeholder={
                isSettle
                  ? 'Ví dụ: Tất toán toàn bộ khoản nợ...'
                  : isLent
                    ? 'Ví dụ: Thu hồi đợt 1 qua chuyển khoản...'
                    : 'Ví dụ: Trả nợ kỳ 1...'
              }
              value={note}
              onChange={(e) => {
                setNote(e.target.value)
                setErrorMessage('')
              }}
              maxLength={500}
              className="h-11 rounded-xl text-base focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>

          {/* Cảnh báo validation */}
          {(errorMessage || isInsufficientBalance || isExceedingDebt) && (
            <div
              role="alert"
              className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                {errorMessage ||
                  (isExceedingDebt
                    ? `Số tiền không được vượt quá công nợ còn lại (${formatCurrency(currentRemaining)})`
                    : `Số dư nguồn tiền "${selectedAccount?.name}" không đủ (hiện có ${formatCurrency(selectedAccountBalance)})`)}
              </span>
            </div>
          )}

          {nextRemaining === 0 && effectiveAmount > 0 && !isInsufficientBalance && !isExceedingDebt && (
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-medium text-center">
              Khoản nợ này sẽ được tất toán xong hoàn toàn!
            </div>
          )}

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-11 px-4 touch-target"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={
                accounts.length === 0 ||
                !selectedAccountId ||
                effectiveAmount <= 0 ||
                isInsufficientBalance ||
                isExceedingDebt
              }
              className="h-11 px-6 font-semibold touch-target"
            >
              {isSettle ? 'Tiếp tục tất toán' : 'Tiếp tục'}
            </Button>
          </div>
        </form>
      ) : (
        /* Bước 2: Xác nhận giao dịch */
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3 text-sm">
            <div className="flex items-center gap-2 font-semibold text-foreground pb-2 border-b border-border/50">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
              <span>Xác nhận thông tin giao dịch</span>
            </div>

            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Loại giao dịch:</span>
                <span className="font-semibold text-foreground">
                  {isSettle
                    ? isLent
                      ? 'Tất toán thu hồi nợ'
                      : 'Tất toán trả nợ'
                    : isLent
                      ? 'Thu hồi nợ'
                      : 'Trả nợ'}
                </span>
              </div>

              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Khoản công nợ:</span>
                <span className="font-medium text-foreground text-right">
                  {debt.personName} ({debt.content})
                </span>
              </div>

              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">
                  {isLent ? 'Tài khoản nhận tiền:' : 'Nguồn tiền thanh toán:'}
                </span>
                <span className="font-semibold text-foreground">{selectedAccount?.name}</span>
              </div>

              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Số tiền giao dịch:</span>
                <span
                  className={`font-bold text-base ${
                    isLent ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {isLent ? '+' : '-'}
                  {formatCurrency(effectiveAmount)}
                </span>
              </div>

              <div className="pt-2 border-t border-border/50 space-y-1.5 text-xs">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-muted-foreground">Số dư nguồn tiền:</span>
                  <span className="font-medium text-foreground flex items-center gap-1.5">
                    <span>{formatCurrency(selectedAccountBalance)}</span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <strong className="text-primary">{formatCurrency(projectedAccountBalance)}</strong>
                  </span>
                </div>

                <div className="flex justify-between items-center gap-2">
                  <span className="text-muted-foreground">Công nợ còn lại:</span>
                  <span className="font-medium text-foreground flex items-center gap-1.5">
                    <span>{formatCurrency(currentRemaining)}</span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <strong className={nextRemaining === 0 ? 'text-emerald-600' : 'text-foreground'}>
                      {formatCurrency(nextRemaining)}
                    </strong>
                  </span>
                </div>
              </div>

              {note.trim() && (
                <div className="pt-2 border-t border-border/50 flex justify-between gap-3 text-xs">
                  <span className="text-muted-foreground shrink-0">Ghi chú:</span>
                  <span className="text-foreground italic text-right break-words">{note.trim()}</span>
                </div>
              )}
            </div>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setStep('form')}
              className="h-11 px-4 touch-target"
            >
              Quay lại
            </Button>
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirmSubmit}
              className="h-11 px-6 font-semibold touch-target"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang xử lý...
                </span>
              ) : isSettle ? (
                'Xác nhận tất toán'
              ) : (
                'Xác nhận thanh toán'
              )}
            </Button>
          </div>
        </div>
      )}
    </BottomSheet>
  )
}
