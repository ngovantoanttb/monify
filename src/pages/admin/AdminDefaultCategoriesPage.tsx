import React from 'react'
import { adminApi } from '@/lib/api/admin'
import { CategoryDialog } from '@/features/categories/components/CategoryDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Tag,
  Utensils,
  Car,
  Home,
  ShoppingBag,
  HeartPulse,
  Film,
  GraduationCap,
  Banknote,
  Gift,
  TrendingUp,
  Coins,
  PlusCircle,
  Coffee,
  Zap,
  Smartphone,
  Plane,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import type { Category } from '@shared/types'
import type { CategoryFormValues } from '@/features/categories/schemas/categorySchema'

const ICON_MAP: Record<string, React.ElementType> = {
  Utensils,
  Car,
  Home,
  ShoppingBag,
  HeartPulse,
  Film,
  GraduationCap,
  Banknote,
  Gift,
  TrendingUp,
  Coins,
  PlusCircle,
  Coffee,
  Zap,
  Smartphone,
  Plane,
  Tags: Tag,
}

export function AdminDefaultCategoriesPage() {
  const [categories, setCategories] = React.useState<Category[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [activeTab, setActiveTab] = React.useState<'expense' | 'income'>('expense')

  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [editingCategory, setEditingCategory] = React.useState<Category | null>(null)
  const [deletingCategory, setDeletingCategory] = React.useState<Category | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const loadCategories = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await adminApi.getDefaultCategories()
      setCategories(data)
    } catch {
      toast.error('Không thể tải danh sách danh mục mặc định')
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadCategories()
  }, [loadCategories])

  const filteredCategories = categories.filter((c) => c.type === activeTab)

  const handleCreateOrUpdate = async (values: CategoryFormValues) => {
    setIsSubmitting(true)
    try {
      if (editingCategory) {
        await adminApi.updateDefaultCategory(editingCategory.id, values)
        toast.success(`Đã cập nhật danh mục mặc định "${values.name}"`)
      } else {
        await adminApi.createDefaultCategory(values)
        toast.success(`Đã thêm danh mục mặc định "${values.name}"`)
      }
      setIsDialogOpen(false)
      setEditingCategory(null)
      await loadCategories()
    } catch (err: any) {
      toast.error(err.message || 'Thao tác không thành công')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingCategory) return
    setIsSubmitting(true)
    try {
      await adminApi.deleteDefaultCategory(deletingCategory.id)
      toast.success(`Đã xóa danh mục mặc định "${deletingCategory.name}"`)
      setDeletingCategory(null)
      await loadCategories()
    } catch (err: any) {
      toast.error(err.message || 'Không thể xóa danh mục')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-5 pb-16 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8 rounded-lg">
            <Link to="/admin" aria-label="Quay lại Tổng quan">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Danh mục mặc định
              <Badge variant="secondary" className="text-xs font-normal">
                {categories.length} danh mục
              </Badge>
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Các danh mục được tự động khởi tạo khi người dùng mới đăng ký
            </p>
          </div>
        </div>

        <Button
          onClick={() => {
            setEditingCategory(null)
            setIsDialogOpen(true)
          }}
          className="gap-1.5 touch-target"
        >
          <Plus className="w-4 h-4" />
          Thêm danh mục mặc định
        </Button>
      </div>

      {/* Tabs Chuyển loại: Chi tiêu / Thu nhập */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('expense')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors touch-target ${
            activeTab === 'expense'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Chi tiêu ({categories.filter((c) => c.type === 'expense').length})
        </button>
        <button
          onClick={() => setActiveTab('income')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors touch-target ${
            activeTab === 'income'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Thu nhập ({categories.filter((c) => c.type === 'income').length})
        </button>
      </div>

      {/* Danh sách danh mục */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : filteredCategories.length === 0 ? (
        <EmptyState
          title={`Chưa có danh mục mặc định ${activeTab === 'expense' ? 'chi tiêu' : 'thu nhập'}`}
          description="Nhấn 'Thêm danh mục mặc định' để bổ sung danh mục mẫu cho người dùng mới."
          icon={Tag}
          actionLabel="Thêm danh mục"
          onAction={() => {
            setEditingCategory(null)
            setIsDialogOpen(true)
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredCategories.map((category) => {
            const IconComponent = ICON_MAP[category.icon] || Tag
            return (
              <Card
                key={category.id}
                className="p-3.5 flex items-center justify-between border-border/80 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white shadow-sm"
                    style={{ backgroundColor: category.color }}
                  >
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{category.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full border border-black/10"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {category.type === 'expense' ? 'Chi tiêu' : 'Thu nhập'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setEditingCategory(category)
                      setIsDialogOpen(true)
                    }}
                    aria-label={`Sửa danh mục ${category.name}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeletingCategory(category)}
                    aria-label={`Xóa danh mục ${category.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Dialog tạo/sửa danh mục */}
      <CategoryDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false)
          setEditingCategory(null)
        }}
        onSubmit={handleCreateOrUpdate}
        initialData={editingCategory}
        defaultType={activeTab}
        isLoading={isSubmitting}
      />

      {/* Dialog xác nhận xóa */}
      <ConfirmDialog
        isOpen={!!deletingCategory}
        onClose={() => setDeletingCategory(null)}
        onConfirm={handleDelete}
        title="Xóa danh mục mặc định"
        description={`Bạn có chắc muốn xóa danh mục "${deletingCategory?.name}" khỏi danh sách mặc định của hệ thống? Lưu ý: người dùng đã đăng ký trước đó sẽ không bị ảnh hưởng.`}
        confirmText="Xóa danh mục"
        isDestructive={true}
        isLoading={isSubmitting}
      />
    </div>
  )
}

