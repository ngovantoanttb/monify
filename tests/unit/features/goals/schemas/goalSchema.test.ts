import { describe, it, expect } from 'vitest'
import { goalSchema } from '@/features/goals/schemas/goalSchema'

describe('goalSchema Test', () => {
  it('chấp nhận mục tiêu hợp lệ với targetAmount > 0 và savedAmount >= 0', () => {
    const valid = {
      name: 'Mua xe máy',
      targetAmount: 30000000,
      savedAmount: 10000000,
      deadline: Date.now() + 86400000 * 30,
      note: 'Honda Vision',
    }
    const result = goalSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('báo lỗi khi để trống tên mục tiêu', () => {
    const result = goalSchema.safeParse({
      name: '',
      targetAmount: 5000000,
      savedAmount: 0,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0]?.message).toContain('tên mục tiêu')
    }
  })

  it('báo lỗi khi targetAmount <= 0', () => {
    const result = goalSchema.safeParse({
      name: 'Du lịch',
      targetAmount: 0,
      savedAmount: 0,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0]?.message).toContain('lớn hơn 0')
    }
  })

  it('báo lỗi khi savedAmount < 0', () => {
    const result = goalSchema.safeParse({
      name: 'Quỹ khẩn cấp',
      targetAmount: 20000000,
      savedAmount: -500000,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0]?.message).toContain('không được âm')
    }
  })
})

