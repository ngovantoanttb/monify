import React from 'react'
import { BottomSheet } from './BottomSheet'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface MonthPickerSheetProps {
  isOpen: boolean
  onClose: () => void
  year: number
  month: number
  onSelect: (year: number, month: number) => void
}

export function MonthPickerSheet({ isOpen, onClose, year, month, onSelect }: MonthPickerSheetProps) {
  const [selectedYear, setSelectedYear] = React.useState(year)

  React.useEffect(() => {
    setSelectedYear(year)
  }, [year, isOpen])

  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Chọn tháng xem">
      <div className="space-y-4">
        {/* Year Navigator */}
        <div className="flex items-center justify-between px-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedYear((prev) => prev - 1)}
            className="touch-target"
            aria-label="Năm trước"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <span className="text-lg font-bold text-foreground">Năm {selectedYear}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedYear((prev) => prev + 1)}
            className="touch-target"
            aria-label="Năm sau"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* 12 Months Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-2">
          {months.map((m) => {
            const isCurrent = selectedYear === year && m === month
            return (
              <button
                key={m}
                onClick={() => {
                  onSelect(selectedYear, m)
                  onClose()
                }}
                className={`py-3 rounded-xl text-sm font-semibold border touch-target transition-colors ${
                  isCurrent
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                    : 'border-border text-foreground hover:bg-accent'
                }`}
              >
                Tháng {m}
              </button>
            )
          })}
        </div>
      </div>
    </BottomSheet>
  )
}

