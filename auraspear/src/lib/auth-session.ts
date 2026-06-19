import { authService } from '@/services'
import { useAuthStore, useTenantStore } from '@/stores'
import type { MeResponse } from '@/types'
import type { QueryClient, QueryKey } from '@tanstack/react-query'

function normalizePermissions(permissions: string[]): string[] {
  return [...permissions].sort((left, right) => left.localeCompare(right))
}

function normalizeUser(user: MeResponse['user'] | null | undefined): string {
  if (!user) {
    return ''
  }

  return JSON.stringify({
    sub: user.sub,
    email: user.email,
    tenantId: user.tenantId,
    tenantSlug: user.tenantSlug,
    role: user.role,
  })
}

function isAuthMeQuery(queryKey: QueryKey, tenantId: string): boolean {
  return queryKey[0] === 'auth' && queryKey[1] === 'me' && queryKey[2] === tenantId
}

export function getEffectiveTenantIdSnapshot(): string {
  const tenantId = useTenantStore.getState().currentTenantId.trim()
  if (tenantId.length > 0) {
    return tenantId
  }

  return useAuthStore.getState().user?.tenantId ?? ''
}

export function hasPermissionSnapshotChanged(
  currentPermissions: string[],
  nextPermissions: string[],
  currentUser: MeResponse['user'] | null,
  nextUser: MeResponse['user']
): boolean {
  const currentPermissionKey = JSON.stringify(normalizePermissions(currentPermissions))
  const nextPermissionKey = JSON.stringify(normalizePermissions(nextPermissions))

  return (
    currentPermissionKey !== nextPermissionKey ||
    normalizeUser(currentUser) !== normalizeUser(nextUser)
  )
}

export function applyPermissionSnapshot(snapshot: MeResponse): boolean {
  const authState = useAuthStore.getState()
  const nextPermissions = snapshot.permissions ?? []
  const changed = hasPermissionSnapshotChanged(
    authState.permissions,
    nextPermissions,
    authState.user,
    snapshot.user
  )

  authState.setPermissions(nextPermissions)
  authState.setUser(snapshot.user)

  return changed
}

export async function invalidatePermissionSensitiveQueries(
  queryClient: QueryClient,
  tenantId: string
): Promise<void> {
  await queryClient.cancelQueries({
    predicate: query => !isAuthMeQuery(query.queryKey, tenantId),
  })

  await queryClient.invalidateQueries({
    predicate: query => !isAuthMeQuery(query.queryKey, tenantId),
    refetchType: 'active',
  })
}

export async function refreshCurrentSessionPermissions(
  queryClient: QueryClient
): Promise<MeResponse | null> {
  const authState = useAuthStore.getState()
  const tenantId = getEffectiveTenantIdSnapshot()

  if (!authState.isAuthenticated || tenantId.length === 0) {
    return null
  }

  await queryClient.invalidateQueries({
    queryKey: ['auth', 'me', tenantId],
    exact: true,
    refetchType: 'none',
  })

  const snapshot = await queryClient.fetchQuery({
    queryKey: ['auth', 'me', tenantId],
    queryFn: () => authService.getMe(),
    staleTime: 0,
  })

  const changed = applyPermissionSnapshot(snapshot)

  if (changed) {
    await invalidatePermissionSensitiveQueries(queryClient, tenantId)
  }

  return snapshot
}
