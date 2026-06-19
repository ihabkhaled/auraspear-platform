import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createPersistStorage } from '@/lib/persist-storage'
import type { AuthState } from '@/types'

export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      accessToken: '',
      user: null,
      isAuthenticated: false,
      permissions: [],
      impersonator: null,

      setTokens: accessToken => set({ accessToken, isAuthenticated: Boolean(accessToken) }),

      setUser: user => set({ user }),

      setPermissions: permissions => set({ permissions }),

      startImpersonation: impersonator => set({ impersonator }),

      endImpersonation: () => set({ impersonator: null }),

      logout: () =>
        set({
          accessToken: '',
          user: null,
          isAuthenticated: false,
          permissions: [],
          impersonator: null,
        }),
    }),
    {
      name: 'auth-storage',
      storage: createPersistStorage(),
    }
  )
)
