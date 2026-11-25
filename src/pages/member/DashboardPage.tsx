import React from 'react'
import { Card } from '@/components/ui/card'
import { MonthSelector } from '@/features/dashboard/components/MonthSelector'
import { CategoryPieChart } from '@/features/dashboard/components/CategoryPieChart'
import { MonthlyTrendChart } from '@/features/dashboard/components/MonthlyTrendChart'
import { BudgetAlertsWidget, type BudgetAlertItem } from '@/features/dashboard/components/BudgetAlertsWidget'
import { AccountsSummaryWidget } from '@/features/dashboard/components/AccountsSummaryWidget'
import { GoalsSummaryWidget } from '@/features/dashboard/components/GoalsSummaryWidget'
import { DebtsSummaryWidget } from '@/features/dashboard/components/DebtsSummaryWidget'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/stores/auth'
import { useViewPeriodStore } from '@/stores/viewPeriod'
import { accountsService } from '@/features/accounts/services/accounts'
import { categoriesService } from '@/features/categories/services/categories'
import { transactionsService } from '@/features/transactions/services/transactions'
import { goalsService } from '@/features/goals/services/goals'
import { budgetsService } from '@/features/budgets/services/budgets'
import { debtsService } from '@/features/debts/services/debts'
import {
  calculateTotalIncome,
  calculateTotalExpense,
  calculateNetBalance,
  calculateSavingsRate,
  calculateAccountBalance,
  filterRegularTransactions,
  isDebtTransaction,
  formatCurrency,
  getMonthInterval,
  formatBudgetId,
} from '@/lib/finance'
import { TrendingUp, TrendingDown, Wallet, PiggyBank } from 'lucide-react'
import type { Account, Budget, Category, Debt, DebtHistory, Transaction, Goal } from '@shared/types'

