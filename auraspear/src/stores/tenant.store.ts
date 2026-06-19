import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createPersistStorage } from '@/lib/persist-storage'
import type { TenantStoreState } from '@/types'

export const useTenantStore = create<TenantStoreState>()(
  persist(
    set => ({
      currentTenantId: '',
      tenants: [],
      userTenants: [],
      setCurrentTenant: id => set({ currentTenantId: id }),
      setTenants: tenants => set({ tenants }),
      setUserTenants: userTenants => set({ userTenants }),
    }),
    {
      name: 'tenant-storage',
      storage: createPersistStorage(),
    }
  )
)
