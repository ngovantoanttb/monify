import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import type { UserRole } from '@shared/types'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  requiredRole?: UserRole
}

export function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
