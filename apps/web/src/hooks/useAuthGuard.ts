'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores'

const noop = () => {}
const emptySubscribe = () => noop

export function useAuthGuard() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const hydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.replace('/login')
    }
  }, [hydrated, isAuthenticated, router])

  return {
    hydrated,
    isAuthenticated,
  }
}
