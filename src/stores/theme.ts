import { create } from 'zustand'

export type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeState {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
}

export function applyTheme(theme: ThemeMode): void {
  if (typeof window === 'undefined') return
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  if (isDark) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: (typeof window !== 'undefined' ? (localStorage.getItem('monify-theme') as ThemeMode) : null) || 'system',
  setTheme: (theme) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('monify-theme', theme)
      applyTheme(theme)
    }
    set({ theme })
  },
}))

