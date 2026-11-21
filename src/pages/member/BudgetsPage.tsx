import React from 'react'
import { useAuthStore } from '@/stores/auth'
import { useViewPeriodStore } from '@/stores/viewPeriod'
import { categoriesService } from '@/features/categories/services/categories'
import { transactionsService } from '@/features/transactions/services/transactions'
import { budgetsService } from '@/features/budgets/services/budgets'
import { MonthSelector } from '@/features/dashboard/components/MonthSelector'
import { BudgetSummaryCard } from '@/features/budgets/components/BudgetSummaryCard'
import { BudgetCard } from '@/features/budgets/components/BudgetCard'
import { BudgetDialog } from '@/features/budgets/components/BudgetDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { getMonthInterval, evaluateBudgetStatus } from '@/lib/finance'
import { Plus, WalletCards } from 'lucide-react'
import { toast } from 'sonner'
import type { Category, Budget, Transaction } from '@shared/types'
import type { BudgetFormValues } from '@/features/budgets/schemas/budgetSchema'

type BudgetFilterTab = 'all' | 'budgeted' | 'attention' | 'unbudgeted'

export function BudgetsPage() {
  const { user } = useAuthStore()
  const { year, month } = useViewPeriodStore()

  const [categories, setCategories] = React.useState<Category[]>([])
  const [budgets, setBudgets] = React.useState<Budget[]>([])
  const [transactions, setTransactions] = React.useState<Transaction[]>([])
  const [warningThreshold, setWarningThreshold] = React.useState<number>(0.8)
  const [isLoading, setIsLoading] = React.useState(true)

  const [activeTab, setActiveTab] = React.useState<BudgetFilterTab>('all')
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [selectedCategory, setSelectedCategory] = React.useState<Category | null>(null)
  const [selectedBudget, setSelectedBudget] = React.useState<Budget | null>(null)

  const currentMonthKey = `${year}-${String(month).padStart(2, '0')}`

  const loadData = React.useCallback(async () => {
    if (!user?.uid) return
    setIsLoading(true)
    try {
      const [cats, bList, txRes, config] = await Promise.all([
        categoriesService.getCategories(user.uid),
        budgetsService.getBudgets(user.uid, currentMonthKey),
        transactionsService.getTransactions(user.uid, undefined, 200),
        budgetsService.getSystemConfig(),
      ])

      setCategories(cats)
      setBudgets(bList)
      setTransactions(txRes.transactions)
      if (config.budgetWarningThreshold) {
        setWarningThreshold(config.budgetWarningThreshold)
      }
    } catch {
      toast.error('Không thể tải dữ liệu ngân sách')
    } finally {
      setIsLoading(false)
    }
  }, [user?.uid, currentMonthKey])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  // Lọc các giao dịch chi tiêu trong tháng được chọn
  const monthInterval = getMonthInterval(year, month)
  const monthExpenseTxs = transactions.filter(
    (t) =>
      t.type === 'expense' &&
      t.date >= monthInterval.start.getTime() &&
      t.date <= monthInterval.end.getTime()
  )

  // Danh sách các danh mục chi tiêu
  const expenseCategories = categories.filter((c) => c.type === 'expense')

  // Tính số tiền đã chi theo từng danh mục
  const spentByCategory = React.useMemo(() => {
    const map: Record<string, number> = {}
    monthExpenseTxs.forEach((tx) => {
      if (tx.categoryId) {
        map[tx.categoryId] = (map[tx.categoryId] || 0) + tx.amount
      }
    })
    return map
  }, [monthExpenseTxs])

  // Map ngân sách theo categoryId
  const budgetByCategoryId = React.useMemo(() => {
    const map: Record<string, Budget> = {}
    budgets.forEach((b) => {
      map[b.categoryId] = b
    })
    return map
  }, [budgets])

  // Thống kê tổng quan ngân sách tháng
  const summaryStats = React.useMemo(() => {
    let totalBudget = 0
    let totalSpentInBudgeted = 0
    let exceededCount = 0
    let warningCount = 0
    let normalCount = 0
    let unbudgetedCount = 0

    expenseCategories.forEach((cat) => {
      const b = budgetByCategoryId[cat.id]
      const spent = spentByCategory[cat.id] || 0
      const limit = b?.amount || 0

      if (limit > 0) {
        totalBudget += limit
        totalSpentInBudgeted += spent

        const evaluation = evaluateBudgetStatus(limit, spent, warningThreshold)
        if (evaluation.status === 'exceeded') {
          exceededCount++
        } else if (evaluation.status === 'warning') {
          warningCount++
        } else {
          normalCount++
        }
      } else {
        unbudgetedCount++
      }
    })

    const totalRemaining = totalBudget - totalSpentInBudgeted
    const overallPercentage = totalBudget > 0 ? totalSpentInBudgeted / totalBudget : 0

    return {
      totalBudget,
      totalSpent: totalSpentInBudgeted,
      totalRemaining,
      overallPercentage,
      exceededCount,
      warningCount,
      normalCount,
      unbudgetedCount,
    }
  }, [expenseCategories, budgetByCategoryId, spentByCategory, warningThreshold])

  // Xử lý mở dialog đặt/sửa ngân sách
  const handleOpenDialog = (category?: Category | null, budget?: Budget | null) => {
    setSelectedCategory(category || null)
    setSelectedBudget(budget || null)
    setIsDialogOpen(true)
  }

  // Submit form đặt/sửa ngân sách
  const handleSaveBudget = async (values: BudgetFormValues) => {
    if (!user?.uid) return
    try {
      await budgetsService.setBudget(user.uid, values)
      toast.success('Lưu hạn mức ngân sách thành công')
      await loadData()
    } catch {
      toast.error('Không thể lưu hạn mức ngân sách')
    }
  }

  // Xóa ngân sách
  const handleDeleteBudget = async (monthKey: string, categoryId: string) => {
    if (!user?.uid) return
    try {
      await budgetsService.deleteBudget(user.uid, monthKey, categoryId)
      toast.success('Đã xóa hạn mức ngân sách')
      await loadData()
    } catch {
      toast.error('Không thể xóa hạn mức ngân sách')
    }
  }

  // Lọc danh mục theo tab hiện tại
  const displayedCategories = expenseCategories.filter((cat) => {
    const b = budgetByCategoryId[cat.id]
    const spent = spentByCategory[cat.id] || 0
    const limit = b?.amount || 0
    const evaluation = evaluateBudgetStatus(limit, spent, warningThreshold)

    if (activeTab === 'budgeted') return limit > 0
    if (activeTab === 'unbudgeted') return limit <= 0
    if (activeTab === 'attention') {
      return limit > 0 && (evaluation.status === 'warning' || evaluation.status === 'exceeded')
    }
    return true
  })

  return (
    <div className="space-y-5 pb-16 md:pb-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Quản lý Ngân sách
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Thiết lập hạn mức chi tiêu cho từng danh mục để kiểm soát tài chính
          </p>
        </div>

        <div className="flex items-center gap-2">
          <MonthSelector />
          <Button
            onClick={() => handleOpenDialog(null, null)}
            className="font-medium shrink-0 shadow-xs h-10 touch-target"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            <span className="text-sm">Đặt hạn mức</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-44 w-full rounded-2xl" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20 rounded-xl" />
            <Skeleton className="h-9 w-28 rounded-xl" />
            <Skeleton className="h-9 w-28 rounded-xl" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
        </div>
      ) : (
        <>
          {/* Summary Card */}
          <BudgetSummaryCard {...summaryStats} />

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors touch-target ${
                activeTab === 'all'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              Tất cả ({expenseCategories.length})
            </button>
            <button
              onClick={() => setActiveTab('budgeted')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors touch-target ${
                activeTab === 'budgeted'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              Đã đặt hạn mức ({expenseCategories.length - summaryStats.unbudgetedCount})
            </button>
            <button
              onClick={() => setActiveTab('attention')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors touch-target ${
                activeTab === 'attention'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              Cần chú ý ({summaryStats.exceededCount + summaryStats.warningCount})
            </button>
            <button
              onClick={() => setActiveTab('unbudgeted')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors touch-target ${
                activeTab === 'unbudgeted'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              Chưa đặt ({summaryStats.unbudgetedCount})
            </button>
          </div>

          {/* Danh sách thẻ ngân sách */}
          {displayedCategories.length === 0 ? (
            <EmptyState
              icon={WalletCards}
              title="Không có danh mục nào"
              description={
                activeTab === 'attention'
                  ? 'Tuyệt vời! Không có danh mục nào đang sắp chạm ngưỡng hoặc vượt hạn mức.'
                  : activeTab === 'budgeted'
                    ? 'Chưa có danh mục nào được đặt hạn mức trong tháng này.'
                    : 'Không tìm thấy danh mục chi tiêu phù hợp.'
              }
              actionLabel={activeTab === 'budgeted' ? '+ Đặt hạn mức đầu tiên' : undefined}
              onAction={activeTab === 'budgeted' ? () => handleOpenDialog(null, null) : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {displayedCategories.map((category) => (
                <BudgetCard
                  key={category.id}
                  category={category}
                  budget={budgetByCategoryId[category.id]}
                  spent={spentByCategory[category.id] || 0}
                  warningThreshold={warningThreshold}
                  onSetBudget={handleOpenDialog}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Dialog đặt/sửa hạn mức */}
      <BudgetDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        month={currentMonthKey}
        categories={categories}
        category={selectedCategory}
        initialBudget={selectedBudget}
        onSubmit={handleSaveBudget}
        onDelete={handleDeleteBudget}
      />
    </div>
  )
}

