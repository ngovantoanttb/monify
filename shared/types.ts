// Shared Types between Client and Server

export type UserRole = 'admin' | 'member'
export type UserStatus = 'active' | 'locked'

export interface UserProfile {
  uid: string
  email: string
  displayName: string
  photoURL?: string | null
  role: UserRole
  status: UserStatus
  providerId?: string
  createdAt: number
  updatedAt: number
}

export type AccountType = 'cash' | 'bank' | 'ewallet' | 'savings'

export interface Account {
  id: string
  name: string
  type: AccountType
  openingBalance: number
  note?: string
  createdAt: number
  updatedAt: number
}

export type CategoryType = 'income' | 'expense'

export interface Category {
  id: string
  name: string
  type: CategoryType
  icon: string
  color: string
  isDefault: boolean
  createdAt: number
  updatedAt: number
}

export type TransactionType = 'income' | 'expense' | 'transfer'

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  date: number
  accountId: string
  categoryId?: string
  toAccountId?: string
  note?: string
  createdAt: number
  updatedAt: number
}

export interface Budget {
  id: string // `${month}_${categoryId}`
  month: string // yyyy-MM
  categoryId: string
  amount: number
  createdAt: number
  updatedAt: number
}

export interface Goal {
  id: string
  name: string
  targetAmount: number
  savedAmount: number
  deadline?: number
  note?: string
  createdAt: number
  updatedAt: number
}

export type DebtKind = 'borrowed' | 'lent'

export type DebtHistoryType =
  | 'initial_borrow'
  | 'initial_lend'
  | 'repay'
  | 'collect'
  | 'settle_repay'
  | 'settle_collect'
  | 'adjustment'

export interface Debt {
  id: string
  kind: DebtKind
  personName: string
  content: string
  principal: number
  paidAmount: number
  dueDate?: number
  note?: string
  createdAt: number
  updatedAt: number
}

export interface DebtHistory {
  id: string
  debtId: string
  transactionId?: string
  idempotencyKey?: string
  type: DebtHistoryType
  hasCashFlow: boolean
  amount: number
  accountId?: string
  accountName?: string
  accountBalanceBefore?: number
  accountBalanceAfter?: number
  debtRemainingBefore: number
  debtRemainingAfter: number
  createdAt: number
  actorUid: string
  note?: string
}

export interface SystemConfig {
  budgetWarningThreshold: number // 0.5 to 1.0
  updatedAt: number
}

export interface AdminAuditLog {
  id: string
  actorUid: string
  action: string
  targetUid: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  createdAt: number
}

export interface JWTPayloadCustom {
  iss: string
  aud: string
  sub: string // uid
  sid: string // session id
  role: UserRole
  iat?: number
  exp?: number
}
