import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  debtSchema,
  createDebtSchema,
  type DebtFormValues,
} from '../schemas/debtSchema'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/finance'
import { AlertCircle, Wallet } from 'lucide-react'
import type { Account, Debt, DebtKind } from '@shared/types'

export type DebtDialogSubmitValues = DebtFormValues & {
  accountId?: string
  idempotencyKey?: string
}

interface DebtDialogProps {
  isOpen: boolean
  onClose: () => void
  initialData?: Debt | null
  accounts?: Account[]
  accountBalances?: Record<string, number>
  onSubmit: (data: DebtDialogSubmitValues) => Promise<void>
}

function generateAttemptKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `debt_create_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export function DebtDialog({
  isOpen,
  onClose,
  initialData,
  accounts = [],
  accountBalances = {},
  onSubmit,
}: DebtDialogProps) {
  const isEditing = Boolean(initialData)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DebtDialogSubmitValues>({
    resolver: zodResolver(isEditing ? debtSchema : createDebtSchema),
    defaultValues: {
      kind: 'borrowed',
      personName: '',
      content: '',
      principal: 0,
      paidAmount: 0,
      dueDate: undefined,
      note: '',
      accountId: '',
    },
  })

  const selectedKind = watch('kind')
  const principalVal = watch('principal') || 0
  const paidVal = watch('paidAmount') || 0
  const selectedAccountId = watch('accountId') || ''

  const [formattedPrincipal, setFormattedPrincipal] = React.useState('')
  const [formattedPaid, setFormattedPaid] = React.useState('')
  const [dateInputVal, setDateInputVal] = React.useState('')

  const isSubmittingRef = React.useRef(false)
  const idempotencyKeyRef = React.useRef(generateAttemptKey())

  React.useEffect(() => {
    if (isOpen) {
      isSubmittingRef.current = false
      idempotencyKeyRef.current = generateAttemptKey()
      if (initialData) {
        reset({
          kind: initialData.kind,
          personName: initialData.personName,
          content: initialData.content,
          principal: initialData.principal,
          paidAmount: initialData.paidAmount,
          dueDate: initialData.dueDate,
          note: initialData.note || '',
          accountId: '',
        })
        setFormattedPrincipal(new Intl.NumberFormat('vi-VN').format(initialData.principal))
        setFormattedPaid(
          initialData.paidAmount > 0
            ? new Intl.NumberFormat('vi-VN').format(initialData.paidAmount)
            : ''
        )
        if (initialData.dueDate) {
          const d = new Date(initialData.dueDate)
          setDateInputVal(d.toISOString().split('T')[0] || '')
        } else {
          setDateInputVal('')
        }
      } else {
        reset({
          kind: 'borrowed',
          personName: '',
          content: '',
          principal: 0,
          paidAmount: 0,
          dueDate: undefined,
          note: '',
          accountId: accounts[0]?.id || '',
        })
        setFormattedPrincipal('')
        setFormattedPaid('')
        setDateInputVal('')
      }
    }
  }, [isOpen, initialData, accounts, reset])

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) || null
  const selectedAccountBalance =
    selectedAccountId && accountBalances[selectedAccountId] !== undefined
      ? accountBalances[selectedAccountId]!
      : selectedAccount?.openingBalance ?? 0

  const initialCashFlowAmount = Math.max(0, Math.round(principalVal) - Math.round(paidVal))
  const isBorrowed = selectedKind === 'borrowed'
  const projectedBalance = isBorrowed
    ? selectedAccountBalance + initialCashFlowAmount
    : selectedAccountBalance - initialCashFlowAmount
  const isInsufficientBalance =
    !isEditing &&
    !isBorrowed &&
    Boolean(selectedAccountId) &&
    initialCashFlowAmount > 0 &&
    selectedAccountBalance < initialCashFlowAmount

  const handleKindSelect = (k: DebtKind) => {
    setValue('kind', k)
  }

  const handlePrincipalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '')
    if (!rawVal) {
      setValue('principal', 0)
      setFormattedPrincipal('')
      return
    }
    const num = parseInt(rawVal, 10)
    setValue('principal', num)
    setFormattedPrincipal(new Intl.NumberFormat('vi-VN').format(num))
  }

  const handlePaidChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '')
    if (!rawVal) {
      setValue('paidAmount', 0)
      setFormattedPaid('')
      return
    }
    const num = parseInt(rawVal, 10)
    setValue('paidAmount', num)
    setFormattedPaid(new Intl.NumberFormat('vi-VN').format(num))
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateInputVal(e.target.value)
    if (e.target.value) {
      const ms = new Date(e.target.value).getTime()
      setValue('dueDate', ms)
    } else {
      setValue('dueDate', undefined)
    }
  }

  const handleFormSubmit = async (data: DebtDialogSubmitValues) => {
    if (isSubmittingRef.current || isInsufficientBalance) return
    isSubmittingRef.current = true
    try {
      await onSubmit({
        ...data,
        idempotencyKey: !isEditing ? idempotencyKeyRef.current : undefined,
      })
      onClose()
    } catch {
      idempotencyKeyRef.current = generateAttemptKey()
    } finally {
      isSubmittingRef.current = false
    }
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={() => {
        if (!isSubmitting) onClose()
      }}
      title={initialData ? 'Sửa thông tin khoản nợ' : 'Thêm khoản nợ mới'}
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        {/* Chọn loại khoản nợ: Tôi vay vs Tôi cho vay */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl">
          <button
            type="button"
            onClick={() => handleKindSelect('borrowed')}
            className={`py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors touch-target text-center truncate px-1.5 ${
              selectedKind === 'borrowed'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Tôi vay (Phải trả)
          </button>
          <button
            type="button"
            onClick={() => handleKindSelect('lent')}
            className={`py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors touch-target text-center truncate px-1.5 ${
              selectedKind === 'lent'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Tôi cho vay (Phải thu)
          </button>
        </div>

        {/* Người liên quan */}
        <div className="space-y-1.5">
          <Label htmlFor="person-name">
            {selectedKind === 'borrowed' ? 'Người cho tôi vay *' : 'Người vay tiền của tôi *'}
          </Label>
          <Input
            id="person-name"
            placeholder="Ví dụ: Anh Nam, Ngân hàng, Bạn Tuấn..."
            {...register('personName')}
            className="h-11 rounded-xl text-base focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          {errors.personName && (
            <p className="text-xs text-destructive">{errors.personName.message}</p>
          )}
        </div>

        {/* Nội dung khoản nợ */}
        <div className="space-y-1.5">
          <Label htmlFor="debt-content">Nội dung khoản nợ *</Label>
          <Input
            id="debt-content"
            placeholder="Ví dụ: Vay mua xe, Tiền học phí, Vay tiêu dùng..."
            {...register('content')}
            className="h-11 rounded-xl text-base focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          {errors.content && (
            <p className="text-xs text-destructive">{errors.content.message}</p>
          )}
        </div>

        {/* Số tiền gốc */}
        <div className="space-y-1.5">
          <Label htmlFor="principal-amount">Số tiền gốc (đ) *</Label>
          <div className="relative">
            <input
              id="principal-amount"
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={formattedPrincipal}
              onChange={handlePrincipalChange}
              className="flex h-12 w-full rounded-xl border border-input bg-background px-3 py-2 text-lg font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:outline-none"
            />
            <span className="absolute right-3.5 top-3 text-sm font-semibold text-muted-foreground pointer-events-none">
              VND
            </span>
          </div>
          {errors.principal && (
            <p className="text-xs text-destructive">{errors.principal.message}</p>
          )}
        </div>

        {/* Nguồn tiền cộng/trừ khi tạo mới */}
        {!isEditing && (
          <div className="space-y-1.5">
            <Label htmlFor="debt-account">
              {isBorrowed
                ? 'Nguồn tiền nhận khoản vay (cộng vào ví) *'
                : 'Nguồn tiền cho vay (trừ khỏi ví) *'}
            </Label>
            {accounts.length === 0 ? (
              <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/10 text-xs text-destructive">
                Bạn chưa có tài khoản/ví nào. Vui lòng tạo ví trong mục Ví trước khi tạo khoản công nợ.
              </div>
            ) : (
              <>
                <select
                  id="debt-account"
                  value={selectedAccountId}
                  onChange={(e) => setValue('accountId', e.target.value, { shouldValidate: true })}
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
                {errors.accountId && (
                  <p className="text-xs text-destructive">{errors.accountId.message}</p>
                )}

                {selectedAccount && (
                  <div
                    className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                      isInsufficientBalance
                        ? 'bg-destructive/10 border-destructive/30 text-destructive'
                        : 'bg-muted/40 border-border/60 text-muted-foreground'
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
                    {initialCashFlowAmount > 0 && (
                      <span className="shrink-0 font-medium">
                        Sau tạo:{' '}
                        <strong
                          className={
                            isInsufficientBalance
                              ? 'text-destructive'
                              : isBorrowed
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-amber-600 dark:text-amber-400'
                          }
                        >
                          {formatCurrency(projectedBalance)}
                        </strong>
                      </span>
                    )}
                  </div>
                )}

                {isInsufficientBalance && (
                  <div
                    role="alert"
                    className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-start gap-2"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Số dư nguồn tiền "{selectedAccount?.name}" không đủ để cho vay{' '}
                      {formatCurrency(initialCashFlowAmount)} (hiện có{' '}
                      {formatCurrency(selectedAccountBalance)}).
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Đã thanh toán trước đó */}
        <div className="space-y-1.5">
          <Label htmlFor="paid-amount">
            {selectedKind === 'borrowed' ? 'Đã trả trước đó (đ)' : 'Đã thu trước đó (đ)'}
          </Label>
          <div className="relative">
            <input
              id="paid-amount"
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={formattedPaid}
              onChange={handlePaidChange}
              className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-base font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:outline-none"
            />
            <span className="absolute right-3.5 top-2.5 text-sm font-semibold text-muted-foreground pointer-events-none">
              VND
            </span>
          </div>
          {errors.paidAmount && (
            <p className="text-xs text-destructive">{errors.paidAmount.message}</p>
          )}
        </div>

        {/* Ngày đến hạn */}
        <div className="space-y-1.5">
          <Label htmlFor="due-date">Ngày đến hạn (không bắt buộc)</Label>
          <Input
            id="due-date"
            type="date"
            value={dateInputVal}
            onChange={handleDateChange}
            className="h-11 rounded-xl text-base focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>

        {/* Ghi chú */}
        <div className="space-y-1.5">
          <Label htmlFor="debt-note">Ghi chú</Label>
          <Input
            id="debt-note"
            placeholder="Lãi suất, hẹn trả, điều khoản..."
            {...register('note')}
            className="h-11 rounded-xl text-base focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          {errors.note && <p className="text-xs text-destructive">{errors.note.message}</p>}
        </div>

        {initialData && (
          <div className="p-2.5 rounded-xl bg-muted/50 border border-border/60 text-xs text-muted-foreground">
            Lưu ý: Chỉnh sửa tại đây là điều chỉnh thông tin công nợ và không làm thay đổi số dư nguồn tiền. Để trả nợ hoặc thu hồi nợ có phát sinh dòng tiền, hãy dùng chức năng Ghi nhận trả/thu nợ hoặc Tất toán.
          </div>
        )}

        {/* Buttons */}
        <div className="pt-2 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={onClose}
            className="h-11 px-4 touch-target"
          >
            Hủy
          </Button>
          <Button
            type="submit"
            disabled={
              isSubmitting ||
              (!isEditing && (accounts.length === 0 || isInsufficientBalance))
            }
            className="h-11 px-6 font-semibold touch-target"
          >
            {isSubmitting ? 'Đang lưu...' : initialData ? 'Lưu cập nhật' : 'Thêm khoản nợ'}
          </Button>
        </div>
      </form>
    </BottomSheet>
  )
}
