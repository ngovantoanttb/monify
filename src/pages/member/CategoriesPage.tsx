import React from 'react'
import { categoriesService } from '@/features/categories/services/categories'
import { CategoryCard } from '@/features/categories/components/CategoryCard'
import { CategoryDialog } from '@/features/categories/components/CategoryDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/stores/auth'
import { Plus, Tags } from 'lucide-react'
import { toast } from 'sonner'
import type { Category, CategoryType } from '@shared/types'
import type { CategoryFormValues } from '@/features/categories/schemas/categorySchema'

export function CategoriesPage() {
  const { user } = useAuthStore()
  const [categories, setCategories] = React.useState<Category[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [activeTab, setActiveTab] = React.useState<CategoryType>('expense')
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [editingCategory, setEditingCategory] = React.useState<Category | null>(null)
  const [deletingCategory, setDeletingCategory] = React.useState<Category | null>(null)

  const loadCategories = React.useCallback(async () => {
    if (!user?.uid) return
    setIsLoading(true)
    try {
      const data = await categoriesService.getCategories(user.uid)
      setCategories(data)
    } catch {
      toast.error('Không thể tải danh sách danh mục')
    } finally {
      setIsLoading(false)
    }
  }, [user?.uid])

  React.useEffect(() => {
    loadCategories()
  }, [loadCategories])

  const filteredCategories = categories.filter((c) => c.type === activeTab)

  const handleCreateOrUpdate = async (values: CategoryFormValues) => {
    if (!user?.uid) return
    try {
      if (editingCategory) {
        await categoriesService.updateCategory(user.uid, editingCategory.id, values)
        toast.success('Cập nhật danh mục thành công')
      } else {
        await categoriesService.createCategory(user.uid, values)
        toast.success('Thêm danh mục mới thành công')
      }
      loadCategories()
    } catch (err: any) {
      toast.error(err.message || 'Thao tác thất bại')
    }
  }

  const handleDelete = async () => {
    if (!user?.uid || !deletingCategory) return
    try {
      await categoriesService.deleteCategory(user.uid, deletingCategory.id)
      toast.success('Đã xóa danh mục')
      setDeletingCategory(null)
      loadCategories()
    } catch (err: any) {
      toast.error(err.message || 'Không thể xóa danh mục')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Danh mục thu & chi</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Phân loại các khoản tiền để quản lý ngân sách hiệu quả</p>
        </div>
        <Button
          onClick={() => {
            setEditingCategory(null)
            setIsDialogOpen(true)
          }}
          variant="brand"
          className="flex items-center gap-2 touch-target w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          <span>Thêm danh mục</span>
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('expense')}
          className={`pb-2.5 px-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap touch-target ${
            activeTab === 'expense'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Khoản chi tiêu ({categories.filter((c) => c.type === 'expense').length})
        </button>
        <button
          onClick={() => setActiveTab('income')}
          className={`pb-2.5 px-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap touch-target ${
            activeTab === 'income'
              ? 'border-green-600 text-green-600'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Khoản thu nhập ({categories.filter((c) => c.type === 'income').length})
        </button>
      </div>

      {/* Category List */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      ) : filteredCategories.length === 0 ? (
        <EmptyState
          icon={Tags}
          title={`Chưa có danh mục ${activeTab === 'expense' ? 'chi tiêu' : 'thu nhập'}`}
          description="Tạo các mục phân loại như ăn uống, di chuyển, lương thưởng..."
          actionLabel="Tạo danh mục"
          onAction={() => {
            setEditingCategory(null)
            setIsDialogOpen(true)
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5">
          {filteredCategories.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              onEdit={(category) => {
                setEditingCategory(category)
                setIsDialogOpen(true)
              }}
              onDelete={(category) => setDeletingCategory(category)}
            />
          ))}
        </div>
      )}

      {/* Form Dialog / BottomSheet */}
      <CategoryDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSubmit={handleCreateOrUpdate}
        initialData={editingCategory}
        defaultType={activeTab}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingCategory}
        onClose={() => setDeletingCategory(null)}
        onConfirm={handleDelete}
        title="Xóa danh mục"
        description={`Bạn có chắc chắn muốn xóa danh mục "${deletingCategory?.name}"? Thao tác này không thể hoàn tác.`}
        confirmText="Xác nhận xóa"
      />
    </div>
  )
}
