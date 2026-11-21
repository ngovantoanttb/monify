import { z } from 'zod'

export const accountSchema = z.object({
  name: z.string().min(1, 'Tên ví không được để trống').max(60, 'Tên ví không được vượt quá 60 ký tự'),
  type: z.enum(['cash', 'bank', 'ewallet', 'savings'], {
    errorMap: () => ({ message: 'Vui lòng chọn loại ví hợp lệ' }),
  }),
  openingBalance: z.coerce
    .number({ invalid_type_error: 'Số dư đầu phải là số nguyên' })
    .int('Số dư đầu phải là số nguyên'),
  note: z.string().max(300, 'Ghi chú không được vượt quá 300 ký tự').optional(),
})

export type AccountFormValues = z.infer<typeof accountSchema>
