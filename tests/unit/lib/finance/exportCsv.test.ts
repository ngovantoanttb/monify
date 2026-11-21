import { describe, it, expect } from 'vitest'
import { exportTransactionsToCsv } from '@/lib/finance/exportCsv'
import type { Transaction, Category, Account } from '@shared/types'

describe('CSV Export with UTF-8 BOM Test', () => {
  const categories: Category[] = [
    {
      id: 'cat_food',
      name: 'Ăn uống & Cà phê',
      type: 'expense',
      icon: 'Utensils',
      color: '#EF4444',
      isDefault: true,
      createdAt: 1000,
      updatedAt: 1000,
    },
    {
      id: 'cat_salary',
      name: 'Tiền lương chính thức',
      type: 'income',
      icon: 'Banknote',
      color: '#10B981',
      isDefault: true,
      createdAt: 1000,
      updatedAt: 1000,
    },
  ]

  const accounts: Account[] = [
    {
      id: 'acc_wallet',
      name: 'Ví tiền mặt',
      type: 'cash',
      openingBalance: 1000000,
      createdAt: 1000,
      updatedAt: 1000,
    },
    {
      id: 'acc_bank',
      name: 'Tài khoản Vietcombank',
      type: 'bank',
      openingBalance: 50000000,
      createdAt: 1000,
      updatedAt: 1000,
    },
  ]

  const transactions: Transaction[] = [
    {
      id: 'tx_1',
      type: 'expense',
      amount: 45000,
      date: new Date('2026-11-20T10:00:00Z').getTime(),
      accountId: 'acc_wallet',
      categoryId: 'cat_food',
      note: 'Phở bò "đặc biệt"',
      createdAt: 1000,
      updatedAt: 1000,
    },
    {
      id: 'tx_2',
      type: 'income',
      amount: 25000000,
      date: new Date('2026-11-05T08:00:00Z').getTime(),
      accountId: 'acc_bank',
      categoryId: 'cat_salary',
      note: 'Lương tháng 10',
      createdAt: 2000,
      updatedAt: 2000,
    },
    {
      id: 'tx_3',
      type: 'transfer',
      amount: 2000000,
      date: new Date('2026-11-10T12:00:00Z').getTime(),
      accountId: 'acc_bank',
      toAccountId: 'acc_wallet',
      note: 'Rút tiền ATM',
      createdAt: 3000,
      updatedAt: 3000,
    },
  ]

  it('bắt đầu bằng ký tự BOM UTF-8 (\\uFEFF) cho Excel', () => {
    const csv = exportTransactionsToCsv(transactions, categories, accounts)
    expect(csv.startsWith('\uFEFF')).toBe(true)
  })

  it('chứa đầy đủ các cột tiêu đề tiếng Việt', () => {
    const csv = exportTransactionsToCsv(transactions, categories, accounts)
    expect(csv).toContain('"Mã giao dịch","Ngày","Loại","Danh mục","Số tiền (VND)","Ví nguồn","Ví đích","Ghi chú"')
  })

  it('ánh xạ đúng tên danh mục và tên ví tiếng Việt', () => {
    const csv = exportTransactionsToCsv(transactions, categories, accounts)
    expect(csv).toContain('"Ăn uống & Cà phê"')
    expect(csv).toContain('"Ví tiền mặt"')
    expect(csv).toContain('"Tiền lương chính thức"')
    expect(csv).toContain('"Tài khoản Vietcombank"')
  })

  it('escape dấu nháy kép trong ghi chú một cách an toàn', () => {
    const csv = exportTransactionsToCsv(transactions, categories, accounts)
    // Phở bò "đặc biệt" -> Phở bò ""đặc biệt""
    expect(csv).toContain('"Phở bò ""đặc biệt"""')
  })

  it('xử lý giao dịch chuyển tiền có ví đích', () => {
    const csv = exportTransactionsToCsv(transactions, categories, accounts)
    expect(csv).toContain('"Chuyển ví","Chuyển tiền",2000000,"Tài khoản Vietcombank","Ví tiền mặt"')
  })
})

