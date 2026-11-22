import React from 'react'
import { useAuthStore } from '@/stores/auth'
import { goalsService } from '@/features/goals/services/goals'
import { GoalCard } from '@/features/goals/components/GoalCard'
import { GoalDialog } from '@/features/goals/components/GoalDialog'
import { GoalDepositDialog } from '@/features/goals/components/GoalDepositDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/finance'
import { Target, Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { Goal } from '@shared/types'
import type { GoalFormValues } from '@/features/goals/schemas/goalSchema'

type GoalFilterTab = 'all' | 'active' | 'completed'

export function GoalsPage() {
  const { user } = useAuthStore()
  const [goals, setGoals] = React.useState<Goal[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [activeTab, setActiveTab] = React.useState<GoalFilterTab>('all')

  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [editingGoal, setEditingGoal] = React.useState<Goal | null>(null)
  const [depositGoal, setDepositGoal] = React.useState<Goal | null>(null)
  const [deletingGoal, setDeletingGoal] = React.useState<Goal | null>(null)

  const loadGoals = React.useCallback(async () => {
    if (!user?.uid) return
    setIsLoading(true)
    try {
      const data = await goalsService.getGoals(user.uid)
      setGoals(data)
    } catch {
      toast.error('Không thể tải danh sách mục tiêu tiết kiệm')
    } finally {
      setIsLoading(false)
    }
  }, [user?.uid])

  React.useEffect(() => {
    loadGoals()
  }, [loadGoals])

  // Tính toán tổng quan mục tiêu
  const stats = React.useMemo(() => {
    let totalTarget = 0
    let totalSaved = 0
    let completedCount = 0

    goals.forEach((g) => {
      totalTarget += g.targetAmount
      totalSaved += Math.min(g.targetAmount, g.savedAmount)
      if (g.savedAmount >= g.targetAmount) {
        completedCount++
      }
    })

    const totalRemaining = Math.max(0, totalTarget - totalSaved)
    const progressRate = totalTarget > 0 ? totalSaved / totalTarget : 0

    return {
      totalTarget,
      totalSaved,
      totalRemaining,
      progressRate,
      completedCount,
      totalCount: goals.length,
    }
  }, [goals])

  const handleCreateOrUpdate = async (values: GoalFormValues) => {
    if (!user?.uid) return
    try {
      if (editingGoal) {
        await goalsService.updateGoal(user.uid, editingGoal.id, values)
        toast.success('Cập nhật mục tiêu thành công')
      } else {
        await goalsService.createGoal(user.uid, values)
        toast.success('Tạo mục tiêu tiết kiệm thành công')
      }
      await loadGoals()
    } catch {
      toast.error('Có lỗi xảy ra khi lưu mục tiêu')
    }
  }

  const handleDeposit = async (goalId: string, additionalAmount: number) => {
    if (!user?.uid) return
    try {
      await goalsService.addSavedAmount(user.uid, goalId, additionalAmount)
      toast.success('Đã nạp tiền tiết kiệm thành công')
      await loadGoals()
    } catch {
      toast.error('Không thể nạp tiền vào mục tiêu')
    }
  }

  const handleDelete = async () => {
    if (!user?.uid || !deletingGoal) return
    try {
      await goalsService.deleteGoal(user.uid, deletingGoal.id)
      toast.success('Đã xóa mục tiêu tiết kiệm')
      setDeletingGoal(null)
      await loadGoals()
    } catch {
      toast.error('Không thể xóa mục tiêu')
    }
  }

  const filteredGoals = goals.filter((g) => {
    const isCompleted = g.savedAmount >= g.targetAmount
    if (activeTab === 'active') return !isCompleted
    if (activeTab === 'completed') return isCompleted
    return true
  })

  return (
    <div className="space-y-5 pb-16 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Mục tiêu Tiết kiệm
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Lập kế hoạch và theo dõi tiến độ các khoản tiết kiệm của bạn
          </p>
        </div>

        <Button
          onClick={() => {
            setEditingGoal(null)
            setIsDialogOpen(true)
          }}
          className="font-medium shrink-0 shadow-xs h-10 touch-target"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          <span className="text-sm">Thêm mục tiêu</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24 rounded-xl" />
            <Skeleton className="h-9 w-32 rounded-xl" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Skeleton className="h-36 w-full rounded-xl" />
            <Skeleton className="h-36 w-full rounded-xl" />
          </div>
        </div>
      ) : (
        <>
          {/* Tổng quan mục tiêu */}
          {goals.length > 0 && (
            <Card className="border-border/60 shadow-xs bg-gradient-to-br from-card to-card/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                      <Target className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">
                        Tổng tiến độ tiết kiệm
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Đã hoàn thành {stats.completedCount}/{stats.totalCount} mục tiêu
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-primary">
                    {(stats.progressRate * 100).toFixed(0)}%
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3.5">
                <div className="grid grid-cols-3 gap-2 py-1 text-xs">
                  <div>
                    <span className="text-muted-foreground">Tổng mục tiêu</span>
                    <p className="text-sm sm:text-base font-bold text-foreground truncate">
                      {formatCurrency(stats.totalTarget)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Đã tiết kiệm</span>
                    <p className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400 truncate">
                      {formatCurrency(stats.totalSaved)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Còn thiếu</span>
                    <p className="text-sm sm:text-base font-bold text-foreground truncate">
                      {formatCurrency(stats.totalRemaining)}
                    </p>
                  </div>
                </div>

                <Progress
                  value={Math.min(100, Math.round(stats.progressRate * 100))}
                  indicatorClassName="bg-primary"
                  className="h-2.5"
                />
              </CardContent>
            </Card>
          )}

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
              Tất cả ({goals.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('active')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                activeTab === 'active'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/40'
              }`}
            >
              <span className="sm:hidden">Đang tiết kiệm ({goals.length - stats.completedCount})</span>
              <span className="hidden sm:inline">Đang tiết kiệm ({goals.length - stats.completedCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('completed')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                activeTab === 'completed'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/40'
              }`}
            >
              Đã hoàn thành ({stats.completedCount})
            </button>
          </div>

          {/* Danh sách mục tiêu */}
          {filteredGoals.length === 0 ? (
            <EmptyState
              icon={Target}
              title="Chưa có mục tiêu nào"
              description={
                activeTab === 'completed'
                  ? 'Bạn chưa hoàn thành mục tiêu tiết kiệm nào. Hãy tiếp tục cố gắng!'
                  : activeTab === 'active'
                    ? 'Bạn đã hoàn thành tất cả các mục tiêu tiết kiệm rồi!'
                    : 'Hãy tạo mục tiêu tiết kiệm đầu tiên để theo dõi hành trình tài chính của bạn.'
              }
              actionLabel={activeTab === 'all' ? '+ Tạo mục tiêu mới' : undefined}
              onAction={
                activeTab === 'all'
                  ? () => {
                      setEditingGoal(null)
                      setIsDialogOpen(true)
                    }
                  : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={(g) => {
                    setEditingGoal(g)
                    setIsDialogOpen(true)
                  }}
                  onDelete={(g) => setDeletingGoal(g)}
                  onDeposit={(g) => setDepositGoal(g)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Dialog tạo/sửa mục tiêu */}
      <GoalDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false)
          setEditingGoal(null)
        }}
        initialData={editingGoal}
        onSubmit={handleCreateOrUpdate}
      />

      {/* Dialog nạp tiền nhanh */}
      <GoalDepositDialog
        isOpen={!!depositGoal}
        onClose={() => setDepositGoal(null)}
        goal={depositGoal}
        onDeposit={handleDeposit}
      />

      {/* Xác nhận xóa */}
      <ConfirmDialog
        isOpen={!!deletingGoal}
        onClose={() => setDeletingGoal(null)}
        onConfirm={handleDelete}
        title="Xóa mục tiêu tiết kiệm"
        description={`Bạn có chắc chắn muốn xóa mục tiêu "${deletingGoal?.name}"? Dữ liệu đã xóa không thể khôi phục.`}
        confirmText="Xóa mục tiêu"
        isDestructive={true}
      />
    </div>
  )
}
