import React from 'react'
import { useSearchParams } from 'react-router-dom'
import { transactionsService } from '@/features/transactions/services/transactions'
import { accountsService } from '@/features/accounts/services/accounts'
import { categoriesService } from '@/features/categories/services/categories'
import { TransactionCard } from '@/features/transactions/components/TransactionCard'
import { TransactionDialog } from '@/features/transactions/components/TransactionDialog'
import { TransactionFiltersSheet } from '@/features/transactions/components/TransactionFiltersSheet'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { Pagination } from '@/components/shared/Pagination'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/stores/auth'
import { useTransactionFilterStore } from '@/stores/transactionFilter'
import { Plus, ReceiptText, SlidersHorizontal, Search, Calendar, X } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/finance'
import type { Transaction, Account, Category } from '@shared/types'
import type { TransactionFormValues } from '@/features/transactions/schemas/transactionSchema'

const PAGE_SIZE = 10

function formatDateFilterLabel(startDate?: number, endDate?: number): string {
  if (!startDate && !endDate) return ''

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime()
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime()

  const yest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  const yestStart = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate(), 0, 0, 0, 0).getTime()
  const yestEnd = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate(), 23, 59, 59, 999).getTime()

  if (startDate === todayStart && endDate === todayEnd) {
    return `Hôm nay (${now.getDate()}/${now.getMonth() + 1})`
  }
  if (startDate === yestStart && endDate === yestEnd) {
    return `Hôm qua (${yest.getDate()}/${yest.getMonth() + 1})`
  }

  if (startDate && endDate) {
    const s = new Date(startDate)
    const e = new Date(endDate)

    // Cùng 1 ngày
    if (s.toDateString() === e.toDateString()) {
      return `Ngày ${s.getDate()}/${s.getMonth() + 1}/${s.getFullYear()}`
    }

    // Cả tháng
    const isFirstDay = s.getDate() === 1
    const lastDayOfMonth = new Date(s.getFullYear(), s.getMonth() + 1, 0).getDate()
    const isLastDay = e.getDate() === lastDayOfMonth
    if (isFirstDay && isLastDay && s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
      return `Tháng ${s.getMonth() + 1}/${s.getFullYear()}`
    }

    // Khoảng ngày
    return `${s.getDate()}/${s.getMonth() + 1} - ${e.getDate()}/${e.getMonth() + 1}/${e.getFullYear()}`
  }

  if (startDate) {
    const s = new Date(startDate)
    return `Từ ${s.getDate()}/${s.getMonth() + 1}/${s.getFullYear()}`
  }

  if (endDate) {
    const e = new Date(endDate)
    return `Đến ${e.getDate()}/${e.getMonth() + 1}/${e.getFullYear()}`
  }

  return ''
}

