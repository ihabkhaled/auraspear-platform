import { create } from 'zustand'
import { TimeRange } from '@/enums'
import type { FilterStoreState } from '@/types'

export const useFilterStore = create<FilterStoreState>(set => ({
  severity: [],
  timeRange: TimeRange.H24,
  agents: [],
  kqlQuery: '',
  setSeverity: severity => set({ severity }),
  setTimeRange: timeRange => set({ timeRange }),
  setAgents: agents => set({ agents }),
  setKqlQuery: kqlQuery => set({ kqlQuery }),
  resetFilters: () => set({ severity: [], timeRange: TimeRange.H24, agents: [], kqlQuery: '' }),
}))
