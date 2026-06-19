import { create } from 'zustand'

interface AiConnectorStoreState {
  selectedConnector: string
  setSelectedConnector: (value: string) => void
}

export const useAiConnectorStore = create<AiConnectorStoreState>(set => ({
  selectedConnector: 'default',
  setSelectedConnector: (selectedConnector) => set({ selectedConnector }),
}))
