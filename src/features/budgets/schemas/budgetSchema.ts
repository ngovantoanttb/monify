import { z } from 'zod'

export const budgetSchema = z.object({
  month: z
    .string()
    .regex(/^[0-9]{4}-(0[1-9]|1[0-2])$/, 'Tháng phải có định dạng YYYY-MM (ví dụ: 2026-11)'),
  categoryId: z.string().min(1, 'Vui lòng chọn danh mục chi tiêu'),
  amount: z
    .number({ invalid_type_error: 'Vui lòng nhập số tiền hợp lệ' })
    .int('Hạn mức phải là số nguyên')
    .min(0, 'Hạn mức không được là số âm'),
})

export type BudgetFormValues = z.infer<typeof budgetSchema>

