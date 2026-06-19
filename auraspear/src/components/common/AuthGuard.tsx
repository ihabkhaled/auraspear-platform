'use client'

import { LoadingSpinner } from '@/components/common'
import { useAuthGuard } from '@/hooks'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { hydrated, isAuthenticated } = useAuthGuard()

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return children
}
