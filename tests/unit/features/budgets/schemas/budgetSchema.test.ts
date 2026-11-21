import { describe, it, expect } from 'vitest'
import { budgetSchema } from '@/features/budgets/schemas/budgetSchema'

describe('budgetSchema Test', () => {
  it('chấp nhận ngân sách hợp lệ với số tiền nguyên >= 0', () => {
    const valid = {
      month: '2026-11',
      categoryId: 'cat_food',
      amount: 5000000,
    }
    const result = budgetSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('chấp nhận ngân sách với hạn mức bằng 0', () => {
    const valid = {
      month: '2026-01',
      categoryId: 'cat_other',
      amount: 0,
    }
    const result = budgetSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('báo lỗi khi tháng sai định dạng', () => {
    const invalidMonths = ['2026-1', '2026/11', '11-2026', '2026-13', 'invalid', '']
    invalidMonths.forEach((month) => {
      const result = budgetSchema.safeParse({
        month,
        categoryId: 'cat_food',
        amount: 1000000,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0]?.message).toContain('YYYY-MM')
      }
    })
  })

  it('báo lỗi khi chưa chọn danh mục', () => {
    const result = budgetSchema.safeParse({
      month: '2026-11',
      categoryId: '',
      amount: 1000000,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0]?.message).toContain('chọn danh mục')
    }
  })

  it('báo lỗi khi hạn mức là số âm', () => {
    const result = budgetSchema.safeParse({
      month: '2026-11',
      categoryId: 'cat_food',
      amount: -50000,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0]?.message).toContain('không được là số âm')
    }
  })

  it('báo lỗi khi hạn mức không phải số nguyên', () => {
    const result = budgetSchema.safeParse({
      month: '2026-11',
      categoryId: 'cat_food',
      amount: 150000.5,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0]?.message).toContain('số nguyên')
    }
  })
})
