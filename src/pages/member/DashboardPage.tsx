import React from 'react'
import { Card } from '@/components/ui/card'
import { MonthSelector } from '@/features/dashboard/components/MonthSelector'
import { CategoryPieChart } from '@/features/dashboard/components/CategoryPieChart'
import { MonthlyTrendChart } from '@/features/dashboard/components/MonthlyTrendChart'
import { BudgetAlertsWidget, type BudgetAlertItem } from '@/features/dashboard/components/BudgetAlertsWidget'
import { AccountsSummaryWidget } from '@/features/dashboard/components/AccountsSummaryWidget'
import { GoalsSummaryWidget } from '@/features/dashboard/components/GoalsSummaryWidget'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/stores/auth'
import { useViewPeriodStore } from '@/stores/viewPeriod'
import { accountsService } from '@/features/accounts/services/accounts'
import { categoriesService } from '@/features/categories/services/categories'
import { transactionsService } from '@/features/transactions/services/transactions'
import { goalsService } from '@/features/goals/services/goals'
import { budgetsService } from '@/features/budgets/services/budgets'
import {
  calculateTotalIncome,
  calculateTotalExpense,
  calculateNetBalance,
  calculateSavingsRate,
  calculateAccountBalance,
  formatCurrency,
  getMonthInterval,
  formatBudgetId,
} from '@/lib/finance'
import { TrendingUp, TrendingDown, Wallet, PiggyBank } from 'lucide-react'
import type { Account, Category, Transaction, Goal } from '@shared/types'

export function DashboardPage() {
  const { user } = useAuthStore()
  const { year, month } = useViewPeriodStore()

  const [isLoading, setIsLoading] = React.useState(true)
  const [accounts, setAccounts] = React.useState<Account[]>([])
  const [categories, setCategories] = React.useState<Category[]>([])
  const [transactions, setTransactions] = React.useState<Transaction[]>([])
  const [goals, setGoals] = React.useState<Goal[]>([])
  const [budgetAlerts, setBudgetAlerts] = React.useState<BudgetAlertItem[]>([])
  const [yearlyTrend, setYearlyTrend] = React.useState<{ month: string; income: number; expense: number }[]>([])

  const loadDashboardData = React.useCallback(async () => {
    if (!user?.uid) return
    setIsLoading(true)
    try {
      // 1. Tải danh sách ví, danh mục, toàn bộ giao dịch và mục tiêu của user
      const [accs, cats, allTxs, goalList] = await Promise.all([
        accountsService.getAccounts(user.uid),
        categoriesService.getCategories(user.uid),
        transactionsService.getAllTransactions(user.uid),
        goalsService.getGoals(user.uid),
      ])

      setAccounts(accs)
      setCategories(cats)
      setTransactions(allTxs)
      setGoals(goalList)

      // 2. Tính toán ngân sách cảnh báo
      const userBudgets = await budgetsService.getBudgets(user.uid)
      const alerts: BudgetAlertItem[] = []

      if (userBudgets.length > 0) {
        const monthInterval = getMonthInterval(year, month)
        const monthTxs = allTxs.filter(
          (t) => t.date >= monthInterval.start.getTime() && t.date <= monthInterval.end.getTime()
        )

        userBudgets.forEach((b) => {
          const expectedId = formatBudgetId(year, month, b.categoryId)
          if (b.id === expectedId && b.amount > 0) {
            const spent = monthTxs
              .filter((t) => t.type === 'expense' && t.categoryId === b.categoryId)
              .reduce((sum, t) => sum + t.amount, 0)

            const percentage = spent / b.amount
            if (percentage >= 0.8) {
              const cat = cats.find((c) => c.id === b.categoryId)
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
      }
      setBudgetAlerts(alerts)

      // 3. Tính toán xu hướng 12 tháng của năm được chọn
      const trendData = Array.from({ length: 12 }, (_, i) => {
        const m = i + 1
        const interval = getMonthInterval(year, m)
        const inMonth = allTxs.filter(
          (t) => t.date >= interval.start.getTime() && t.date <= interval.end.getTime()
        )
        const income = calculateTotalIncome(inMonth)
        const expense = calculateTotalExpense(inMonth)
        return {
          month: `T${m}`,
          income,
          expense,
        }
      })
      setYearlyTrend(trendData)
    } finally {
      setIsLoading(false)
    }
  }, [user?.uid, year, month])

  React.useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  // Lọc giao dịch trong tháng đang chọn
  const monthInterval = getMonthInterval(year, month)
  const currentMonthTransactions = transactions.filter(
    (t) => t.date >= monthInterval.start.getTime() && t.date <= monthInterval.end.getTime()
  )

  const totalIncome = calculateTotalIncome(currentMonthTransactions)
  const totalExpense = calculateTotalExpense(currentMonthTransactions)
  const netBalance = calculateNetBalance(totalIncome, totalExpense)
  const savingsRate = calculateSavingsRate(totalIncome, netBalance) * 100

  // Số dư của từng ví
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
      {/* Top Header with Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tổng quan tài chính</h1>
          <p className="text-sm text-muted-foreground">Theo dõi tổng thu, chi và ngân sách của bạn</p>
        </div>
        <MonthSelector />
      </div>

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
    </div>
  )
}
