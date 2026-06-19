import { create } from 'zustand'
import type { NotificationUIStoreState } from '@/types'

export const useNotificationStore = create<NotificationUIStoreState>(set => ({
  panelOpen: false,
  setPanelOpen: (panelOpen: boolean) => set({ panelOpen }),
}))
