'use client'

import { useRoleGuard } from '@/hooks'
import type { RoleGuardProps } from '@/types'

export function RoleGuard({ children }: RoleGuardProps) {
  const { userRole, allowed } = useRoleGuard()

  if (!userRole || !allowed) {
    return null
  }

  return children
}
