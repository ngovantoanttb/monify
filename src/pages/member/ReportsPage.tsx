import React from 'react'
import { useAuthStore } from '@/stores/auth'
import { transactionsService } from '@/features/transactions/services/transactions'
import { categoriesService } from '@/features/categories/services/categories'
import { accountsService } from '@/features/accounts/services/accounts'
import { exportTransactionsToCsv, downloadCsv } from '@/lib/finance/exportCsv'
import { formatCurrency, calculateSavingsRate } from '@/lib/finance'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import {
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Percent,
  FileBarChart,
  Tag,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Transaction, Category, Account } from '@shared/types'

type PeriodPreset = 'this-month' | 'last-month' | 'this-quarter' | 'this-year' | 'custom'

export function ReportsPage() {
  const { user } = useAuthStore()

  const [period, setPeriod] = React.useState<PeriodPreset>('this-month')
  const [customStart, setCustomStart] = React.useState<string>(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  })
  const [customEnd, setCustomEnd] = React.useState<string>(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })

  const [transactions, setTransactions] = React.useState<Transaction[]>([])
  const [categories, setCategories] = React.useState<Category[]>([])
  const [accounts, setAccounts] = React.useState<Account[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  // Tính toán khoảng thời gian (startDate, endDate) theo period
  const dateRange = React.useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() // 0-indexed

    if (period === 'this-month') {
      const start = new Date(year, month, 1, 0, 0, 0, 0).getTime()
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime()
      return { start, end, label: `Tháng ${month + 1}/${year}` }
    }

    if (period === 'last-month') {
      const start = new Date(year, month - 1, 1, 0, 0, 0, 0).getTime()
      const end = new Date(year, month, 0, 23, 59, 59, 999).getTime()
      const lastMonthNum = month === 0 ? 12 : month
      const lastMonthYear = month === 0 ? year - 1 : year
      return { start, end, label: `Tháng ${lastMonthNum}/${lastMonthYear}` }
    }

    if (period === 'this-quarter') {
      const quarter = Math.floor(month / 3) // 0: Q1, 1: Q2, 2: Q3, 3: Q4
      const start = new Date(year, quarter * 3, 1, 0, 0, 0, 0).getTime()
      const end = new Date(year, quarter * 3 + 3, 0, 23, 59, 59, 999).getTime()
      return { start, end, label: `Quý ${quarter + 1}/${year}` }
    }

    if (period === 'this-year') {
      const start = new Date(year, 0, 1, 0, 0, 0, 0).getTime()
      const end = new Date(year, 11, 31, 23, 59, 59, 999).getTime()
      return { start, end, label: `Năm ${year}` }
    }

    // Custom
    const start = new Date(`${customStart}T00:00:00`).getTime()
    const end = new Date(`${customEnd}T23:59:59.999`).getTime()
    return { start, end, label: `${customStart} đến ${customEnd}` }
  }, [period, customStart, customEnd])

  const loadData = React.useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const [txs, cats, accs] = await Promise.all([
        transactionsService.getAllTransactions(user.uid, dateRange.start, dateRange.end),
        categoriesService.getCategories(user.uid),
        accountsService.getAccounts(user.uid),
      ])
      setTransactions(txs)
      setCategories(cats)
      setAccounts(accs)
    } catch {
      toast.error('Không thể tải dữ liệu báo cáo')
    } finally {
      setIsLoading(false)
    }
  }, [user, dateRange])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  // Tổng hợp số liệu
  const summary = React.useMemo(() => {
    let totalIncome = 0
    let totalExpense = 0

    const expenseByCategory: Record<string, number> = {}
    const incomeByCategory: Record<string, number> = {}

    for (const tx of transactions) {
      if (tx.type === 'income') {
        totalIncome += tx.amount
        const catId = tx.categoryId || 'other'
        incomeByCategory[catId] = (incomeByCategory[catId] || 0) + tx.amount
      } else if (tx.type === 'expense') {
        totalExpense += tx.amount
        const catId = tx.categoryId || 'other'
        expenseByCategory[catId] = (expenseByCategory[catId] || 0) + tx.amount
      }
    }

    const netSavings = totalIncome - totalExpense
    const savingsRate = calculateSavingsRate(totalIncome, netSavings)

    return {
      totalIncome,
      totalExpense,
      netSavings,
      savingsRate,
      expenseByCategory,
      incomeByCategory,
    }
  }, [transactions])

  const categoryMap = React.useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  // Top chi tiêu theo danh mục
  const sortedExpenses = React.useMemo(() => {
    return Object.entries(summary.expenseByCategory)
      .map(([catId, amount]) => {
        const cat = categoryMap.get(catId)
        return {
          id: catId,
          name: cat?.name || 'Chưa phân loại',
          color: cat?.color || '#64748B',
          amount,
          percent: summary.totalExpense > 0 ? (amount / summary.totalExpense) * 100 : 0,
        }
      })
      .sort((a, b) => b.amount - a.amount)
  }, [summary.expenseByCategory, summary.totalExpense, categoryMap])

  // Xử lý xuất CSV
  const handleExportCsv = () => {
    if (transactions.length === 0) {
      toast.error('Không có giao dịch nào trong kỳ này để xuất')
      return
    }

    const csvContent = exportTransactionsToCsv(transactions, categories, accounts)
    const fileName = `monify_bao_cao_${period}_${new Date().toISOString().slice(0, 10)}.csv`
    downloadCsv(csvContent, fileName)
    toast.success(`Đã xuất ${transactions.length} giao dịch ra file CSV`)
  }

  return (
    <div className="space-y-6 pb-16 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Báo cáo Tài chính
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Tổng hợp thu chi, phân tích danh mục và xuất dữ liệu ({dateRange.label})
          </p>
        </div>

        <Button
          onClick={handleExportCsv}
          disabled={isLoading || transactions.length === 0}
          className="gap-2 touch-target self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          Xuất file CSV (Excel)
        </Button>
      </div>

      {/* Bộ chọn kỳ báo cáo */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: 'this-month', label: 'Tháng này' },
              { id: 'last-month', label: 'Tháng trước' },
              { id: 'this-quarter', label: 'Quý này' },
              { id: 'this-year', label: 'Năm nay' },
              { id: 'custom', label: 'Tùy chọn' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => setPeriod(item.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors touch-target ${
                period === item.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Ô chọn ngày tùy chọn */}
        {period === 'custom' && (
          <div className="flex flex-wrap items-center gap-2 p-3 bg-card border rounded-xl">
            <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="flex items-center gap-2 text-xs">
              <span>Từ ngày:</span>
              <Input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-auto h-8 text-xs"
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span>Đến ngày:</span>
              <Input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-auto h-8 text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* Thẻ tóm tắt 4 chỉ số */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {/* Tổng thu */}
          <Card className="p-4 space-y-1.5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Tổng thu nhập</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-lg md:text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(summary.totalIncome)}
            </div>
          </Card>

          {/* Tổng chi */}
          <Card className="p-4 space-y-1.5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Tổng chi tiêu</span>
              <div className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="text-lg md:text-xl font-bold text-destructive">
              {formatCurrency(summary.totalExpense)}
            </div>
          </Card>

          {/* Tiết kiệm ròng */}
          <Card className="p-4 space-y-1.5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Tiết kiệm ròng</span>
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <PiggyBank className="w-4 h-4" />
              </div>
            </div>
            <div
              className={`text-lg md:text-xl font-bold ${
                summary.netSavings >= 0 ? 'text-primary' : 'text-destructive'
              }`}
            >
              {formatCurrency(summary.netSavings)}
            </div>
          </Card>

          {/* Tỷ lệ tiết kiệm */}
          <Card className="p-4 space-y-1.5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Tỷ lệ tiết kiệm</span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <Percent className="w-4 h-4" />
              </div>
            </div>
            <div className="text-lg md:text-xl font-bold text-blue-600 dark:text-blue-400">
              {Math.round(summary.savingsRate * 100)}%
            </div>
          </Card>
        </div>
      )}

      {/* Phân tích Chi tiêu theo Danh mục */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary" />
            Cơ cấu chi tiêu theo danh mục
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          ) : sortedExpenses.length === 0 ? (
            <EmptyState
              title="Không có khoản chi nào trong kỳ này"
              description="Hãy chọn kỳ báo cáo khác hoặc ghi nhận các giao dịch chi tiêu mới."
              icon={FileBarChart}
            />
          ) : (
            <div className="space-y-4">
              {sortedExpenses.map((item) => (
                <div key={item.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-medium text-foreground truncate">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <span className="font-bold text-foreground">{formatCurrency(item.amount)}</span>
                      <span className="text-xs text-muted-foreground w-10 text-right">
                        {item.percent.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Thanh tiến độ */}
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${item.percent}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
