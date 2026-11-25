import { createBrowserRouter } from 'react-router-dom'
import { MainLayout } from '@/components/layout/MainLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LandingPage } from '@/pages/LandingPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { DashboardPage } from '@/pages/member/DashboardPage'
import { AccountsPage } from '@/pages/member/AccountsPage'
import { CategoriesPage } from '@/pages/member/CategoriesPage'
import { TransactionsPage } from '@/pages/member/TransactionsPage'
import { BudgetsPage } from '@/pages/member/BudgetsPage'
import { GoalsPage } from '@/pages/member/GoalsPage'
import { DebtsPage } from '@/pages/member/DebtsPage'
import { DebtDetailPage } from '@/pages/member/DebtDetailPage'
import { ReportsPage } from '@/pages/member/ReportsPage'
import { SettingsPage } from '@/pages/member/SettingsPage'
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage'
import { AdminDefaultCategoriesPage } from '@/pages/admin/AdminDefaultCategoriesPage'
import { AdminConfigPage } from '@/pages/admin/AdminConfigPage'
import { AdminStatsPage } from '@/pages/admin/AdminStatsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ErrorPage } from '@/pages/ErrorPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
    errorElement: <ErrorPage />,
  },
  {
    path: '/intro',
    element: <LandingPage />,
    errorElement: <ErrorPage />,
  },
  {
    path: '/login',
    element: <LoginPage initialMode="login" />,
    errorElement: <ErrorPage />,
  },
  {
    path: '/register',
    element: <LoginPage initialMode="register" />,
    errorElement: <ErrorPage />,
  },
  {
    element: <ProtectedRoute />,
    errorElement: <ErrorPage />,
    children: [
      {
        element: <MainLayout />,
        children: [
          {
            path: 'dashboard',
            element: <DashboardPage />,
          },
          {
            path: 'transactions',
            element: <TransactionsPage />,
          },
          {
            path: 'budgets',
            element: <BudgetsPage />,
          },
          {
            path: 'accounts',
            element: <AccountsPage />,
          },
          {
            path: 'categories',
            element: <CategoriesPage />,
          },
          {
            path: 'goals',
            element: <GoalsPage />,
          },
          {
            path: 'debts',
            element: <DebtsPage />,
          },
          {
            path: 'debts/:debtId',
            element: <DebtDetailPage />,
          },
          {
            path: 'reports',
            element: <ReportsPage />,
          },
          {
            path: 'settings',
            element: <SettingsPage />,
          },
          // Route Quản trị (Admin)
          {
            element: <ProtectedRoute requiredRole="admin" />,
            children: [
              {
                path: 'admin',
                element: <AdminDashboardPage />,
              },
              {
                path: 'admin/users',
                element: <AdminUsersPage />,
              },
              {
                path: 'admin/default-categories',
                element: <AdminDefaultCategoriesPage />,
              },
              {
                path: 'admin/config',
                element: <AdminConfigPage />,
              },
              {
                path: 'admin/stats',
                element: <AdminStatsPage />,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
], {
  future: {
    v7_relativeSplatPath: true,
  },
})
