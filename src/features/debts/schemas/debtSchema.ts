import { z } from 'zod'

export const debtSchema = z
  .object({
    kind: z.enum(['borrowed', 'lent'], {
      required_error: 'Vui lòng chọn loại khoản nợ (Tôi vay hoặc Tôi cho vay)',
    }),
    personName: z
      .string()
      .min(1, 'Vui lòng nhập tên người liên quan')
      .max(100, 'Tên người liên quan tối đa 100 ký tự'),
    content: z
      .string()
      .min(1, 'Vui lòng nhập nội dung khoản nợ')
      .max(300, 'Nội dung tối đa 300 ký tự'),
    principal: z
      .number({ invalid_type_error: 'Vui lòng nhập số tiền gốc' })
      .int('Số tiền gốc phải là số nguyên')
      .positive('Số tiền gốc phải lớn hơn 0'),
    paidAmount: z
      .number({ invalid_type_error: 'Vui lòng nhập số tiền đã thanh toán' })
      .int('Số tiền đã thanh toán phải là số nguyên')
      .min(0, 'Số tiền đã thanh toán không được âm'),
    dueDate: z.number().optional().nullable(),
    note: z.string().max(300, 'Ghi chú tối đa 300 ký tự').optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (data.paidAmount > data.principal) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['paidAmount'],
        message: 'Số tiền đã thanh toán không được vượt quá số tiền gốc',
      })
    }
  })

export type DebtFormValues = z.infer<typeof debtSchema>

export const createDebtSchema = debtSchema.and(
  z.object({
    accountId: z.string().min(1, 'Vui lòng chọn nguồn tiền để cộng/trừ'),
  })
)

export type CreateDebtFormValues = z.infer<typeof createDebtSchema>

export const debtPaymentSchema = z.object({
  accountId: z.string().min(1, 'Vui lòng chọn nguồn tiền'),
  mode: z.enum(['payment', 'settle']),
  amount: z
    .number({ invalid_type_error: 'Vui lòng nhập số tiền giao dịch' })
    .int('Số tiền phải là số nguyên')
    .positive('Số tiền giao dịch phải lớn hơn 0'),
  note: z.string().max(500, 'Ghi chú tối đa 500 ký tự').optional().or(z.literal('')),
})

export type DebtPaymentFormValues = z.infer<typeof debtPaymentSchema>
