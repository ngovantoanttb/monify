import { z } from 'zod'

export const transactionSchema = z
  .object({
    type: z.enum(['income', 'expense', 'transfer'], {
      errorMap: () => ({ message: 'Vui lòng chọn loại giao dịch' }),
    }),
    amount: z.coerce
      .number({ invalid_type_error: 'Số tiền phải là số nguyên dương' })
      .int('Số tiền phải là số nguyên')
      .positive('Số tiền phải lớn hơn 0'),
    date: z.coerce.number().min(1, 'Vui lòng chọn ngày giao dịch'),
    accountId: z.string().min(1, 'Vui lòng chọn ví thanh toán'),
    categoryId: z.string().optional(),
    toAccountId: z.string().optional(),
    note: z.string().max(500, 'Ghi chú tối đa 500 ký tự').optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'transfer') {
      if (!data.toAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['toAccountId'],
          message: 'Vui lòng chọn ví nhận tiền',
        })
      } else if (data.toAccountId === data.accountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['toAccountId'],
          message: 'Ví nhận tiền phải khác ví chuyển tiền',
        })
      }
    } else {
      if (!data.categoryId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['categoryId'],
          message: 'Vui lòng chọn danh mục thu/chi',
        })
      }
    }
  })

export type TransactionFormValues = z.infer<typeof transactionSchema>

