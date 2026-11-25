import React from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
  hideOnSinglePage?: boolean
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
  hideOnSinglePage = false,
}: PaginationProps) {
  const safeTotalPages = Math.max(1, totalPages || 1)
  const safeCurrentPage = Math.max(1, Math.min(safeTotalPages, currentPage || 1))
  const [inputValue, setInputValue] = React.useState(String(safeCurrentPage))

  React.useEffect(() => {
    setInputValue(String(safeCurrentPage))
  }, [safeCurrentPage])

  // Nếu totalPages <= 0 hoặc bật cờ hideOnSinglePage khi chỉ có 1 trang
  if (totalPages <= 0 || (hideOnSinglePage && totalPages <= 1)) {
    return null
  }

  const handleApplyPage = (val: string) => {
    const parsed = parseInt(val, 10)
    if (!isNaN(parsed)) {
      const clamped = Math.max(1, Math.min(safeTotalPages, parsed))
      onPageChange(clamped)
      setInputValue(String(clamped))
    } else {
      setInputValue(String(safeCurrentPage))
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur()
      handleApplyPage(inputValue)
    }
  }

  const handleBlur = () => {
    handleApplyPage(inputValue)
  }

  return (
    <div className={cn('flex items-center justify-center gap-3 sm:gap-3.5 py-2 select-none', className)}>
      {/* Nút lùi trang hình tròn */}
      <button
        type="button"
        disabled={safeCurrentPage <= 1}
        onClick={() => onPageChange(safeCurrentPage - 1)}
        className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-secondary dark:bg-[#222738] text-secondary-foreground dark:text-white hover:bg-accent dark:hover:bg-[#2c3349] disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-all active:scale-95 shadow-sm touch-target"
        aria-label="Trang trước"
      >
        <ArrowLeft className="w-5 h-5 text-foreground dark:text-white" />
      </button>

      {/* Pill capsule ở giữa: Trang [ 1 ] / totalPages */}
      <div className="h-11 sm:h-12 px-5 sm:px-6 rounded-full bg-secondary dark:bg-[#222738] text-secondary-foreground dark:text-white flex items-center gap-2.5 sm:gap-3 shadow-sm select-none">
        <span className="text-sm sm:text-base font-normal tracking-wide">Trang</span>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={(e) => e.target.select()}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className="w-12 sm:w-14 h-8 text-center rounded-lg border border-border/80 dark:border-white/20 bg-background dark:bg-[#181d2c] text-foreground dark:text-white font-medium text-sm sm:text-base focus:outline-none transition-all"
          aria-label="Số trang hiện tại"
        />
        <span className="text-sm sm:text-base font-normal tracking-wide">/ {safeTotalPages}</span>
      </div>

      {/* Nút tiến trang hình tròn */}
      <button
        type="button"
        disabled={safeCurrentPage >= safeTotalPages}
        onClick={() => onPageChange(safeCurrentPage + 1)}
        className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-secondary dark:bg-[#222738] text-secondary-foreground dark:text-white hover:bg-accent dark:hover:bg-[#2c3349] disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-all active:scale-95 shadow-sm touch-target"
        aria-label="Trang sau"
      >
        <ArrowRight className="w-5 h-5 text-foreground dark:text-white" />
      </button>
    </div>
  )
}
