import React from 'react'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Account, Category, TransactionType } from '@shared/types'
import type { TransactionFilter } from '@/types'

interface TransactionFiltersSheetProps {
  isOpen: boolean
  onClose: () => void
  filters: TransactionFilter
  onApplyFilters: (filters: Partial<TransactionFilter>) => void
  onResetFilters: () => void
  accounts: Account[]
  categories: Category[]
}

function toDateInputValue(timestamp?: number): string {
  if (!timestamp) return ''
  const d = new Date(timestamp)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseDateInput(value: string, isEndOfDay = false): number | undefined {
  if (!value) return undefined
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return undefined
  if (isEndOfDay) {
    return new Date(y, m - 1, d, 23, 59, 59, 999).getTime()
  }
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime()
}

export function TransactionFiltersSheet({
  isOpen,
  onClose,
  filters,
  onApplyFilters,
  onResetFilters,
  accounts,
  categories,
}: TransactionFiltersSheetProps) {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime()
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime()

  const yest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  const yestStart = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate(), 0, 0, 0, 0).getTime()
  const yestEnd = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate(), 23, 59, 59, 999).getTime()

  const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0).getTime()

  const curMonthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime()
  const curMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime()

  const quickPresets = [
    {
      label: 'Tất cả',
      isActive: !filters.startDate && !filters.endDate,
      onClick: () => onApplyFilters({ startDate: undefined, endDate: undefined }),
    },
    {
      label: 'Hôm nay',
      isActive: filters.startDate === todayStart && filters.endDate === todayEnd,
      onClick: () => onApplyFilters({ startDate: todayStart, endDate: todayEnd }),
    },
    {
      label: 'Hôm qua',
      isActive: filters.startDate === yestStart && filters.endDate === yestEnd,
      onClick: () => onApplyFilters({ startDate: yestStart, endDate: yestEnd }),
    },
    {
      label: '7 ngày qua',
      isActive: filters.startDate === sevenDaysAgo && filters.endDate === todayEnd,
      onClick: () => onApplyFilters({ startDate: sevenDaysAgo, endDate: todayEnd }),
    },
    {
      label: 'Tháng này',
      isActive: filters.startDate === curMonthStart && filters.endDate === curMonthEnd,
      onClick: () => onApplyFilters({ startDate: curMonthStart, endDate: curMonthEnd }),
    },
  ]

  const monthOptions = React.useMemo(() => {
    const options = []
    const currentDate = new Date()
    for (let i = 0; i < 12; i++) {
      const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      const year = d.getFullYear()
      const month = d.getMonth()
      const start = new Date(year, month, 1, 0, 0, 0, 0).getTime()
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime()
      const monthStr = String(month + 1).padStart(2, '0')
      const label =
        i === 0
          ? `Tháng này (${monthStr}/${year})`
          : i === 1
          ? `Tháng trước (${monthStr}/${year})`
          : `Tháng ${monthStr}/${year}`
      options.push({ label, start, end, key: `${year}-${month + 1}` })
    }
    return options
  }, [])

  const selectedMonthKey = React.useMemo(() => {
    if (!filters.startDate) return ''
    const opt = monthOptions.find((o) => Math.abs(o.start - (filters.startDate || 0)) < 86400000)
    return opt ? opt.key : ''
  }, [filters.startDate, monthOptions])

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Bộ lọc giao dịch">
      <div className="space-y-4">
        {/* Lọc theo ngày / thời gian */}
        <div className="space-y-2.5">
          <Label className="text-sm font-semibold">Thời gian / Ngày</Label>

          {/* Nút chọn nhanh */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 text-xs">
            {quickPresets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={preset.onClick}
                className={`py-2 px-1 text-center font-medium rounded-lg border transition-colors ${
                  preset.isActive
                    ? 'border-primary bg-primary/10 text-primary font-bold'
                    : 'border-border text-muted-foreground hover:bg-accent'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Chọn ngày cụ thể (Từ ngày - Đến ngày) */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="space-y-1">
              <label htmlFor="filter-start-date" className="text-xs text-muted-foreground font-medium">
                Từ ngày
              </label>
              <Input
                id="filter-start-date"
                type="date"
                value={toDateInputValue(filters.startDate)}
                onChange={(e) => {
                  const val = e.target.value
                  const ts = parseDateInput(val, false)
                  onApplyFilters({ startDate: ts })
                }}
                className="h-10 text-xs bg-background"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="filter-end-date" className="text-xs text-muted-foreground font-medium">
                Đến ngày
              </label>
              <Input
                id="filter-end-date"
                type="date"
                value={toDateInputValue(filters.endDate)}
                onChange={(e) => {
                  const val = e.target.value
                  const ts = parseDateInput(val, true)
                  onApplyFilters({ endDate: ts })
                }}
                className="h-10 text-xs bg-background"
              />
            </div>
          </div>

          {/* Hoặc chọn theo tháng */}
          <div className="pt-1 space-y-1">
            <label htmlFor="filter-month" className="text-xs text-muted-foreground font-medium">
              Hoặc chọn theo tháng
            </label>
            <select
              id="filter-month"
              value={selectedMonthKey}
              onChange={(e) => {
                const val = e.target.value
                if (!val) {
                  onApplyFilters({ startDate: undefined, endDate: undefined })
                } else {
                  const opt = monthOptions.find((o) => o.key === val)
                  if (opt) {
                    onApplyFilters({ startDate: opt.start, endDate: opt.end })
                  }
                }
              }}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs touch-target"
            >
              <option value="">-- Chọn tháng --</option>
              {monthOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Lọc theo loại */}
        <div className="space-y-1.5">
          <Label>Loại giao dịch</Label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Tất cả', val: undefined },
              { label: 'Chi tiêu', val: 'expense' },
              { label: 'Thu nhập', val: 'income' },
              { label: 'Chuyển ví', val: 'transfer' },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => onApplyFilters({ type: item.val as TransactionType })}
                className={`py-2 text-xs font-semibold rounded-lg border touch-target transition-colors ${
                  filters.type === item.val
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-accent'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lọc theo ví */}
        <div className="space-y-1.5">
          <Label htmlFor="filter-account">Tài khoản / Ví</Label>
          <select
            id="filter-account"
            value={filters.accountId || ''}
            onChange={(e) => onApplyFilters({ accountId: e.target.value || undefined })}
            className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-base touch-target"
          >
            <option value="">-- Tất cả các ví --</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>
        </div>

        {/* Lọc theo danh mục */}
        <div className="space-y-1.5">
          <Label htmlFor="filter-category">Danh mục</Label>
          <select
            id="filter-category"
            value={filters.categoryId || ''}
            onChange={(e) => onApplyFilters({ categoryId: e.target.value || undefined })}
            className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-base touch-target"
          >
            <option value="">-- Tất cả danh mục --</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name} ({cat.type === 'expense' ? 'Chi' : 'Thu'})
              </option>
            ))}
          </select>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="ghost" onClick={onResetFilters} className="text-muted-foreground touch-target">
            Đặt lại bộ lọc
          </Button>
          <Button variant="brand" onClick={onClose} className="touch-target">
            Áp dụng
          </Button>
        </div>
      </div>
    </BottomSheet>
  )
}

