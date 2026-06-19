'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Permission } from '@/enums'
import { PROFILE_KEY } from '@/lib/constants/settings'
import { requirePermission } from '@/lib/permissions'
import { profileService } from '@/services'
import { useAuthStore } from '@/stores'
import type { ChangePasswordInput, UpdateProfileInput } from '@/types'

export function useProfile() {
  return useQuery({
    queryKey: PROFILE_KEY,
    queryFn: () => profileService.getProfile(),
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)

  return useMutation({
    mutationFn: (data: UpdateProfileInput) => {
      requirePermission(permissions, Permission.PROFILE_UPDATE)
      return profileService.updateProfile(data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PROFILE_KEY })
    },
  })
}

export function useChangePassword() {
  const permissions = useAuthStore(s => s.permissions)
  return useMutation({
    mutationFn: (data: ChangePasswordInput) => {
      requirePermission(permissions, Permission.PROFILE_UPDATE)
      return profileService.changePassword(data)
    },
  })
}
