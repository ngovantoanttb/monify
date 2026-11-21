import { z } from 'zod'

export const goalSchema = z.object({
  name: z
    .string()
    .min(1, 'Vui lòng nhập tên mục tiêu tiết kiệm')
    .max(100, 'Tên mục tiêu tối đa 100 ký tự'),
  targetAmount: z
    .number({ invalid_type_error: 'Vui lòng nhập số tiền mục tiêu' })
    .int('Số tiền mục tiêu phải là số nguyên')
    .positive('Số tiền mục tiêu phải lớn hơn 0'),
  savedAmount: z
    .number({ invalid_type_error: 'Vui lòng nhập số tiền đã tiết kiệm' })
    .int('Số tiền đã tiết kiệm phải là số nguyên')
    .min(0, 'Số tiền đã tiết kiệm không được âm'),
  deadline: z.number().optional().nullable(),
  note: z.string().max(300, 'Ghi chú tối đa 300 ký tự').optional().or(z.literal('')),
})

export type GoalFormValues = z.infer<typeof goalSchema>

