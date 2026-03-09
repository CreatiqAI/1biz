import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { UserProfile } from '@1biz/shared'
import { api } from '@/lib/api'

interface AuthState {
  user: UserProfile | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  _hasHydrated: boolean // true once Zustand has loaded from localStorage

  setHasHydrated: (v: boolean) => void
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>
  register: (data: {
    email: string
    password: string
    fullName: string
    companyName: string
    phone?: string
  }) => Promise<void>
  logout: () => Promise<void>
  setTokens: (access: string, refresh: string) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      _hasHydrated: false,

      setHasHydrated: (v) => set({ _hasHydrated: v }),

      login: async (email, password, rememberMe) => {
        const { data } = await api.post('/auth/login', { email, password, rememberMe })
        const { user, tokens } = data.data
        localStorage.setItem('accessToken', tokens.accessToken)
        localStorage.setItem('refreshToken', tokens.refreshToken)
        set({
          user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          isAuthenticated: true,
        })
      },

      register: async (formData) => {
        const { data } = await api.post('/auth/register', formData)
        const { user, tokens } = data.data
        localStorage.setItem('accessToken', tokens.accessToken)
        localStorage.setItem('refreshToken', tokens.refreshToken)
        set({
          user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          isAuthenticated: true,
        })
      },

      logout: async () => {
        const { refreshToken } = get()
        if (refreshToken) {
          await api.post('/auth/logout', { refreshToken }).catch(() => {})
        }
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false })
      },

      setTokens: (access, refresh) => {
        localStorage.setItem('accessToken', access)
        localStorage.setItem('refreshToken', refresh)
        set({ accessToken: access, refreshToken: refresh })
      },
    }),
    {
      name: '1biz-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      // Called once localStorage has been loaded into the store
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    },
  ),
)
