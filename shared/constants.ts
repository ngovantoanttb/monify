// Shared Constants between Client and Server

export const APP_NAME = 'Monify'
export const DEFAULT_BUDGET_WARNING_THRESHOLD = 0.8 // 80%

export const DEFAULT_ACCOUNTS = [
  { name: 'Tiền mặt', type: 'cash' as const, openingBalance: 0 },
  { name: 'Ngân hàng', type: 'bank' as const, openingBalance: 0 },
  { name: 'Ví điện tử', type: 'ewallet' as const, openingBalance: 0 },
  { name: 'Tiết kiệm', type: 'savings' as const, openingBalance: 0 },
]

export const DEFAULT_SYSTEM_CATEGORIES = [
  // Khoản chi
  { name: 'Ăn uống', type: 'expense' as const, icon: 'Utensils', color: '#EF4444', isDefault: true },
  { name: 'Di chuyển', type: 'expense' as const, icon: 'Car', color: '#F97316', isDefault: true },
  { name: 'Nhà cửa & Hóa đơn', type: 'expense' as const, icon: 'Home', color: '#3B82F6', isDefault: true },
  { name: 'Mua sắm', type: 'expense' as const, icon: 'ShoppingBag', color: '#EC4899', isDefault: true },
  { name: 'Sức khỏe', type: 'expense' as const, icon: 'HeartPulse', color: '#10B981', isDefault: true },
  { name: 'Giải trí', type: 'expense' as const, icon: 'Film', color: '#8B5CF6', isDefault: true },
  { name: 'Giáo dục', type: 'expense' as const, icon: 'GraduationCap', color: '#06B6D4', isDefault: true },
  { name: 'Chi phí khác', type: 'expense' as const, icon: 'MoreHorizontal', color: '#6B7280', isDefault: true },

  // Khoản thu
  { name: 'Lương', type: 'income' as const, icon: 'Banknote', color: '#16A34A', isDefault: true },
  { name: 'Thưởng', type: 'income' as const, icon: 'Gift', color: '#22C55E', isDefault: true },
  { name: 'Đầu tư', type: 'income' as const, icon: 'TrendingUp', color: '#0D9488', isDefault: true },
  { name: 'Phụ cấp', type: 'income' as const, icon: 'Coins', color: '#EAB308', isDefault: true },
  { name: 'Thu nhập khác', type: 'income' as const, icon: 'PlusCircle', color: '#14B8A6', isDefault: true },
]