export function TransactionsPage() {
  const { user } = useAuthStore()
  const { filters, setFilters, resetFilters } = useTransactionFilterStore()
  const [searchParams, setSearchParams] = useSearchParams()

  const [transactions, setTransactions] = React.useState<Transaction[]>([])
  const [accounts, setAccounts] = React.useState<Account[]>([])
  const [categories, setCategories] = React.useState<Category[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [isFilterSheetOpen, setIsFilterSheetOpen] = React.useState(false)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [editingTx, setEditingTx] = React.useState<Transaction | null>(null)
  const [deletingTx, setDeletingTx] = React.useState<Transaction | null>(null)

  React.useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setEditingTx(null)
      setIsDialogOpen(true)
      // Xóa query param để không mở lại khi refresh
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const loadData = React.useCallback(async () => {
    if (!user?.uid) return
    setIsLoading(true)
    try {
      const [accs, cats, allTxs] = await Promise.all([
        accountsService.getAccounts(user.uid),
        categoriesService.getCategories(user.uid),
        transactionsService.getAllTransactions(user.uid),
      ])
      setAccounts(accs)
      setCategories(cats)
      setTransactions(allTxs)
    } catch {
      toast.error('Không thể tải danh sách giao dịch')
    } finally {
      setIsLoading(false)
    }
  }, [user?.uid])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [filters])

  const handleCreateOrUpdate = async (values: TransactionFormValues) => {
    if (!user?.uid) return
    try {
      if (editingTx) {
        await transactionsService.updateTransaction(user.uid, editingTx.id, values)
        toast.success('Cập nhật giao dịch thành công')
      } else {
        await transactionsService.createTransaction(user.uid, values)
        toast.success('Đã lưu giao dịch mới')
      }
      loadData()
    } catch (err: any) {
      toast.error(err.message || 'Thao tác thất bại')
    }
  }

  const handleDelete = async () => {
    if (!user?.uid || !deletingTx) return
    try {
      await transactionsService.deleteTransaction(user.uid, deletingTx.id)
      toast.success('Đã xóa giao dịch')
      setDeletingTx(null)
      loadData()
    } catch (err: any) {
      toast.error(err.message || 'Không thể xóa giao dịch')
    }
  }

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime()
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime()

  const yest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  const yestStart = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate(), 0, 0, 0, 0).getTime()
  const yestEnd = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate(), 23, 59, 59, 999).getTime()

  const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0).getTime()

  const curMonthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime()
  const curMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime()

  const quickDatePills = [
    {
      key: 'all',
      label: 'Tất cả ngày',
      isActive: !filters.startDate && !filters.endDate,
      onClick: () => setFilters({ startDate: undefined, endDate: undefined }),
    },
    {
      key: 'today',
      label: 'Hôm nay',
      isActive: filters.startDate === todayStart && filters.endDate === todayEnd,
      onClick: () => setFilters({ startDate: todayStart, endDate: todayEnd }),
    },
    {
      key: 'yesterday',
      label: 'Hôm qua',
      isActive: filters.startDate === yestStart && filters.endDate === yestEnd,
      onClick: () => setFilters({ startDate: yestStart, endDate: yestEnd }),
    },
    {
      key: '7days',
      label: '7 ngày qua',
      isActive: filters.startDate === sevenDaysAgo && filters.endDate === todayEnd,
      onClick: () => setFilters({ startDate: sevenDaysAgo, endDate: todayEnd }),
    },
    {
      key: 'thisMonth',
      label: 'Tháng này',
      isActive: filters.startDate === curMonthStart && filters.endDate === curMonthEnd,
      onClick: () => setFilters({ startDate: curMonthStart, endDate: curMonthEnd }),
    },
  ]

  const activeFiltersCount = [
    filters.type,
    filters.accountId,
    filters.categoryId,
    filters.search,
    filters.startDate || filters.endDate,
  ].filter(Boolean).length

  const filteredTransactions = React.useMemo(() => {
    let result = transactions
    if (filters.type) {
      result = result.filter((t) => t.type === filters.type)
    }
    if (filters.accountId) {
      result = result.filter((t) => t.accountId === filters.accountId || t.toAccountId === filters.accountId)
    }
    if (filters.categoryId) {
      result = result.filter((t) => t.categoryId === filters.categoryId)
    }
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter((t) => (t.note || '').toLowerCase().includes(q))
    }
    if (filters.startDate) {
      result = result.filter((t) => t.date >= filters.startDate!)
    }
    if (filters.endDate) {
      result = result.filter((t) => t.date <= filters.endDate!)
    }
    return result
  }, [transactions, filters])

  const summary = React.useMemo(() => {
    let expense = 0
    let income = 0
    for (const tx of filteredTransactions) {
      if (tx.type === 'expense') expense += tx.amount
      else if (tx.type === 'income') income += tx.amount
    }
    return { expense, income }
  }, [filteredTransactions])

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)

  const paginatedTransactions = React.useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return filteredTransactions.slice(start, start + PAGE_SIZE)
  }, [filteredTransactions, safePage])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sổ giao dịch</h1>
          <p className="text-sm text-muted-foreground">Theo dõi mọi khoản thu, chi và chuyển tiền</p>
        </div>
        <Button
          onClick={() => {
            setEditingTx(null)
            setIsDialogOpen(true)
          }}
          variant="brand"
          className="flex items-center gap-2 touch-target w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          <span>Thêm giao dịch</span>
        </Button>
      </div>

      {/* Sticky Search & Filter Bar */}
      <div className="sticky top-[57px] lg:top-0 z-20 bg-background/95 backdrop-blur py-2 space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm theo ghi chú..."
              value={filters.search || ''}
              onChange={(e) => setFilters({ search: e.target.value })}
              className="pl-9 h-11 text-sm bg-card"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setIsFilterSheetOpen(true)}
            className="flex items-center gap-2 h-11 px-3 touch-target shrink-0"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Bộ lọc</span>
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                {activeFiltersCount}
              </span>
            )}
          </Button>
        </div>

        {/* Thanh chọn ngày nhanh (Quick Date Filter Pills) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 text-xs">
          {quickDatePills.map((pill) => (
            <button
              key={pill.key}
              type="button"
              onClick={pill.onClick}
              className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap border transition-all ${
                pill.isActive
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm font-semibold'
                  : 'bg-card text-muted-foreground border-border hover:text-foreground hover:bg-accent'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Active Filter Chips */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {(filters.startDate || filters.endDate) && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatDateFilterLabel(filters.startDate, filters.endDate)}</span>
              <button
                type="button"
                onClick={() => setFilters({ startDate: undefined, endDate: undefined })}
                className="hover:opacity-75 p-0.5"
                title="Bỏ lọc thời gian"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.type && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium border border-border">
              <span>{filters.type === 'expense' ? 'Chi tiêu' : filters.type === 'income' ? 'Thu nhập' : 'Chuyển ví'}</span>
              <button
                type="button"
                onClick={() => setFilters({ type: undefined })}
                className="hover:opacity-75 p-0.5"
                title="Bỏ lọc loại"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.accountId && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium border border-border">
              <span>{accounts.find((a) => a.id === filters.accountId)?.name || 'Ví'}</span>
              <button
                type="button"
                onClick={() => setFilters({ accountId: undefined })}
                className="hover:opacity-75 p-0.5"
                title="Bỏ lọc ví"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.categoryId && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium border border-border">
              <span>{categories.find((c) => c.id === filters.categoryId)?.name || 'Danh mục'}</span>
              <button
                type="button"
                onClick={() => setFilters({ categoryId: undefined })}
                className="hover:opacity-75 p-0.5"
                title="Bỏ lọc danh mục"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={resetFilters}
            className="text-xs text-muted-foreground hover:text-foreground underline pl-1 touch-target py-1"
          >
            Đặt lại tất cả
          </button>
        </div>
      )}

      {/* Summary Box (Thu & Chi theo bộ lọc hiện tại) */}
      {transactions.length > 0 && (
        <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-card border border-border shadow-sm text-sm">
          <div>
            <span className="text-xs text-muted-foreground block font-medium">Tổng chi tiêu</span>
            <span className="text-base font-bold text-destructive">
              -{formatCurrency(summary.expense)}
            </span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block font-medium">Tổng thu nhập</span>
            <span className="text-base font-bold text-emerald-500">
              +{formatCurrency(summary.income)}
            </span>
          </div>
        </div>
      )}

      {/* Transaction List */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      ) : filteredTransactions.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="Không tìm thấy giao dịch nào"
          description={activeFiltersCount > 0 ? 'Thử thay đổi hoặc đặt lại bộ lọc tìm kiếm.' : 'Ghi nhận giao dịch đầu tiên ngay.'}
          actionLabel={activeFiltersCount > 0 ? 'Đặt lại bộ lọc' : 'Thêm giao dịch'}
          onAction={
            activeFiltersCount > 0
              ? resetFilters
              : () => {
                  setEditingTx(null)
                  setIsDialogOpen(true)
                }
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="space-y-2.5">
            {paginatedTransactions.map((tx) => (
              <TransactionCard
                key={tx.id}
                transaction={tx}
                accounts={accounts}
                categories={categories}
                onEdit={(t) => {
                  setEditingTx(t)
                  setIsDialogOpen(true)
                }}
                onDelete={(t) => setDeletingTx(t)}
              />
            ))}
          </div>

          {/* Thanh phân trang trung tâm (Pagination Control) */}
          <div className="pt-4 border-t border-border flex items-center justify-center">
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      )}

      {/* Add / Edit Transaction Form */}
      <TransactionDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSubmit={handleCreateOrUpdate}
        initialData={editingTx}
        accounts={accounts}
        categories={categories}
      />

      {/* Filter Bottom Sheet */}
      <TransactionFiltersSheet
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        filters={filters}
        onApplyFilters={setFilters}
        onResetFilters={resetFilters}
        accounts={accounts}
        categories={categories}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingTx}
        onClose={() => setDeletingTx(null)}
        onConfirm={handleDelete}
        title="Xóa giao dịch"
        description="Bạn có chắc chắn muốn xóa giao dịch này? Số dư ví sẽ tự động được cập nhật lại tương ứng."
        confirmText="Xác nhận xóa"
      />
    </div>
  )
}
