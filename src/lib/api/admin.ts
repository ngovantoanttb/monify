import { apiClient } from './client'
import { database } from '@/lib/firebase/client'
import { ref, get, set, update, remove, push } from 'firebase/database'
import type { UserProfile, UserRole, UserStatus, SystemConfig, Category } from '@shared/types'
import { DEFAULT_BUDGET_WARNING_THRESHOLD } from '@shared/constants'

export interface AdminUsersResponse {
  users: UserProfile[]
  total: number
  page: number
  size: number
  totalPages: number
}

export interface AdminStatsResponse {
  stats: {
    totalUsers: number
    activeUsers: number
    lockedUsers: number
    adminUsers: number
    memberUsers: number
    activeSessions: number
    totalTransactionsCount: number
    totalAccountsCount: number
  }
}

export const adminApi = {
  /**
   * Lấy danh sách thành viên có phân trang và tìm kiếm
   */
  async getUsers(params?: {
    page?: number
    size?: number
    search?: string
    role?: string
    status?: string
  }): Promise<AdminUsersResponse> {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', params.page.toString())
    if (params?.size) query.set('size', params.size.toString())
    if (params?.search) query.set('search', params.search)
    if (params?.role && params.role !== 'all') query.set('role', params.role)
    if (params?.status && params.status !== 'all') query.set('status', params.status)

    const queryString = query.toString()
    const url = `/api/admin/users${queryString ? `?${queryString}` : ''}`
    return apiClient.get<AdminUsersResponse>(url)
  },

  /**
   * Khóa hoặc mở khóa tài khoản thành viên
   */
  async updateUserStatus(uid: string, status: UserStatus): Promise<{ success: boolean; status: UserStatus }> {
    return apiClient.patch<{ success: boolean; status: UserStatus }>(`/api/admin/users/${uid}/status`, {
      status,
    })
  },

  /**
   * Thay đổi vai trò thành viên (admin / member)
   */
  async updateUserRole(uid: string, role: UserRole): Promise<{ success: boolean; role: UserRole }> {
    return apiClient.patch<{ success: boolean; role: UserRole }>(`/api/admin/users/${uid}/role`, {
      role,
    })
  },

  /**
   * Lấy số liệu thống kê tổng hợp (chỉ số lượng đếm, không có số tiền người dùng)
   */
  async getStats(): Promise<AdminStatsResponse> {
    return apiClient.get<AdminStatsResponse>('/api/admin/stats')
  },

  /**
   * Đọc danh sách danh mục mặc định của hệ thống
   */
  async getDefaultCategories(): Promise<Category[]> {
    const snap = await get(ref(database, 'defaultCategories'))
    if (!snap.exists()) return []

    const list: Category[] = []
    snap.forEach((child) => {
      const val = child.val()
      list.push({
        id: child.key!,
        name: val.name,
        type: val.type,
        icon: val.icon || 'Tags',
        color: val.color || '#0D9488',
        isDefault: true,
        createdAt: val.createdAt || 0,
        updatedAt: val.updatedAt || 0,
      })
    })
    return list
  },

  /**
   * Thêm danh mục mặc định mới
   */
  async createDefaultCategory(data: { name: string; type: 'income' | 'expense'; icon: string; color: string }): Promise<void> {
    const defaultRef = push(ref(database, 'defaultCategories'))
    const now = Date.now()
    await set(defaultRef, {
      ...data,
      isDefault: true,
      createdAt: now,
      updatedAt: now,
    })
  },

  /**
   * Sửa danh mục mặc định
   */
  async updateDefaultCategory(id: string, data: { name: string; type: 'income' | 'expense'; icon: string; color: string }): Promise<void> {
    const defaultRef = ref(database, `defaultCategories/${id}`)
    await update(defaultRef, {
      ...data,
      updatedAt: Date.now(),
    })
  },

  /**
   * Xóa danh mục mặc định
   */
  async deleteDefaultCategory(id: string): Promise<void> {
    await remove(ref(database, `defaultCategories/${id}`))
  },

  /**
   * Đọc cấu hình hệ thống
   */
  async getSystemConfig(): Promise<SystemConfig> {
    const snap = await get(ref(database, 'systemConfig/app'))
    if (!snap.exists()) {
      return {
        budgetWarningThreshold: DEFAULT_BUDGET_WARNING_THRESHOLD,
        updatedAt: Date.now(),
      }
    }
    const val = snap.val()
    return {
      budgetWarningThreshold: val.budgetWarningThreshold ?? DEFAULT_BUDGET_WARNING_THRESHOLD,
      updatedAt: val.updatedAt || Date.now(),
    }
  },

  /**
   * Cập nhật cấu hình hệ thống
   */
  async updateSystemConfig(config: { budgetWarningThreshold: number }): Promise<void> {
    const configRef = ref(database, 'systemConfig/app')
    await update(configRef, {
      budgetWarningThreshold: config.budgetWarningThreshold,
      updatedAt: Date.now(),
    })
  },
}

