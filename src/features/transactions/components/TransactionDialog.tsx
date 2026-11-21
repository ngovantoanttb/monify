import React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { transactionSchema, type TransactionFormValues } from '../schemas/transactionSchema'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Account, Category, Transaction, TransactionType } from '@shared/types'

interface TransactionDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (values: TransactionFormValues) => Promise<void>
  initialData?: Transaction | null
  accounts: Account[]
  categories: Category[]
  isLoading?: boolean
}

export function TransactionDialog({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  accounts,
  categories,
  isLoading = false,
}: TransactionDialogProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'expense',
      amount: 0,
      date: Date.now(),
      accountId: accounts[0]?.id || '',
      categoryId: categories.find((c) => c.type === 'expense')?.id || '',
      toAccountId: '',
      note: '',
    },
  })

  const selectedType = watch('type')
  const [formattedAmount, setFormattedAmount] = React.useState('')

  React.useEffect(() => {
    if (initialData) {
      reset({
        type: initialData.type,
        amount: initialData.amount,
        date: initialData.date,
        accountId: initialData.accountId,
        categoryId: initialData.categoryId || '',
        toAccountId: initialData.toAccountId || '',
        note: initialData.note || '',
      })
      setFormattedAmount(new Intl.NumberFormat('vi-VN').format(initialData.amount))
    } else {
      reset({
        type: 'expense',
        amount: 0,
        date: Date.now(),
        accountId: accounts[0]?.id || '',
        categoryId: categories.find((c) => c.type === 'expense')?.id || '',
        toAccountId: accounts[1]?.id || '',
        note: '',
      })
      setFormattedAmount('')
    }
  }, [initialData, accounts, categories, reset, isOpen])

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/[^0-9]/g, '')
    const num = rawVal ? parseInt(rawVal, 10) : 0
    setValue('amount', num)
    setFormattedAmount(num ? new Intl.NumberFormat('vi-VN').format(num) : '')
  }

  const handleTypeSelect = (type: TransactionType) => {
    setValue('type', type)
    if (type !== 'transfer') {
      const defaultCat = categories.find((c) => c.type === type)?.id || ''
      setValue('categoryId', defaultCat)
    }
  }

  const handleFormSubmit = async (data: TransactionFormValues) => {
    await onSubmit(data)
    onClose()
  }

  const filteredCategories = categories.filter((c) => c.type === selectedType)

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={initialData ? 'Sửa giao dịch' : 'Thêm giao dịch mới'}>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        {/* Loại giao dịch: 3 nút chọn nhanh */}
        <div className="grid grid-cols-3 gap-2 p-1 bg-muted rounded-xl">
          <button
            type="button"
            onClick={() => handleTypeSelect('expense')}
            className={`py-2 text-sm font-semibold rounded-lg transition-colors touch-target ${
              selectedType === 'expense'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Chi tiêu
          </button>
          <button
            type="button"
            onClick={() => handleTypeSelect('income')}
            className={`py-2 text-sm font-semibold rounded-lg transition-colors touch-target ${
              selectedType === 'income'
                ? 'bg-green-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Thu nhập
          </button>
          <button
            type="button"
            onClick={() => handleTypeSelect('transfer')}
            className={`py-2 text-sm font-semibold rounded-lg transition-colors touch-target ${
              selectedType === 'transfer'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Chuyển ví
          </button>
        </div>

        {/* Ô số tiền lớn ở đầu form (Mobile first UX) */}
        <div className="space-y-1">
          <Label htmlFor="amount-display">Số tiền (₫) *</Label>
          <div className="relative">
            <input
              id="amount-display"
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={formattedAmount}
              onChange={handleAmountChange}
              className="flex h-14 w-full rounded-xl border-2 border-primary/40 bg-background px-4 py-2 text-2xl font-bold tracking-tight text-foreground focus:border-primary focus:outline-none"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">₫</span>
          </div>
          {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
        </div>

        {/* Danh mục (chỉ hiện khi Thu hoặc Chi) */}
        {selectedType !== 'transfer' && (
          <div className="space-y-1.5">
            <Label htmlFor="tx-category">Danh mục *</Label>
            <select
              id="tx-category"
              className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-base touch-target"
              {...register('categoryId')}
            >
              <option value="">-- Chọn danh mục --</option>
              {filteredCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {errors.categoryId && <p className="text-xs text-destructive">{errors.categoryId.message}</p>}
          </div>
        )}

        {/* Ví thanh toán (hoặc Ví nguồn nếu là Chuyển khoản) */}
        <div className="space-y-1.5">
          <Label htmlFor="tx-account">{selectedType === 'transfer' ? 'Từ ví *' : 'Ví thanh toán *'}</Label>
          <select
            id="tx-account"
            className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-base touch-target"
            {...register('accountId')}
          >
            <option value="">-- Chọn ví --</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>
          {errors.accountId && <p className="text-xs text-destructive">{errors.accountId.message}</p>}
        </div>

        {/* Ví đích (chỉ khi Chuyển ví) */}
        {selectedType === 'transfer' && (
          <div className="space-y-1.5">
            <Label htmlFor="tx-to-account">Đến ví *</Label>
            <select
              id="tx-to-account"
              className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-base touch-target"
              {...register('toAccountId')}
            >
              <option value="">-- Chọn ví nhận --</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
            {errors.toAccountId && <p className="text-xs text-destructive">{errors.toAccountId.message}</p>}
          </div>
        )}

        {/* Ngày giao dịch */}
        <div className="space-y-1.5">
          <Label htmlFor="tx-date">Ngày giao dịch *</Label>
          <Controller
            control={control}
            name="date"
            render={({ field }) => {
              const dateObj = new Date(field.value || Date.now())
              const dateString = dateObj.toISOString().split('T')[0]
              return (
                <Input
                  id="tx-date"
                  type="date"
                  value={dateString}
                  onChange={(e) => {
                    const parsed = new Date(e.target.value).getTime()
                    field.onChange(parsed || Date.now())
                  }}
                  className="touch-target"
                />
              )
            }}
          />
          {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
        </div>

        {/* Ghi chú */}
        <div className="space-y-1.5">
          <Label htmlFor="tx-note">Ghi chú</Label>
          <Input id="tx-note" placeholder="Mua gì, ở đâu, với ai... (không bắt buộc)" {...register('note')} />
          {errors.note && <p className="text-xs text-destructive">{errors.note.message}</p>}
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} className="touch-target">
            Hủy
          </Button>
          <Button type="submit" variant="brand" disabled={isLoading} className="touch-target">
            {isLoading ? 'Đang lưu...' : initialData ? 'Cập nhật' : 'Lưu giao dịch'}
          </Button>
        </div>
      </form>
    </BottomSheet>
  )
}

