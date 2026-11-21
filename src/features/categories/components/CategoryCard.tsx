import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Edit2, Trash2 } from 'lucide-react'
import type { Category } from '@shared/types'

interface CategoryCardProps {
  category: Category
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
}

export function CategoryCard({ category, onEdit, onDelete }: CategoryCardProps) {
  return (
    <Card className="p-3 sm:p-3.5 flex items-center justify-between hover:shadow-sm transition-shadow min-w-0">
      <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm"
          style={{ backgroundColor: category.color }}
        >
          {category.name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-sm text-foreground line-clamp-1" title={category.name}>
            {category.name}
          </h4>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <span className="shrink-0">{category.type === 'expense' ? 'Khoản chi' : 'Khoản thu'}</span>
            {category.isDefault && (
              <Badge variant="outline" className="text-[10px] text-muted-foreground px-1.5 py-0 shrink-0 font-normal">
                Mặc định
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(category)}
          className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground touch-target"
          aria-label={`Sửa danh mục ${category.name}`}
        >
          <Edit2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(category)}
          className="w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive touch-target"
          aria-label={`Xóa danh mục ${category.name}`}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  )
}
