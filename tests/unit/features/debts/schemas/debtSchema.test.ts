import { describe, it, expect } from 'vitest'
import { debtSchema } from '@/features/debts/schemas/debtSchema'

describe('debtSchema Test', () => {
  it('chấp nhận khoản nợ hợp lệ (Tôi vay và Tôi cho vay)', () => {
    const validBorrowed = {
      kind: 'borrowed' as const,
      personName: 'Nguyễn Văn A',
      content: 'Vay tiền mua laptop',
      principal: 20000000,
      paidAmount: 5000000,
      dueDate: Date.now() + 86400000 * 30,
    }
    expect(debtSchema.safeParse(validBorrowed).success).toBe(true)

    const validLent = {
      kind: 'lent' as const,
      personName: 'Trần Thị B',
      content: 'Cho mượn đóng học phí',
      principal: 5000000,
      paidAmount: 0,
    }
    expect(debtSchema.safeParse(validLent).success).toBe(true)
  })

  it('báo lỗi khi số tiền đã thanh toán vượt quá số tiền gốc', () => {
    const invalid = {
      kind: 'borrowed' as const,
      personName: 'Nguyễn Văn A',
      content: 'Vay tiền',
      principal: 10000000,
      paidAmount: 12000000, // > principal
    }
    const result = debtSchema.safeParse(invalid)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0]?.message).toContain('không được vượt quá số tiền gốc')
    }
  })

  it('báo lỗi khi số tiền gốc <= 0', () => {
    const invalid = {
      kind: 'lent' as const,
      personName: 'Bạn C',
      content: 'Cho vay',
      principal: 0,
      paidAmount: 0,
    }
    const result = debtSchema.safeParse(invalid)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0]?.message).toContain('lớn hơn 0')
    }
  })

  it('báo lỗi khi để trống người liên quan hoặc nội dung', () => {
    const invalid = {
      kind: 'lent' as const,
      personName: '',
      content: '',
      principal: 1000000,
      paidAmount: 0,
    }
    const result = debtSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })
})

