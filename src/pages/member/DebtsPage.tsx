import React from 'react'
import { useAuthStore } from '@/stores/auth'
import { debtsService } from '@/features/debts/services/debts'
import { DebtCard } from '@/features/debts/components/DebtCard'
import { DebtDialog } from '@/features/debts/components/DebtDialog'
import { PaymentDialog } from '@/features/debts/components/PaymentDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, evaluateDebtStatus } from '@/lib/finance'
import { HandCoins, Plus, ArrowUpRight, ArrowDownLeft, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { Debt } from '@shared/types'
import type { DebtFormValues } from '@/features/debts/schemas/debtSchema'

type DebtFilterTab = 'all' | 'lent' | 'borrowed' | 'overdue' | 'unsettled' | 'settled'

export function DebtsPage() {
  const { user } = useAuthStore()
  const [debts, setDebts] = React.useState<Debt[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [activeTab, setActiveTab] = React.useState<DebtFilterTab>('all')

  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [editingDebt, setEditingDebt] = React.useState<Debt | null>(null)
  const [paymentDebt, setPaymentDebt] = React.useState<Debt | null>(null)
  const [deletingDebt, setDeletingDebt] = React.useState<Debt | null>(null)

  const loadDebts = React.useCallback(async () => {
    if (!user?.uid) return
    setIsLoading(true)
    try {
      const data = await debtsService.getDebts(user.uid)
      setDebts(data)
    } catch {
      toast.error('Không thể tải danh sách công nợ')
    } finally {
      setIsLoading(false)
    }
  }, [user?.uid])

  React.useEffect(() => {
    loadDebts()
  }, [loadDebts])

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

  const handleCreateOrUpdate = async (values: DebtFormValues) => {
    if (!user?.uid) return
    try {
      if (editingDebt) {
        await debtsService.updateDebt(user.uid, editingDebt.id, values)
        toast.success('Cập nhật khoản nợ thành công')
      } else {
        await debtsService.createDebt(user.uid, values)
        toast.success('Tạo khoản nợ mới thành công')
      }
      await loadDebts()
    } catch {
      toast.error('Có lỗi xảy ra khi lưu khoản nợ')
    }
  }

  const handleRecordPayment = async (debtId: string, amount: number) => {
    if (!user?.uid) return
    try {
      await debtsService.recordPayment(user.uid, debtId, amount)
      toast.success('Ghi nhận thanh toán thành công')
      await loadDebts()
    } catch {
      toast.error('Không thể ghi nhận thanh toán')
    }
  }

  const handleDelete = async () => {
    if (!user?.uid || !deletingDebt) return
    try {
      await debtsService.deleteDebt(user.uid, deletingDebt.id)
      toast.success('Đã xóa khoản nợ')
      setDeletingDebt(null)
      await loadDebts()
    } catch {
      toast.error('Không thể xóa khoản nợ')
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
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors touch-target ${
                activeTab === 'all'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              Tất cả ({debts.length})
            </button>
            <button
              onClick={() => setActiveTab('unsettled')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors touch-target ${
                activeTab === 'unsettled'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              Chưa tất toán
            </button>
            {summaryStats.overdueCount > 0 && (
              <button
                onClick={() => setActiveTab('overdue')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors touch-target flex items-center gap-1 ${
                  activeTab === 'overdue'
                    ? 'bg-destructive text-destructive-foreground shadow-xs'
                    : 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                Quá hạn ({summaryStats.overdueCount})
              </button>
            )}
            <button
              onClick={() => setActiveTab('lent')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors touch-target ${
                activeTab === 'lent'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              Tôi cho vay
            </button>
            <button
              onClick={() => setActiveTab('borrowed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors touch-target ${
                activeTab === 'borrowed'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              Tôi vay
            </button>
            <button
              onClick={() => setActiveTab('settled')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors touch-target ${
                activeTab === 'settled'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
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
                  onPayment={(d) => setPaymentDebt(d)}
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
        onSubmit={handleCreateOrUpdate}
      />

      {/* Dialog thanh toán nợ nhanh */}
      <PaymentDialog
        isOpen={!!paymentDebt}
        onClose={() => setPaymentDebt(null)}
        debt={paymentDebt}
        onRecordPayment={handleRecordPayment}
      />

      {/* Xác nhận xóa */}
      <ConfirmDialog
        isOpen={!!deletingDebt}
        onClose={() => setDeletingDebt(null)}
        onConfirm={handleDelete}
        title="Xóa khoản nợ"
        description={`Bạn có chắc chắn muốn xóa khoản nợ với "${deletingDebt?.personName}"? Dữ liệu đã xóa không thể khôi phục.`}
        confirmText="Xóa khoản nợ"
        isDestructive={true}
      />
    </div>
  )
}
