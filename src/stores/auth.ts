import { create } from 'zustand'
import type { UserProfile, UserRole } from '@shared/types'

interface AuthState {
  user: UserProfile | null
  isAuthenticated: boolean
  isLoading: boolean
  setUser: (user: UserProfile | null) => void
  setLoading: (isLoading: boolean) => void
  hasRole: (role: UserRole) => boolean
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    }),
  setLoading: (isLoading) => set({ isLoading }),
  hasRole: (role) => get().user?.role === role,
  clearAuth: () =>
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    }),
}))
