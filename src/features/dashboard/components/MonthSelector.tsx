import React from 'react'
import { MonthPickerSheet } from '@/components/shared/MonthPickerSheet'
import { useViewPeriodStore } from '@/stores/viewPeriod'
import { Calendar, ChevronDown } from 'lucide-react'

export function MonthSelector() {
  const { year, month, setPeriod } = useViewPeriodStore()
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-card hover:bg-accent text-sm font-semibold text-foreground transition-colors touch-target shadow-sm"
        aria-label="Chọn kỳ tháng xem"
      >
        <Calendar className="w-4 h-4 text-primary" />
        <span>
          Tháng {month}/{year}
        </span>
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      </button>

      <MonthPickerSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        year={year}
        month={month}
        onSelect={setPeriod}
      />
    </>
  )
}

