'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Permission } from '@/enums'
import { PREFERENCES_BASE_KEY } from '@/lib/constants/settings'
import { requirePermission } from '@/lib/permissions'
import { settingsService } from '@/services'
import { useAuthStore } from '@/stores'
import type { UserPreferences } from '@/types'

export function usePreferences() {
  const { user } = useAuthStore()
  const queryKey = [PREFERENCES_BASE_KEY, user?.sub ?? ''] as const

  return useQuery({
    queryKey,
    queryFn: () => settingsService.getPreferences(),
    enabled: Boolean(user),
  })
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const permissions = useAuthStore(s => s.permissions)
  const queryKey = [PREFERENCES_BASE_KEY, user?.sub ?? ''] as const

  return useMutation({
    mutationFn: (data: Partial<UserPreferences>) => {
      requirePermission(permissions, Permission.SETTINGS_UPDATE)
      return settingsService.updatePreferences(data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey })
    },
  })
}
