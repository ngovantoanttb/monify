import React from 'react'
import { accountsService } from '@/features/accounts/services/accounts'
import { transactionsService } from '@/features/transactions/services/transactions'
import { AccountCard } from '@/features/accounts/components/AccountCard'
import { AccountDialog } from '@/features/accounts/components/AccountDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/stores/auth'
import { formatCurrency, calculateAccountBalance } from '@/lib/finance'
import { Plus, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import type { Account, Transaction } from '@shared/types'
import type { AccountFormValues } from '@/features/accounts/schemas/accountSchema'

export function AccountsPage() {
  const { user } = useAuthStore()
  const [accounts, setAccounts] = React.useState<Account[]>([])
  const [transactions, setTransactions] = React.useState<Transaction[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [editingAccount, setEditingAccount] = React.useState<Account | null>(null)
  const [deletingAccount, setDeletingAccount] = React.useState<Account | null>(null)

  const loadAccounts = React.useCallback(async () => {
    if (!user?.uid) return
    setIsLoading(true)
    try {
      const [accsData, txsData] = await Promise.all([
        accountsService.getAccounts(user.uid),
        transactionsService.getAllTransactions(user.uid),
      ])
      setAccounts(accsData)
      setTransactions(txsData)
    } catch {
      toast.error('Không thể tải danh sách ví')
    } finally {
      setIsLoading(false)
    }
  }, [user?.uid])

  React.useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  const handleCreateOrUpdate = async (values: AccountFormValues) => {
    if (!user?.uid) return
    try {
      if (editingAccount) {
        await accountsService.updateAccount(user.uid, editingAccount.id, values)
        toast.success('Cập nhật ví thành công')
      } else {
        await accountsService.createAccount(user.uid, values)
        toast.success('Thêm ví mới thành công')
      }
      loadAccounts()
    } catch (err: any) {
      toast.error(err.message || 'Thao tác thất bại')
    }
  }

  const handleDelete = async () => {
    if (!user?.uid || !deletingAccount) return
    try {
      await accountsService.deleteAccount(user.uid, deletingAccount.id)
      toast.success('Đã xóa ví')
      setDeletingAccount(null)
      loadAccounts()
    } catch (err: any) {
      toast.error(err.message || 'Không thể xóa ví')
    }
  }

  // Tính số dư thực tế của từng ví dựa trên số dư ban đầu và các giao dịch thu/chi/chuyển ví
  const accountBalances: Record<string, number> = React.useMemo(() => {
    const map: Record<string, number> = {}
    accounts.forEach((acc) => {
      map[acc.id] = calculateAccountBalance(acc.openingBalance, acc.id, transactions)
    })
    return map
  }, [accounts, transactions])

  // Tổng tài sản thực tế của người dùng (tổng tất cả các ví)
  const totalBalance = React.useMemo(() => {
    return Object.values(accountBalances).reduce((sum, b) => sum + b, 0)
  }, [accountBalances])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tài khoản & Ví</h1>
          <p className="text-sm text-muted-foreground">
            Tổng tài sản hiện tại:{' '}
            <strong className="text-primary text-base font-bold">{formatCurrency(totalBalance)}</strong>
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingAccount(null)
            setIsDialogOpen(true)
          }}
          variant="brand"
          className="flex items-center gap-2 touch-target w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          <span>Thêm ví mới</span>
        </Button>
      </div>

      {/* Account List */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
        </div>
      ) : accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Chưa có tài khoản hoặc ví nào"
          description="Tạo ví đầu tiên (tiền mặt, thẻ ngân hàng, ví điện tử) để bắt đầu ghi chép chi tiêu."
          actionLabel="Tạo ví ngay"
          onAction={() => {
            setEditingAccount(null)
            setIsDialogOpen(true)
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc) => (
            <AccountCard
              key={acc.id}
              account={acc}
              currentBalance={accountBalances[acc.id]}
              onEdit={(account) => {
                setEditingAccount(account)
                setIsDialogOpen(true)
              }}
              onDelete={(account) => setDeletingAccount(account)}
            />
          ))}
        </div>
      )}

      {/* Form Dialog / BottomSheet */}
      <AccountDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSubmit={handleCreateOrUpdate}
        initialData={editingAccount}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingAccount}
        onClose={() => setDeletingAccount(null)}
        onConfirm={handleDelete}
        title="Xóa tài khoản ví"
        description={`Bạn có chắc chắn muốn xóa ví "${deletingAccount?.name}"? Thao tác này không thể hoàn tác.`}
        confirmText="Xác nhận xóa"
      />
    </div>
  )
}
