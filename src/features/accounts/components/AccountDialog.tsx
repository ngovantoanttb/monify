import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { accountSchema, type AccountFormValues } from '../schemas/accountSchema'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Account } from '@shared/types'

interface AccountDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (values: AccountFormValues) => Promise<void>
  initialData?: Account | null
  isLoading?: boolean
}

export function AccountDialog({ isOpen, onClose, onSubmit, initialData, isLoading = false }: AccountDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: '',
      type: 'cash',
      openingBalance: 0,
      note: '',
    },
  })

  React.useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        type: initialData.type,
        openingBalance: initialData.openingBalance,
        note: initialData.note || '',
      })
    } else {
      reset({
        name: '',
        type: 'cash',
        openingBalance: 0,
        note: '',
      })
    }
  }, [initialData, reset, isOpen])

  const handleFormSubmit = async (data: AccountFormValues) => {
    await onSubmit(data)
    onClose()
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={initialData ? 'Sửa thông tin ví' : 'Thêm ví mới'}>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        {/* Tên ví */}
        <div className="space-y-1.5">
          <Label htmlFor="account-name">Tên ví *</Label>
          <Input id="account-name" placeholder="Ví dụ: Tiền mặt, Techcombank..." {...register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        {/* Loại ví */}
        <div className="space-y-1.5">
          <Label htmlFor="account-type">Loại ví *</Label>
          <select
            id="account-type"
            className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-base touch-target"
            {...register('type')}
          >
            <option value="cash">Tiền mặt</option>
            <option value="bank">Tài khoản ngân hàng</option>
            <option value="ewallet">Ví điện tử (Momo, ZaloPay...)</option>
            <option value="savings">Sổ tiết kiệm</option>
          </select>
          {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
        </div>

        {/* Số dư ban đầu */}
        <div className="space-y-1.5">
          <Label htmlFor="account-balance">Số dư ban đầu (₫)</Label>
          <Input
            id="account-balance"
            type="number"
            inputMode="numeric"
            placeholder="0"
            {...register('openingBalance', { valueAsNumber: true })}
          />
          {errors.openingBalance && <p className="text-xs text-destructive">{errors.openingBalance.message}</p>}
        </div>

        {/* Ghi chú */}
        <div className="space-y-1.5">
          <Label htmlFor="account-note">Ghi chú</Label>
          <Input id="account-note" placeholder="Thông tin thêm (không bắt buộc)" {...register('note')} />
          {errors.note && <p className="text-xs text-destructive">{errors.note.message}</p>}
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
