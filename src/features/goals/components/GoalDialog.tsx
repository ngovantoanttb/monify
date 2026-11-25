import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { goalSchema, type GoalFormValues } from '../schemas/goalSchema'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Goal } from '@shared/types'

interface GoalDialogProps {
  isOpen: boolean
  onClose: () => void
  initialData?: Goal | null
  onSubmit: (data: GoalFormValues) => Promise<void>
}

export function GoalDialog({ isOpen, onClose, initialData, onSubmit }: GoalDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: '',
      targetAmount: 0,
      savedAmount: 0,
      deadline: undefined,
      note: '',
    },
  })

  const [formattedTarget, setFormattedTarget] = React.useState('')
  const [formattedSaved, setFormattedSaved] = React.useState('')
  const [dateInputVal, setDateInputVal] = React.useState('')

  React.useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset({
          name: initialData.name,
          targetAmount: initialData.targetAmount,
          savedAmount: initialData.savedAmount,
          deadline: initialData.deadline,
          note: initialData.note || '',
        })
        setFormattedTarget(new Intl.NumberFormat('vi-VN').format(initialData.targetAmount))
        setFormattedSaved(
          initialData.savedAmount > 0
            ? new Intl.NumberFormat('vi-VN').format(initialData.savedAmount)
            : ''
        )
        if (initialData.deadline) {
          const d = new Date(initialData.deadline)
          setDateInputVal(d.toISOString().split('T')[0] || '')
        } else {
          setDateInputVal('')
        }
      } else {
        reset({
          name: '',
          targetAmount: 0,
          savedAmount: 0,
          deadline: undefined,
          note: '',
        })
        setFormattedTarget('')
        setFormattedSaved('')
        setDateInputVal('')
      }
    }
  }, [isOpen, initialData, reset])

  const handleTargetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '')
    if (!rawVal) {
      setValue('targetAmount', 0)
      setFormattedTarget('')
      return
    }
    const num = parseInt(rawVal, 10)
    setValue('targetAmount', num)
    setFormattedTarget(new Intl.NumberFormat('vi-VN').format(num))
  }

  const handleSavedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '')
    if (!rawVal) {
      setValue('savedAmount', 0)
      setFormattedSaved('')
      return
    }
    const num = parseInt(rawVal, 10)
    setValue('savedAmount', num)
    setFormattedSaved(new Intl.NumberFormat('vi-VN').format(num))
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateInputVal(e.target.value)
    if (e.target.value) {
      const ms = new Date(e.target.value).getTime()
      setValue('deadline', ms)
    } else {
      setValue('deadline', undefined)
    }
  }

  const handleFormSubmit = async (data: GoalFormValues) => {
    await onSubmit(data)
    onClose()
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Sửa mục tiêu tiết kiệm' : 'Thêm mục tiêu tiết kiệm mới'}
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        {/* Tên mục tiêu */}
        <div className="space-y-1.5">
          <Label htmlFor="goal-name">Tên mục tiêu *</Label>
          <Input
            id="goal-name"
            placeholder="Ví dụ: Mua iPhone 16, Quỹ khẩn cấp, Mua xe..."
            {...register('name')}
            className="h-11 rounded-xl text-base"
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        {/* Số tiền mục tiêu */}
        <div className="space-y-1.5">
          <Label htmlFor="target-amount">Số tiền cần tiết kiệm (đ) *</Label>
          <div className="relative">
            <input
              id="target-amount"
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={formattedTarget}
              onChange={handleTargetChange}
              className="flex h-12 w-full rounded-xl border border-input bg-background px-3 py-2 text-lg font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:outline-none"
            />
            <span className="absolute right-3.5 top-3 text-sm font-semibold text-muted-foreground pointer-events-none">
              VND
            </span>
          </div>
          {errors.targetAmount && (
            <p className="text-xs text-destructive">{errors.targetAmount.message}</p>
          )}
        </div>

        {/* Đã tích lũy ban đầu */}
        <div className="space-y-1.5">
          <Label htmlFor="saved-amount">Đã tích lũy được (đ)</Label>
          <div className="relative">
            <input
              id="saved-amount"
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={formattedSaved}
              onChange={handleSavedChange}
              className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-base font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:outline-none"
            />
            <span className="absolute right-3.5 top-2.5 text-sm font-semibold text-muted-foreground pointer-events-none">
              VND
            </span>
          </div>
          {errors.savedAmount && (
            <p className="text-xs text-destructive">{errors.savedAmount.message}</p>
          )}
        </div>

        {/* Hạn chót (Deadline) */}
        <div className="space-y-1.5">
          <Label htmlFor="deadline">Hạn hoàn thành (không bắt buộc)</Label>
          <Input
            id="deadline"
            type="date"
            value={dateInputVal}
            onChange={handleDateChange}
            className="h-11 rounded-xl text-base"
          />
        </div>

        {/* Ghi chú */}
        <div className="space-y-1.5">
          <Label htmlFor="goal-note">Ghi chú thêm</Label>
          <Input
            id="goal-note"
            placeholder="Kế hoạch, lưu ý..."
            {...register('note')}
            className="h-11 rounded-xl text-base"
          />
          {errors.note && <p className="text-xs text-destructive">{errors.note.message}</p>}
        </div>

        {/* Action buttons */}
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
            {isSubmitting ? 'Đang lưu...' : initialData ? 'Lưu cập nhật' : 'Tạo mục tiêu'}
          </Button>
        </div>
      </form>
    </BottomSheet>
  )
}

