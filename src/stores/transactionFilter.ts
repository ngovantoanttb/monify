import { create } from 'zustand'
import type { TransactionFilter } from '@/types'

interface TransactionFilterState {
  filters: TransactionFilter
  setFilters: (filters: Partial<TransactionFilter>) => void
  resetFilters: () => void
}

const defaultFilters: TransactionFilter = {
  type: undefined,
  categoryId: undefined,
  accountId: undefined,
  search: '',
}

export const useTransactionFilterStore = create<TransactionFilterState>((set) => ({
  filters: defaultFilters,
  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),
  resetFilters: () => set({ filters: defaultFilters }),
}))

