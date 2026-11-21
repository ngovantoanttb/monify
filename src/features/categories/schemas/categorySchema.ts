import { z } from 'zod'

export const categorySchema = z.object({
  name: z.string().min(1, 'Tên danh mục không được để trống').max(60, 'Tên danh mục không được vượt quá 60 ký tự'),
  type: z.enum(['income', 'expense'], {
    errorMap: () => ({ message: 'Vui lòng chọn loại danh mục' }),
  }),
  icon: z.string().optional().default('Tag'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Màu sắc phải đúng định dạng mã HEX (#RRGGBB)'),
})

export type CategoryFormValues = z.infer<typeof categorySchema>
