import { create } from 'zustand'
import type { HuntStoreState } from '@/types'

export const useHuntStore = create<HuntStoreState>(set => ({
  messages: [],
  huntStatus: null,
  huntId: null,
  addMessage: message => set(state => ({ messages: [...state.messages, message] })),
  setHuntStatus: huntStatus => set({ huntStatus }),
  setHuntId: huntId => set({ huntId }),
  resetHuntState: () => set({ huntStatus: null, huntId: null }),
  clearSession: () => set({ messages: [], huntStatus: null, huntId: null }),
}))
