'use client'

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Permission } from '@/enums'
import { POLLING_INTERVAL } from '@/lib/constants'
import { USERS_CONTROL_QUERY_KEY } from '@/lib/constants/users-control'
import { requirePermission } from '@/lib/permissions'
import { usersControlService } from '@/services'
import { useAuthStore, useTenantStore } from '@/stores'
import type { UsersControlListParams, UsersControlSessionListParams } from '@/types'

export function useUsersControlSummary(enabled = true) {
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useQuery({
    queryKey: [...USERS_CONTROL_QUERY_KEY, tenantId, 'summary'],
    queryFn: () => usersControlService.getSummary(),
    enabled,
    refetchInterval: POLLING_INTERVAL,
  })
}

export function useControlledUsers(params?: UsersControlListParams, enabled = true) {
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useQuery({
    queryKey: [...USERS_CONTROL_QUERY_KEY, tenantId, 'users', params],
    queryFn: () => usersControlService.getUsers(params),
    enabled,
    placeholderData: keepPreviousData,
    refetchInterval: POLLING_INTERVAL,
  })
}

export function useUsersControlUsers(params?: UsersControlListParams, enabled = true) {
  return useControlledUsers(params, enabled)
}

export function useControlledUserSessions(
  userId: string,
  params?: UsersControlSessionListParams,
  enabled = true
) {
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useQuery({
    queryKey: [...USERS_CONTROL_QUERY_KEY, tenantId, 'users', userId, 'sessions', params],
    queryFn: () => usersControlService.getUserSessions(userId, params),
    enabled: enabled && userId.length > 0,
    placeholderData: keepPreviousData,
    refetchInterval: POLLING_INTERVAL,
  })
}

export function useUsersControlSessions(
  userId: string,
  params?: UsersControlSessionListParams,
  enabled = true
) {
  return useControlledUserSessions(userId, params, enabled)
}

export function useForceLogoutControlledUser() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useMutation({
    mutationFn: (userId: string) => {
      requirePermission(permissions, Permission.USERS_CONTROL_FORCE_LOGOUT)
      return usersControlService.forceLogoutUser(userId)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...USERS_CONTROL_QUERY_KEY, tenantId] })
    },
  })
}

export function useForceLogoutControlledSession() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useMutation({
    mutationFn: ({ userId, sessionId }: { userId: string; sessionId: string }) => {
      requirePermission(permissions, Permission.USERS_CONTROL_FORCE_LOGOUT)
      return usersControlService.terminateSession(userId, sessionId)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...USERS_CONTROL_QUERY_KEY, tenantId] })
    },
  })
}

export function useForceLogoutAllControlledUsers() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useMutation({
    mutationFn: () => {
      requirePermission(permissions, Permission.USERS_CONTROL_FORCE_LOGOUT_ALL)
      return usersControlService.forceLogoutAll()
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...USERS_CONTROL_QUERY_KEY, tenantId] })
    },
  })
}
