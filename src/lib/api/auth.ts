import { apiClient } from './client'
import type { UserProfile } from '@shared/types'

export const authApi = {
  login: async (idToken: string): Promise<{ user: UserProfile }> => {
    return apiClient<{ user: UserProfile }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
      retryOn401: false,
    })
  },

  refresh: async (): Promise<{ user: UserProfile }> => {
    return apiClient<{ user: UserProfile }>('/api/auth/refresh', {
      method: 'POST',
      retryOn401: false,
    })
  },

  logout: async (all: boolean = false): Promise<{ message: string }> => {
    return apiClient<{ message: string }>('/api/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ all }),
      retryOn401: false,
    })
  },

  me: async (): Promise<{ user: UserProfile }> => {
    return apiClient<{ user: UserProfile }>('/api/auth/me', {
      method: 'GET',
      retryOn401: false,
    })
  },
}
