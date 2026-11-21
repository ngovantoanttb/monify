import { create } from 'zustand'

interface ViewPeriodState {
  year: number
  month: number // 1 - 12
  setPeriod: (year: number, month: number) => void
  prevMonth: () => void
  nextMonth: () => void
}

const now = new Date()

export const useViewPeriodStore = create<ViewPeriodState>((set) => ({
  year: now.getFullYear(),
  month: now.getMonth() + 1,
  setPeriod: (year, month) => set({ year, month }),
  prevMonth: () =>
    set((state) => {
      if (state.month === 1) {
        return { year: state.year - 1, month: 12 }
      }
      return { month: state.month - 1 }
    }),
  nextMonth: () =>
    set((state) => {
      if (state.month === 12) {
        return { year: state.year + 1, month: 1 }
      }
      return { month: state.month + 1 }
    }),
}))

