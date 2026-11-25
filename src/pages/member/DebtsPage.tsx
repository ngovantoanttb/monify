import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { debtsService } from '@/features/debts/services/debts'
import { accountsService } from '@/features/accounts/services/accounts'
import { transactionsService } from '@/features/transactions/services/transactions'
import { DebtCard } from '@/features/debts/components/DebtCard'
import { DebtDialog, type DebtDialogSubmitValues } from '@/features/debts/components/DebtDialog'
import { PaymentDialog, type PaymentSubmitPayload } from '@/features/debts/components/PaymentDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, evaluateDebtStatus, calculateAccountBalance } from '@/lib/finance'
import { HandCoins, Plus, ArrowUpRight, ArrowDownLeft, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { Account, Debt, Transaction } from '@shared/types'

type DebtFilterTab = 'all' | 'lent' | 'borrowed' | 'overdue' | 'unsettled' | 'settled'

export function DebtsPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [debts, setDebts] = React.useState<Debt[]>([])
  const [accounts, setAccounts] = React.useState<Account[]>([])
  const [transactions, setTransactions] = React.useState<Transaction[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [activeTab, setActiveTab] = React.useState<DebtFilterTab>('all')

  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [editingDebt, setEditingDebt] = React.useState<Debt | null>(null)
  const [paymentDebt, setPaymentDebt] = React.useState<Debt | null>(null)
  const [paymentMode, setPaymentMode] = React.useState<'payment' | 'settle'>('payment')
  const [deletingDebt, setDeletingDebt] = React.useState<Debt | null>(null)

  const loadDebts = React.useCallback(async () => {
    if (!user?.uid) return
    setIsLoading(true)
    try {
      const [debtsData, accountsData, txsData] = await Promise.all([
        debtsService.getDebts(user.uid),
        accountsService.getAccounts(user.uid),
        transactionsService.getAllTransactions(user.uid),
      ])
      setDebts(debtsData)
      setAccounts(accountsData)
      setTransactions(txsData)
    } catch {
      toast.error('Không thể tải danh sách công nợ')
    } finally {
      setIsLoading(false)
    }
  }, [user?.uid])

  React.useEffect(() => {
    loadDebts()
  }, [loadDebts])

  const accountBalances: Record<string, number> = React.useMemo(() => {
    const map: Record<string, number> = {}
    accounts.forEach((acc) => {
      map[acc.id] = calculateAccountBalance(acc.openingBalance, acc.id, transactions)
    })
    return map
  }, [accounts, transactions])

  // Thống kê hai chiều: Phải thu (Tôi cho vay) và Phải trả (Tôi vay)
  const summaryStats = React.useMemo(() => {
    let lentPrincipal = 0
    let lentPaid = 0
    let borrowedPrincipal = 0
    let borrowedPaid = 0
    let overdueCount = 0

    debts.forEach((d) => {
      const { status } = evaluateDebtStatus(d)
      if (status === 'overdue') {
        overdueCount++
      }

      if (d.kind === 'lent') {
        lentPrincipal += d.principal
        lentPaid += d.paidAmount
      } else {
        borrowedPrincipal += d.principal
        borrowedPaid += d.paidAmount
      }
    })

    const lentRemaining = Math.max(0, lentPrincipal - lentPaid)
    const borrowedRemaining = Math.max(0, borrowedPrincipal - borrowedPaid)

    return {
      lentPrincipal,
      lentPaid,
      lentRemaining,
      borrowedPrincipal,
      borrowedPaid,
      borrowedRemaining,
      overdueCount,
    }
  }, [debts])

  const handleCreateOrUpdate = async (values: DebtDialogSubmitValues) => {
    if (!user?.uid) return
    try {
      if (editingDebt) {
        await debtsService.updateDebt(user.uid, editingDebt.id, values)
        toast.success('Cập nhật khoản nợ thành công')
      } else {
        await debtsService.createDebt(user.uid, {
          ...values,
          accountId: values.accountId || '',
          idempotencyKey: values.idempotencyKey,
        })
        toast.success('Tạo khoản nợ và cập nhật số dư nguồn tiền thành công')
      }
      await loadDebts()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu khoản nợ')
      throw err
    }
  }

  const handleRecordPayment = async (payload: PaymentSubmitPayload) => {
    if (!user?.uid) return
    try {
      const result = await debtsService.executeDebtCashflow({
        uid: user.uid,
        debtId: payload.debtId,
        accountId: payload.accountId,
        amount: payload.amount,
        mode: payload.mode,
        note: payload.note,
        idempotencyKey: payload.idempotencyKey,
      })

      if (result.deduplicated) {
        toast.info('Giao dịch này đã được ghi nhận trước đó')
      } else if (payload.mode === 'settle') {
        toast.success('Tất toán khoản công nợ thành công')
      } else {
        toast.success('Ghi nhận thanh toán thành công')
      }

      await loadDebts()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Không thể ghi nhận thanh toán')
      throw err
    }
  }

  const handleDelete = async () => {
    if (!user?.uid || !deletingDebt) return
    try {
      await debtsService.deleteDebt(user.uid, deletingDebt.id)
      toast.success('Đã xóa khoản nợ')
      setDeletingDebt(null)
      await loadDebts()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Không thể xóa khoản nợ')
    }
  }

  const filteredDebts = debts.filter((d) => {
    const { status } = evaluateDebtStatus(d)
    const isSettled = status === 'settled'

    if (activeTab === 'lent') return d.kind === 'lent'
    if (activeTab === 'borrowed') return d.kind === 'borrowed'
    if (activeTab === 'overdue') return status === 'overdue'
    if (activeTab === 'unsettled') return !isSettled
    if (activeTab === 'settled') return isSettled
    return true
  })

  return (
    <div className="space-y-5 pb-16 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Quản lý Công nợ
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Theo dõi các khoản tiền bạn cho vay và các khoản bạn đang vay
          </p>
        </div>

        <Button
          onClick={() => {
            setEditingDebt(null)
            setIsDialogOpen(true)
          }}
          className="font-medium shrink-0 shadow-xs h-10 touch-target"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          <span className="text-sm">Thêm khoản nợ</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24 rounded-xl" />
            <Skeleton className="h-9 w-28 rounded-xl" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Skeleton className="h-36 w-full rounded-xl" />
            <Skeleton className="h-36 w-full rounded-xl" />
          </div>
        </div>
      ) : (
        <>
          {/* Hai thẻ tổng hợp: Tôi cho vay vs Tôi vay */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Phải thu */}
            <Card className="border-emerald-200/60 dark:border-emerald-900/40 bg-gradient-to-br from-emerald-500/5 to-card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                    <CardTitle className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">
                      Tôi cho vay (Phải thu)
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5">
                <div className="flex justify-between items-baseline text-xs text-muted-foreground">
                  <span>Tổng tiền cho vay:</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(summaryStats.lentPrincipal)}
                  </span>
                </div>
                <div className="flex justify-between items-baseline text-xs text-muted-foreground">
                  <span>Đã thu hồi:</span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(summaryStats.lentPaid)}
                  </span>
                </div>
                <div className="flex justify-between items-baseline pt-1 border-t border-border/40">
                  <span className="text-xs font-semibold text-foreground">Còn phải thu:</span>
                  <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(summaryStats.lentRemaining)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Phải trả */}
            <Card className="border-amber-200/60 dark:border-amber-900/40 bg-gradient-to-br from-amber-500/5 to-card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <ArrowDownLeft className="w-4 h-4" />
                    </div>
                    <CardTitle className="text-sm font-semibold text-amber-900 dark:text-amber-300">
                      Tôi vay (Phải trả)
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5">
                <div className="flex justify-between items-baseline text-xs text-muted-foreground">
                  <span>Tổng tiền vay:</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(summaryStats.borrowedPrincipal)}
                  </span>
                </div>
                <div className="flex justify-between items-baseline text-xs text-muted-foreground">
                  <span>Đã thanh toán:</span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(summaryStats.borrowedPaid)}
                  </span>
                </div>
                <div className="flex justify-between items-baseline pt-1 border-t border-border/40">
                  <span className="text-xs font-semibold text-foreground">Còn phải trả:</span>
                  <span className="text-base font-bold text-amber-600 dark:text-amber-400">
                    {formatCurrency(summaryStats.borrowedRemaining)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 -mx-4 px-4 sm:mx-0 sm:px-0">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                activeTab === 'all'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/40'
              }`}
            >
              Tất cả ({debts.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('unsettled')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                activeTab === 'unsettled'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/40'
              }`}
            >
              Chưa tất toán
            </button>
            {summaryStats.overdueCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('overdue')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 ${
                  activeTab === 'overdue'
                    ? 'bg-destructive text-destructive-foreground shadow-xs'
                    : 'bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                Quá hạn ({summaryStats.overdueCount})
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('lent')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                activeTab === 'lent'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/40'
              }`}
            >
              <span className="sm:hidden">Cho vay</span>
              <span className="hidden sm:inline">Tôi cho vay</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('borrowed')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                activeTab === 'borrowed'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/40'
              }`}
            >
              <span className="sm:hidden">Đi vay</span>
              <span className="hidden sm:inline">Tôi vay</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('settled')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                activeTab === 'settled'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/40'
              }`}
            >
              Đã tất toán
            </button>
          </div>

          {/* Danh sách khoản nợ */}
          {filteredDebts.length === 0 ? (
            <EmptyState
              icon={HandCoins}
              title="Chưa có khoản nợ nào"
              description={
                activeTab === 'overdue'
                  ? 'Tuyệt vời! Không có khoản nợ nào bị quá hạn.'
                  : activeTab === 'settled'
                    ? 'Chưa có khoản nợ nào được tất toán xong.'
                    : 'Ghi lại các khoản tiền cho vay hoặc đi vay để luôn kiểm soát dòng tiền chính xác.'
              }
              actionLabel={activeTab === 'all' ? '+ Thêm khoản nợ mới' : undefined}
              onAction={
                activeTab === 'all'
                  ? () => {
                      setEditingDebt(null)
                      setIsDialogOpen(true)
                    }
                  : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredDebts.map((debt) => (
                <DebtCard
                  key={debt.id}
                  debt={debt}
                  onEdit={(d) => {
                    setEditingDebt(d)
                    setIsDialogOpen(true)
                  }}
                  onDelete={(d) => setDeletingDebt(d)}
                  onPayment={(d) => {
                    setPaymentMode('payment')
                    setPaymentDebt(d)
                  }}
                  onSettle={(d) => {
                    setPaymentMode('settle')
                    setPaymentDebt(d)
                  }}
                  onViewDetail={(d) => navigate(`/debts/${d.id}`)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Dialog tạo/sửa khoản nợ */}
      <DebtDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false)
          setEditingDebt(null)
        }}
        initialData={editingDebt}
        accounts={accounts}
        accountBalances={accountBalances}
        onSubmit={handleCreateOrUpdate}
      />

      {/* Dialog thanh toán / tất toán công nợ */}
      <PaymentDialog
        isOpen={!!paymentDebt}
        onClose={() => setPaymentDebt(null)}
        debt={paymentDebt}
        accounts={accounts}
        accountBalances={accountBalances}
        initialMode={paymentMode}
        onRecordPayment={handleRecordPayment}
      />

      {/* Xác nhận xóa */}
      <ConfirmDialog
        isOpen={!!deletingDebt}
        onClose={() => setDeletingDebt(null)}
        onConfirm={handleDelete}
        title="Xóa khoản nợ"
        description={`Bạn có chắc chắn muốn xóa khoản nợ với "${deletingDebt?.personName}"? Lưu ý: lịch sử giao dịch đã phát sinh vẫn được bảo toàn.`}
        confirmText="Xóa khoản nợ"
        isDestructive={true}
      />
    </div>
  )
}
