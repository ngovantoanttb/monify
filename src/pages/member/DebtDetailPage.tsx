import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { debtsService } from '@/features/debts/services/debts'
import { accountsService } from '@/features/accounts/services/accounts'
import { transactionsService } from '@/features/transactions/services/transactions'
import { DebtDialog } from '@/features/debts/components/DebtDialog'
import { PaymentDialog, type PaymentSubmitPayload } from '@/features/debts/components/PaymentDialog'
import { DebtHistoryList } from '@/features/debts/components/DebtHistoryList'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { calculateAccountBalance, evaluateDebtStatus, formatCurrency } from '@/lib/finance'
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  CheckCheck,
  CheckCircle2,
  DollarSign,
  Edit2,
  HandCoins,
  History,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Account, Debt, DebtHistory, Transaction } from '@shared/types'
import type { DebtFormValues } from '@/features/debts/schemas/debtSchema'

export function DebtDetailPage() {
  const { debtId } = useParams<{ debtId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [debt, setDebt] = React.useState<Debt | null>(null)
  const [histories, setHistories] = React.useState<DebtHistory[]>([])
  const [accounts, setAccounts] = React.useState<Account[]>([])
  const [transactions, setTransactions] = React.useState<Transaction[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [paymentMode, setPaymentMode] = React.useState<'payment' | 'settle' | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)

  const loadDetail = React.useCallback(async () => {
    if (!user?.uid || !debtId) return
    setIsLoading(true)
    try {
      const [debtData, historyData, accsData, txsData] = await Promise.all([
        debtsService.getDebtById(user.uid, debtId),
        debtsService.getDebtHistories(user.uid, debtId),
        accountsService.getAccounts(user.uid),
        transactionsService.getAllTransactions(user.uid),
      ])
      setDebt(debtData)
      setHistories(historyData)
      setAccounts(accsData)
      setTransactions(txsData)
    } catch {
      toast.error('Không thể tải chi tiết khoản công nợ')
    } finally {
      setIsLoading(false)
    }
  }, [user?.uid, debtId])

  React.useEffect(() => {
    loadDetail()
  }, [loadDetail])

  const accountBalances: Record<string, number> = React.useMemo(() => {
    const map: Record<string, number> = {}
    accounts.forEach((acc) => {
      map[acc.id] = calculateAccountBalance(acc.openingBalance, acc.id, transactions)
    })
    return map
  }, [accounts, transactions])

  const handleUpdateDebt = async (values: DebtFormValues) => {
    if (!user?.uid || !debt) return
    try {
      await debtsService.updateDebt(user.uid, debt.id, values)
      toast.success('Cập nhật khoản công nợ thành công')
      await loadDetail()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Có lỗi xảy ra khi cập nhật khoản nợ')
      throw err
    }
  }

  const handleCashflowSubmit = async (payload: PaymentSubmitPayload) => {
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
        toast.success('Ghi nhận giao dịch công nợ thành công')
      }

      await loadDetail()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Không thể thực hiện giao dịch công nợ')
      throw err
    }
  }

  const handleDelete = async () => {
    if (!user?.uid || !debt) return
    try {
      await debtsService.deleteDebt(user.uid, debt.id)
      toast.success('Đã xóa khoản công nợ')
      navigate('/debts', { replace: true })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Không thể xóa khoản công nợ')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-5 pb-16 md:pb-6">
        <Skeleton className="h-9 w-40 rounded-lg" />
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-10 w-52 rounded-lg" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    )
  }

  if (!debt) {
    return (
      <div className="space-y-4 pb-16 md:pb-6">
        <Button variant="ghost" onClick={() => navigate('/debts')} className="gap-2 -ml-2">
          <ArrowLeft className="w-4 h-4" />
          Quay lại danh sách công nợ
        </Button>
        <EmptyState
          icon={HandCoins}
          title="Không tìm thấy khoản công nợ"
          description="Khoản công nợ có thể đã bị xóa hoặc không tồn tại."
          actionLabel="Về danh sách công nợ"
          onAction={() => navigate('/debts')}
        />
      </div>
    )
  }

  const { remainingAmount, status } = evaluateDebtStatus(debt)
  const isLent = debt.kind === 'lent'
  const isSettled = status === 'settled'
  const percentDisplay =
    debt.principal > 0 ? Math.min(100, Math.round((debt.paidAmount / debt.principal) * 100)) : 0

  return (
    <div className="space-y-5 pb-16 md:pb-6">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={() => navigate('/debts')}
          className="gap-2 -ml-2 touch-target"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại Công nợ</span>
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditOpen(true)}
            className="h-9 touch-target"
          >
            <Edit2 className="w-4 h-4 mr-1.5" />
            Điều chỉnh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDeleteOpen(true)}
            className="h-9 text-destructive hover:text-destructive hover:bg-destructive/10 touch-target"
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            Xóa
          </Button>
        </div>
      </div>

      {/* Card chi tiết khoản nợ */}
      <Card className="border-border/80">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  isLent
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                }`}
              >
                {isLent ? (
                  <ArrowUpRight className="w-5 h-5" />
                ) : (
                  <ArrowDownLeft className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-lg sm:text-xl font-bold text-foreground">
                    {debt.personName}
                  </CardTitle>
                  <Badge
                    variant={isLent ? 'default' : 'secondary'}
                    className={
                      isLent
                        ? 'bg-emerald-600 text-white'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                    }
                  >
                    {isLent ? 'Tôi cho vay (Phải thu)' : 'Tôi vay (Phải trả)'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{debt.content}</p>
                {debt.dueDate && (
                  <div
                    className={`flex items-center gap-1.5 text-xs mt-1.5 ${
                      status === 'overdue' ? 'text-destructive font-medium' : 'text-muted-foreground'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      Hạn: {new Intl.DateTimeFormat('vi-VN').format(new Date(debt.dueDate))}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="shrink-0">
              {status === 'settled' ? (
                <Badge
                  variant="secondary"
                  className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Đã tất toán
                </Badge>
              ) : status === 'overdue' ? (
                <Badge variant="destructive">
                  <AlertCircle className="w-3.5 h-3.5 mr-1" />
                  Quá hạn
                </Badge>
              ) : status === 'active' ? (
                <Badge variant="outline">Đang hoạt động</Badge>
              ) : (
                <Badge variant="outline">Không có thời hạn</Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
              <div className="text-xs text-muted-foreground">Số tiền gốc</div>
              <div className="text-base sm:text-lg font-bold text-foreground mt-0.5">
                {formatCurrency(debt.principal)}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
              <div className="text-xs text-muted-foreground">
                {isLent ? 'Đã thu hồi' : 'Đã thanh toán'}
              </div>
              <div className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatCurrency(debt.paidAmount)}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
              <div className="text-xs text-muted-foreground">
                {isLent ? 'Còn phải thu' : 'Còn phải trả'}
              </div>
              <div
                className={`text-base sm:text-lg font-bold mt-0.5 ${
                  isSettled
                    ? 'text-emerald-600'
                    : status === 'overdue'
                      ? 'text-destructive'
                      : 'text-primary'
                }`}
              >
                {formatCurrency(remainingAmount)}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Tiến độ hoàn thành</span>
              <span className="font-semibold text-foreground">{percentDisplay}%</span>
            </div>
            <Progress
              value={percentDisplay}
              indicatorClassName={
                isSettled ? 'bg-emerald-600' : isLent ? 'bg-emerald-500' : 'bg-amber-500'
              }
              className="h-2.5"
            />
          </div>

          {debt.note && (
            <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-xl border border-border/40">
              <strong className="text-foreground">Ghi chú:</strong> {debt.note}
            </div>
          )}

          {!isSettled && (
            <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-border/40">
              <Button
                onClick={() => setPaymentMode('payment')}
                className="h-10 px-4 font-semibold touch-target"
              >
                <DollarSign className="w-4 h-4 mr-1.5" />
                {isLent ? 'Thu hồi nợ' : 'Trả nợ'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setPaymentMode('settle')}
                className="h-10 px-4 font-semibold text-emerald-700 dark:text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10 touch-target"
              >
                <CheckCheck className="w-4 h-4 mr-1.5" />
                Tất toán toàn bộ
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Khu vực Lịch sử giao dịch công nợ */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            <span>Lịch sử giao dịch công nợ ({histories.length})</span>
          </h3>
        </div>

        <DebtHistoryList histories={histories} accounts={accounts} />
      </div>

      {/* Dialogs */}
      <PaymentDialog
        isOpen={paymentMode !== null}
        onClose={() => setPaymentMode(null)}
        debt={debt}
        accounts={accounts}
        accountBalances={accountBalances}
        initialMode={paymentMode || 'payment'}
        onRecordPayment={handleCashflowSubmit}
      />

      <DebtDialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        initialData={debt}
        onSubmit={handleUpdateDebt}
      />

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Xóa khoản nợ"
        description={`Bạn có chắc chắn muốn xóa khoản nợ với "${debt.personName}"? Lưu ý: các giao dịch dòng tiền và lịch sử đã phát sinh vẫn được giữ nguyên để bảo toàn số dư ví.`}
        confirmText="Xóa khoản nợ"
        isDestructive={true}
      />
    </div>
  )
}
