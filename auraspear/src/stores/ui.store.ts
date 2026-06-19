import { create } from 'zustand'
import type { UIStoreState } from '@/types'

export const useUIStore = create<UIStoreState>(set => ({
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  commandPaletteOpen: false,
  toggleSidebar: () => set(state => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setMobileSidebarOpen: mobileSidebarOpen => set({ mobileSidebarOpen }),
  toggleMobileSidebar: () => set(state => ({ mobileSidebarOpen: !state.mobileSidebarOpen })),
  setCommandPaletteOpen: commandPaletteOpen => set({ commandPaletteOpen }),
}))