export function DashboardPage() {
  const { user } = useAuthStore()
  const { year, month } = useViewPeriodStore()

  const [isLoading, setIsLoading] = React.useState(true)
  const [excludeDebts, setExcludeDebts] = React.useState(true)
  const [accounts, setAccounts] = React.useState<Account[]>([])
  const [categories, setCategories] = React.useState<Category[]>([])
  const [transactions, setTransactions] = React.useState<Transaction[]>([])
  const [budgets, setBudgets] = React.useState<Budget[]>([])
  const [goals, setGoals] = React.useState<Goal[]>([])
  const [debts, setDebts] = React.useState<Debt[]>([])
  const [debtHistories, setDebtHistories] = React.useState<DebtHistory[]>([])
  const [debtTransactionIds, setDebtTransactionIds] = React.useState<Set<string>>(() => new Set())

  const loadDashboardData = React.useCallback(async () => {
    if (!user?.uid) return
    setIsLoading(true)
    try {
      // 1. Tải danh sách ví, danh mục, toàn bộ giao dịch, mục tiêu, ngân sách, công nợ và lịch sử công nợ của user
      const [accs, cats, allTxs, goalList, userBudgets, debtList, debtHistoryList] = await Promise.all([
        accountsService.getAccounts(user.uid),
        categoriesService.getCategories(user.uid),
        transactionsService.getAllTransactions(user.uid),
        goalsService.getGoals(user.uid),
        budgetsService.getBudgets(user.uid),
        debtsService.getDebts(user.uid).catch(() => []),
        debtsService.getDebtHistories(user.uid).catch(() => []),
      ])

      const linkedTxIds = new Set<string>()
      debtHistoryList.forEach((h) => {
        if (h.transactionId) {
          linkedTxIds.add(h.transactionId)
        }
      })

      setAccounts(accs)
      setCategories(cats)
      setTransactions(allTxs)
      setGoals(goalList)
      setBudgets(userBudgets)
      setDebts(debtList)
      setDebtHistories(debtHistoryList)
      setDebtTransactionIds(linkedTxIds)
    } finally {
      setIsLoading(false)
    }
  }, [user?.uid])

  React.useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  // Giao dịch dùng cho thống kê thu/chi trên Dashboard (mặc định loại bỏ giao dịch công nợ)
  const analyticsTransactions = React.useMemo(
    () => (excludeDebts ? filterRegularTransactions(transactions, debtTransactionIds) : transactions),
    [excludeDebts, transactions, debtTransactionIds]
  )

  // Lọc giao dịch trong tháng đang chọn
  const monthInterval = getMonthInterval(year, month)
  const currentMonthAllTransactions = transactions.filter(
    (t) => t.date >= monthInterval.start.getTime() && t.date <= monthInterval.end.getTime()
  )
  const currentMonthTransactions = analyticsTransactions.filter(
    (t) => t.date >= monthInterval.start.getTime() && t.date <= monthInterval.end.getTime()
  )

  const hiddenDebtTxCount = React.useMemo(
    () =>
      currentMonthAllTransactions.filter((t) => isDebtTransaction(t, debtTransactionIds)).length,
    [currentMonthAllTransactions, debtTransactionIds]
  )

  const totalIncome = calculateTotalIncome(currentMonthTransactions)
  const totalExpense = calculateTotalExpense(currentMonthTransactions)
  const netBalance = calculateNetBalance(totalIncome, totalExpense)
  const savingsRate = calculateSavingsRate(totalIncome, netBalance) * 100

  // Cảnh báo ngân sách (theo chế độ giao dịch đã chọn)
  const budgetAlerts = React.useMemo<BudgetAlertItem[]>(() => {
    if (budgets.length === 0) return []
    const alerts: BudgetAlertItem[] = []
    budgets.forEach((b) => {
      const expectedId = formatBudgetId(year, month, b.categoryId)
      if (b.id === expectedId && b.amount > 0) {
        const spent = currentMonthTransactions
          .filter((t) => t.type === 'expense' && t.categoryId === b.categoryId)
          .reduce((sum, t) => sum + t.amount, 0)

        const percentage = spent / b.amount
        if (percentage >= 0.8) {
          const cat = categories.find((c) => c.id === b.categoryId)
          alerts.push({
            categoryId: b.categoryId,
            categoryName: cat?.name || 'Danh mục',
            limit: b.amount,
            spent,
            percentage,
            isExceeded: spent > b.amount,
          })
        }
      }
    })
    return alerts
  }, [budgets, categories, currentMonthTransactions, year, month])

  // Xu hướng 12 tháng của năm được chọn (theo chế độ giao dịch đã chọn)
  const yearlyTrend = React.useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const m = i + 1
        const interval = getMonthInterval(year, m)
        const inMonth = analyticsTransactions.filter(
          (t) => t.date >= interval.start.getTime() && t.date <= interval.end.getTime()
        )
        return {
          month: `T${m}`,
          income: calculateTotalIncome(inMonth),
          expense: calculateTotalExpense(inMonth),
        }
      }),
    [analyticsTransactions, year]
  )

  // Số dư thực tế của từng ví (luôn tính toàn bộ dòng tiền kể cả công nợ)
  const accountBalances: Record<string, number> = {}
  accounts.forEach((acc) => {
    accountBalances[acc.id] = calculateAccountBalance(acc.openingBalance, acc.id, transactions)
  })

  // Dữ liệu biểu đồ tròn chi tiêu theo danh mục
  const categoryExpenses: Record<string, number> = {}
  currentMonthTransactions
    .filter((t) => t.type === 'expense' && t.categoryId)
    .forEach((t) => {
      categoryExpenses[t.categoryId!] = (categoryExpenses[t.categoryId!] || 0) + t.amount
    })

  const pieData = Object.entries(categoryExpenses).map(([catId, amount]) => {
    const cat = categories.find((c) => c.id === catId)
    return {
      name: cat?.name || 'Khác',
      value: amount,
      color: cat?.color || '#0D9488',
    }
  })

  return (
    <div className="space-y-6">
      {/* Top Header with Scope Toggle & Month Selector */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tổng quan tài chính</h1>
          <p className="text-sm text-muted-foreground">
            {excludeDebts
              ? 'Chỉ tính giao dịch thu/chi riêng (không tính công nợ)'
              : 'Tính toàn bộ giao dịch thu/chi bao gồm công nợ'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div
            role="group"
            aria-label="Phạm vi thống kê Dashboard"
            className="inline-flex items-center p-1 rounded-xl bg-muted border border-border/60"
          >
            <button
              type="button"
              onClick={() => setExcludeDebts(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                excludeDebts
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Chỉ giao dịch
            </button>
            <button
              type="button"
              onClick={() => setExcludeDebts(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                !excludeDebts
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Gồm công nợ
            </button>
          </div>

          <MonthSelector />
        </div>
      </div>

      {!isLoading && excludeDebts && hiddenDebtTxCount > 0 && (
        <div className="px-3.5 py-2 rounded-xl bg-muted/50 border border-border/60 text-xs text-muted-foreground">
          Đang loại trừ <strong>{hiddenDebtTxCount}</strong> giao dịch công nợ khỏi thống kê thu/chi tháng này (số dư các ví bên dưới vẫn tính đầy đủ dòng tiền thực tế).
        </div>
      )}

      {/* 4 Summary Stat Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {/* Thu nhập */}
          <Card className="p-4 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Tổng thu nhập</span>
              <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-lg md:text-xl font-bold text-green-600 truncate">{formatCurrency(totalIncome)}</div>
          </Card>

          {/* Chi tiêu */}
          <Card className="p-4 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Tổng chi tiêu</span>
              <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 flex items-center justify-center">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="text-lg md:text-xl font-bold text-red-600 truncate">{formatCurrency(totalExpense)}</div>
          </Card>

          {/* Số dư */}
          <Card className="p-4 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Số dư tháng (Thu - Chi)</span>
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="text-lg md:text-xl font-bold text-primary truncate">{formatCurrency(netBalance)}</div>
          </Card>

          {/* Tỷ lệ tiết kiệm */}
          <Card className="p-4 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Tỷ lệ tiết kiệm</span>
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center">
                <PiggyBank className="w-4 h-4" />
              </div>
            </div>
            <div className="text-lg md:text-xl font-bold text-amber-600 truncate">{savingsRate.toFixed(1)}%</div>
          </Card>
        </div>
      )}

      {/* Budget Alerts Widget */}
      <BudgetAlertsWidget alerts={budgetAlerts} />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryPieChart data={pieData} />
        <MonthlyTrendChart data={yearlyTrend} year={year} />
      </div>

      {/* Accounts & Net Worth Overview + Goals Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AccountsSummaryWidget accounts={accounts} balances={accountBalances} />
        {goals.length > 0 && <GoalsSummaryWidget goals={goals} />}
      </div>

      {/* Debt Statistics (Tiền vay & Tiền trả) */}
      <DebtsSummaryWidget
        debts={debts}
        debtHistories={debtHistories}
        year={year}
        month={month}
      />
    </div>
  )
}
