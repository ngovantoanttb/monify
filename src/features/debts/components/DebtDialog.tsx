import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { debtSchema, type DebtFormValues } from '../schemas/debtSchema'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Debt, DebtKind } from '@shared/types'

interface DebtDialogProps {
  isOpen: boolean
  onClose: () => void
  initialData?: Debt | null
  onSubmit: (data: DebtFormValues) => Promise<void>
}

export function DebtDialog({ isOpen, onClose, initialData, onSubmit }: DebtDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DebtFormValues>({
    resolver: zodResolver(debtSchema),
    defaultValues: {
      kind: 'borrowed',
      personName: '',
      content: '',
      principal: 0,
      paidAmount: 0,
      dueDate: undefined,
      note: '',
    },
  })

  const selectedKind = watch('kind')
  const [formattedPrincipal, setFormattedPrincipal] = React.useState('')
  const [formattedPaid, setFormattedPaid] = React.useState('')
  const [dateInputVal, setDateInputVal] = React.useState('')

  React.useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset({
          kind: initialData.kind,
          personName: initialData.personName,
          content: initialData.content,
          principal: initialData.principal,
          paidAmount: initialData.paidAmount,
          dueDate: initialData.dueDate,
          note: initialData.note || '',
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
        })
        setFormattedPrincipal('')
        setFormattedPaid('')
        setDateInputVal('')
      }
    }
  }, [isOpen, initialData, reset])

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

  const handleFormSubmit = async (data: DebtFormValues) => {
    await onSubmit(data)
    onClose()
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Sửa thông tin khoản nợ' : 'Thêm khoản nợ mới'}
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        {/* Chọn loại khoản nợ: Tôi vay vs Tôi cho vay */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl">
          <button
            type="button"
            onClick={() => handleKindSelect('borrowed')}
            className={`py-2 text-sm font-semibold rounded-lg transition-colors touch-target ${
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
            className={`py-2 text-sm font-semibold rounded-lg transition-colors touch-target ${
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
            className="h-11 rounded-xl text-base"
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
            className="h-11 rounded-xl text-base"
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
              className="flex h-12 w-full rounded-xl border border-input bg-background px-3 py-2 text-lg font-bold text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <span className="absolute right-3.5 top-3 text-sm font-semibold text-muted-foreground pointer-events-none">
              VND
            </span>
          </div>
          {errors.principal && (
            <p className="text-xs text-destructive">{errors.principal.message}</p>
          )}
        </div>

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
              className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-base font-semibold text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
            className="h-11 rounded-xl text-base"
          />
        </div>

        {/* Ghi chú */}
        <div className="space-y-1.5">
          <Label htmlFor="debt-note">Ghi chú</Label>
          <Input
            id="debt-note"
            placeholder="Lãi suất, hẹn trả, điều khoản..."
            {...register('note')}
            className="h-11 rounded-xl text-base"
          />
          {errors.note && <p className="text-xs text-destructive">{errors.note.message}</p>}
        </div>

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
            disabled={isSubmitting}
            className="h-11 px-6 font-semibold touch-target"
          >
            {isSubmitting ? 'Đang lưu...' : initialData ? 'Lưu cập nhật' : 'Thêm khoản nợ'}
          </Button>
        </div>
      </form>
    </BottomSheet>
  )
}

