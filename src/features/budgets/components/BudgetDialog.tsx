import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { budgetSchema, type BudgetFormValues } from '../schemas/budgetSchema'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Trash2 } from 'lucide-react'
import type { Category, Budget } from '@shared/types'

interface BudgetDialogProps {
  isOpen: boolean
  onClose: () => void
  month: string // yyyy-MM
  categories: Category[]
  category?: Category | null
  initialBudget?: Budget | null
  onSubmit: (data: BudgetFormValues) => Promise<void>
  onDelete?: (month: string, categoryId: string) => Promise<void>
}

export function BudgetDialog({
  isOpen,
  onClose,
  month,
  categories,
  category,
  initialBudget,
  onSubmit,
  onDelete,
}: BudgetDialogProps) {
  const expenseCategories = React.useMemo(
    () => categories.filter((c) => c.type === 'expense'),
    [categories]
  )

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      month,
      categoryId: category?.id || expenseCategories[0]?.id || '',
      amount: initialBudget?.amount || 0,
    },
  })

  const [formattedAmount, setFormattedAmount] = React.useState('')

  React.useEffect(() => {
    if (isOpen) {
      const firstExpenseCat = categories.find((c) => c.type === 'expense')
      const defaultCatId = category?.id || initialBudget?.categoryId || firstExpenseCat?.id || ''
      const defaultAmount = initialBudget?.amount || 0

      reset({
        month,
        categoryId: defaultCatId,
        amount: defaultAmount,
      })

      if (defaultAmount > 0) {
        setFormattedAmount(new Intl.NumberFormat('vi-VN').format(defaultAmount))
      } else {
        setFormattedAmount('')
      }
    }
  }, [isOpen, month, category, initialBudget, reset, categories])

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '')
    if (!rawVal) {
      setValue('amount', 0)
      setFormattedAmount('')
      return
    }
    const num = parseInt(rawVal, 10)
    setValue('amount', num)
    setFormattedAmount(new Intl.NumberFormat('vi-VN').format(num))
  }

  const handleAddAmount = (addValue: number) => {
    const current = watch('amount') || 0
    const next = current + addValue
    setValue('amount', next)
    setFormattedAmount(new Intl.NumberFormat('vi-VN').format(next))
  }

  const handleFormSubmit = async (data: BudgetFormValues) => {
    await onSubmit(data)
    onClose()
  }

  const handleDelete = async () => {
    if (onDelete && initialBudget) {
      if (window.confirm('Bạn có chắc chắn muốn xóa hạn mức ngân sách này?')) {
        await onDelete(month, initialBudget.categoryId)
        onClose()
      }
    }
  }

  // Parse display month
  const [yearStr, monthStr] = month.split('-')
  const displayMonth = `Tháng ${parseInt(monthStr || '1', 10)}/${yearStr || ''}`

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={initialBudget ? 'Cập nhật hạn mức ngân sách' : 'Đặt hạn mức ngân sách'}
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        {/* Thông tin tháng */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border/50 text-sm">
          <span className="text-muted-foreground">Kỳ ngân sách:</span>
          <span className="font-semibold text-foreground">{displayMonth}</span>
        </div>

        {/* Danh mục chi tiêu */}
        <div className="space-y-1.5">
          <Label htmlFor="categoryId">Danh mục chi tiêu</Label>
          {category ? (
            <div className="flex items-center gap-2.5 p-3 rounded-xl border bg-muted/30">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0"
                style={{ backgroundColor: category.color }}
              >
                {category.name.slice(0, 1).toUpperCase()}
              </div>
              <span className="font-medium text-sm text-foreground">{category.name}</span>
            </div>
          ) : (
            <select
              id="categoryId"
              {...register('categoryId')}
              className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-base text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">-- Chọn danh mục --</option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          {errors.categoryId && (
            <p className="text-xs text-destructive">{errors.categoryId.message}</p>
          )}
        </div>

        {/* Số tiền hạn mức */}
        <div className="space-y-1.5">
          <Label htmlFor="amount">Hạn mức chi tối đa (đ)</Label>
          <div className="relative">
            <input
              id="amount"
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={formattedAmount}
              onChange={handleAmountChange}
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
              onClick={() => handleAddAmount(500000)}
              className="px-2.5 py-1 text-xs rounded-lg border bg-card hover:bg-muted font-medium transition-colors touch-target"
            >
              +500k
            </button>
            <button
              type="button"
              onClick={() => handleAddAmount(1000000)}
              className="px-2.5 py-1 text-xs rounded-lg border bg-card hover:bg-muted font-medium transition-colors touch-target"
            >
              +1 tr
            </button>
            <button
              type="button"
              onClick={() => handleAddAmount(2000000)}
              className="px-2.5 py-1 text-xs rounded-lg border bg-card hover:bg-muted font-medium transition-colors touch-target"
            >
              +2 tr
            </button>
            <button
              type="button"
              onClick={() => handleAddAmount(5000000)}
              className="px-2.5 py-1 text-xs rounded-lg border bg-card hover:bg-muted font-medium transition-colors touch-target"
            >
              +5 tr
            </button>
          </div>

          {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
        </div>

        {/* Action buttons */}
        <div className="pt-2 flex items-center justify-between gap-3">
          {initialBudget && onDelete ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleDelete}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive h-11 px-3 touch-target"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              <span>Xóa</span>
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-11 px-4 touch-target"
            >
              Hủy
            </Button>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 h-11 font-semibold touch-target"
          >
            {isSubmitting ? 'Đang lưu...' : initialBudget ? 'Lưu cập nhật' : 'Đặt hạn mức'}
          </Button>
        </div>
      </form>
    </BottomSheet>
  )
}
