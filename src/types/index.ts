export * from '@shared/types'
export * from '@shared/constants'

export type ViewPeriod = {
  year: number
  month: number // 1 - 12
}

export type TransactionFilter = {
  type?: 'income' | 'expense' | 'transfer'
  categoryId?: string
  accountId?: string
  search?: string
  startDate?: number
  endDate?: number
}
