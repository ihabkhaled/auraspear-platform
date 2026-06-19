import { createJSONStorage, type StateStorage } from 'zustand/middleware'

const NOOP_STORAGE: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}

function getStateStorage(): StateStorage {
  if (typeof window === 'undefined') {
    return NOOP_STORAGE
  }

  return window.localStorage
}

export function createPersistStorage() {
  return createJSONStorage(getStateStorage)
}
