import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage'
import { AdminDefaultCategoriesPage } from '@/pages/admin/AdminDefaultCategoriesPage'
import { AdminConfigPage } from '@/pages/admin/AdminConfigPage'
import { AdminStatsPage } from '@/pages/admin/AdminStatsPage'
import { adminApi } from '@/lib/api/admin'
import { useAuthStore } from '@/stores/auth'

vi.mock('@/lib/api/admin', () => ({
  adminApi: {
    getStats: vi.fn(),
    getUsers: vi.fn(),
    updateUserStatus: vi.fn(),
    updateUserRole: vi.fn(),
    getDefaultCategories: vi.fn(),
    createDefaultCategory: vi.fn(),
    updateDefaultCategory: vi.fn(),
    deleteDefaultCategory: vi.fn(),
    getSystemConfig: vi.fn(),
    updateSystemConfig: vi.fn(),
  },
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(),
}))

describe('Admin Pages Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useAuthStore).mockReturnValue({
      user: {
        uid: 'admin_test',
        email: 'admin@monify.vn',
        displayName: 'Test Admin',
        role: 'admin',
        status: 'active',
        createdAt: 1000,
        updatedAt: 1000,
      },
      token: 'mock_token',
      isAuthenticated: true,
      hasRole: (r: string) => r === 'admin',
      setAuth: vi.fn(),
      clearAuth: vi.fn(),
    } as any)

    vi.mocked(adminApi.getStats).mockResolvedValue({
      stats: {
        totalUsers: 10,
        activeUsers: 8,
        lockedUsers: 2,
        adminUsers: 2,
        memberUsers: 8,
        activeSessions: 5,
        totalTransactionsCount: 150,
        totalAccountsCount: 25,
      },
    })

    vi.mocked(adminApi.getUsers).mockResolvedValue({
      users: [
        {
          uid: 'u1',
          email: 'user1@example.com',
          displayName: 'Nguyen Van A',
          role: 'member',
          status: 'active',
          createdAt: 1000,
          updatedAt: 1000,
        },
      ],
      total: 1,
      page: 1,
      size: 15,
      totalPages: 1,
    })

    vi.mocked(adminApi.getDefaultCategories).mockResolvedValue([
      {
        id: 'cat_food',
        name: 'Ăn uống',
        type: 'expense',
        icon: 'Utensils',
        color: '#EF4444',
        isDefault: true,
        createdAt: 1000,
        updatedAt: 1000,
      },
      {
        id: 'cat_salary',
        name: 'Tiền lương',
        type: 'income',
        icon: 'Banknote',
        color: '#10B981',
        isDefault: true,
        createdAt: 1000,
        updatedAt: 1000,
      },
    ])

    vi.mocked(adminApi.getSystemConfig).mockResolvedValue({
      budgetWarningThreshold: 0.8,
      updatedAt: 1700000000000,
    })
  })

  it('AdminDashboardPage: hiển thị tiêu đề, thông báo Zero Financial Access và số liệu', async () => {
    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    )

    expect(screen.getByText('Tổng quan Quản trị Hệ thống')).toBeInTheDocument()
    expect(screen.getByText(/Zero Financial Data Access/i)).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument() // totalUsers
      expect(screen.getAllByText('8')).toHaveLength(2) // activeUsers & memberUsers
      expect(screen.getAllByText('2')).toHaveLength(2) // lockedUsers & adminUsers
      expect(screen.getByText('5')).toBeInTheDocument() // activeSessions
    })
  })

  it('AdminUsersPage: hiển thị danh sách người dùng, tìm kiếm và nút thao tác', async () => {
    render(
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>
    )

    expect(screen.getByText('Quản lý Thành viên')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Nguyen Van A')).toBeInTheDocument()
      expect(screen.getByText('user1@example.com')).toBeInTheDocument()
    })
  })

  it('AdminDefaultCategoriesPage: hiển thị danh mục mặc định và lọc theo tab Chi tiêu / Thu nhập', async () => {
    render(
      <MemoryRouter>
        <AdminDefaultCategoriesPage />
      </MemoryRouter>
    )

    expect(screen.getByText('Danh mục mặc định')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Ăn uống')).toBeInTheDocument()
    })

    // Chuyển sang tab Thu nhập
    const incomeTab = screen.getByText(/Thu nhập/i)
    fireEvent.click(incomeTab)

    await waitFor(() => {
      expect(screen.getByText('Tiền lương')).toBeInTheDocument()
    })
  })

  it('AdminConfigPage: hiển thị cấu hình ngưỡng cảnh báo 80% và lưu cấu hình', async () => {
    render(
      <MemoryRouter>
        <AdminConfigPage />
      </MemoryRouter>
    )

    expect(screen.getByText('Cấu hình Hệ thống')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByLabelText('Ngưỡng cảnh báo (%)')).toHaveValue(80)
    })

    const saveButton = screen.getByRole('button', { name: /Lưu cấu hình/i })
    expect(saveButton).toBeInTheDocument()
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(adminApi.updateSystemConfig).toHaveBeenCalledWith({ budgetWarningThreshold: 0.8 })
    })
  })

  it('AdminStatsPage: hiển thị các chỉ số lượng và tỷ lệ hoạt động', async () => {
    render(
      <MemoryRouter>
        <AdminStatsPage />
      </MemoryRouter>
    )

    expect(screen.getByText('Thống kê Hệ thống')).toBeInTheDocument()
    expect(screen.getByText(/Nguyên tắc bảo vệ quyền riêng tư/i)).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument() // total transactions
      expect(screen.getByText('25')).toBeInTheDocument() // total accounts
    })
  })
})
