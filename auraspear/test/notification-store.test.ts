import { describe, it, expect, beforeEach } from 'vitest'
import { useNotificationStore } from '@/stores/notification.store'

describe('useNotificationStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useNotificationStore.setState({ panelOpen: false })
  })

  it('should initialize with panelOpen = false', () => {
    const state = useNotificationStore.getState()
    expect(state.panelOpen).toBe(false)
  })

  it('should set panelOpen to true', () => {
    useNotificationStore.getState().setPanelOpen(true)
    expect(useNotificationStore.getState().panelOpen).toBe(true)
  })

  it('should set panelOpen to false', () => {
    useNotificationStore.setState({ panelOpen: true })
    useNotificationStore.getState().setPanelOpen(false)
    expect(useNotificationStore.getState().panelOpen).toBe(false)
  })

  it('should toggle panel open state', () => {
    const store = useNotificationStore.getState()

    store.setPanelOpen(true)
    expect(useNotificationStore.getState().panelOpen).toBe(true)

    store.setPanelOpen(false)
    expect(useNotificationStore.getState().panelOpen).toBe(false)
  })
})
