import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { categorySchema, type CategoryFormValues } from '../schemas/categorySchema'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Category } from '@shared/types'

const PRESET_COLORS = [
  '#EF4444',
  '#F97316',
  '#F59E0B',
  '#10B981',
  '#0D9488',
  '#06B6D4',
  '#3B82F6',
  '#6366F1',
  '#8B5CF6',
  '#EC4899',
  '#64748B',
  '#0F766E',
]

interface CategoryDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (values: CategoryFormValues) => Promise<void>
  initialData?: Category | null
  defaultType?: 'income' | 'expense'
  isLoading?: boolean
}

export function CategoryDialog({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  defaultType = 'expense',
  isLoading = false,
}: CategoryDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      type: defaultType,
      icon: 'Tag',
      color: '#0D9488',
    },
  })

  const selectedColor = watch('color')

  React.useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        type: initialData.type,
        icon: initialData.icon || 'Tag',
        color: initialData.color,
      })
    } else {
      reset({
        name: '',
        type: defaultType,
        icon: 'Tag',
        color: '#0D9488',
      })
    }
  }, [initialData, defaultType, reset, isOpen])

  const handleFormSubmit = async (data: CategoryFormValues) => {
    await onSubmit(data)
    onClose()
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={initialData ? 'Sửa danh mục' : 'Thêm danh mục mới'}>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        {/* Tên danh mục */}
        <div className="space-y-1.5">
          <Label htmlFor="category-name">Tên danh mục *</Label>
          <Input id="category-name" placeholder="Ví dụ: Cà phê, Xăng xe..." {...register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        {/* Loại danh mục */}
        <div className="space-y-1.5">
          <Label htmlFor="category-type">Phân loại *</Label>
          <select
            id="category-type"
            className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-base touch-target"
            {...register('type')}
          >
            <option value="expense">Khoản chi tiêu (Expense)</option>
            <option value="income">Khoản thu nhập (Income)</option>
          </select>
          {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
        </div>

        {/* Chọn màu sắc */}
        <div className="space-y-1.5">
          <Label>Màu sắc nhận diện</Label>
          <div className="flex flex-wrap gap-2 pt-1">
            {PRESET_COLORS.map((col) => (
              <button
                type="button"
                key={col}
                onClick={() => setValue('color', col)}
                className="w-8 h-8 rounded-full border-2 transition-transform active:scale-90"
                style={{
                  backgroundColor: col,
                  borderColor: selectedColor === col ? 'hsl(var(--foreground))' : 'transparent',
                }}
                aria-label={`Màu ${col}`}
              />
            ))}
          </div>
          {errors.color && <p className="text-xs text-destructive">{errors.color.message}</p>}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} className="touch-target">
            Hủy
          </Button>
          <Button type="submit" variant="brand" disabled={isLoading} className="touch-target">
            {isLoading ? 'Đang lưu...' : initialData ? 'Cập nhật' : 'Thêm mới'}
          </Button>
        </div>
      </form>
    </BottomSheet>
  )
}
