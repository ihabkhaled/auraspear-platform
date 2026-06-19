import { useState, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Permission } from '@/enums'
import { hasPermission } from '@/lib/permissions'
import {
  canResetRoleSettings,
  filterRoleSettingsPermissionGroups,
  isRoleSettingsToggleDisabled,
  canToggleRoleSettingsPermission,
  canAssignRoleSettingsPermission,
} from '@/lib/role-settings'
import { buildPermissionGroups, buildPermissionLabelMap } from '@/lib/role-settings.utils'
import { roleSettingsService } from '@/services'
import { useAuthStore } from '@/stores'

export function useRoleSettingsPageFilters() {
  const t = useTranslations()
  const permissions = useAuthStore(s => s.permissions)
  const actorRole = useAuthStore(s => s.user?.role)

  const canEditRoles = hasPermission(permissions, Permission.ROLE_SETTINGS_UPDATE)
  const canResetDefaults = canResetRoleSettings(actorRole, canEditRoles)

  const [localMatrix, setLocalMatrix] = useState<Record<string, string[]>>({})
  const [isDirty, setIsDirty] = useState(false)

  const { data: definitions, isLoading: isLoadingDefs } = useQuery({
    queryKey: ['role-settings', 'definitions'],
    queryFn: () => roleSettingsService.getPermissionDefinitions(),
    select: response => response.data,
  })

  const {
    data: matrixResponse,
    isLoading: isLoadingMatrix,
    isFetching,
  } = useQuery({
    queryKey: ['role-settings'],
    queryFn: () => roleSettingsService.getPermissionMatrix(),
    select: response => response.data,
  })

  const data = matrixResponse?.matrix
  const configurableRoles: string[] = useMemo(
    () => matrixResponse?.configurableRoles ?? [],
    [matrixResponse?.configurableRoles]
  )

  const permissionGroups = useMemo(
    () => filterRoleSettingsPermissionGroups(buildPermissionGroups(definitions), actorRole),
    [actorRole, definitions]
  )

  const permissionLabelMap = useMemo(() => buildPermissionLabelMap(definitions), [definitions])

  const serverMatrix = data
  if (serverMatrix && !isDirty) {
    const needsUpdate = configurableRoles.some((role: string) => {
      const local = Reflect.get(localMatrix, role) as string[] | undefined
      const server = Reflect.get(serverMatrix, role) as string[] | undefined
      if (!local && server) {
        return true
      }
      if (!local || !server) {
        return false
      }
      if (local.length !== server.length) {
        return true
      }
      return local.some((p, i) => p !== server.at(i))
    })
    if (needsUpdate) {
      setLocalMatrix({ ...serverMatrix })
    }
  }

  const handleToggle = useCallback(
    (role: string, permission: string, checked: boolean) => {
      if (
        !canToggleRoleSettingsPermission(actorRole, permission) ||
        !canAssignRoleSettingsPermission(role, permission)
      ) {
        return
      }

      setLocalMatrix(prev => {
        const existing = Reflect.get(prev, role) as string[] | undefined
        const rolePermissions = [...(existing ?? [])]

        if (checked) {
          if (!rolePermissions.includes(permission)) {
            rolePermissions.push(permission)
          }
        } else {
          const idx = rolePermissions.indexOf(permission)
          if (idx !== -1) {
            rolePermissions.splice(idx, 1)
          }
        }

        return { ...prev, [role]: rolePermissions }
      })
      setIsDirty(true)
    },
    [actorRole]
  )

  const isToggleDisabled = useCallback(
    (role: string, permission: string): boolean =>
      isRoleSettingsToggleDisabled(actorRole, role, permission),
    [actorRole]
  )

  const isChecked = useCallback(
    (role: string, permission: string): boolean => {
      const rolePermissions = Reflect.get(localMatrix, role) as string[] | undefined
      if (!rolePermissions) {
        return false
      }
      return rolePermissions.includes(permission)
    },
    [localMatrix]
  )

  return {
    t,
    permissions,
    isLoading: isLoadingDefs || isLoadingMatrix,
    isFetching,
    isDirty,
    localMatrix,
    setLocalMatrix,
    setIsDirty,
    permissionGroups,
    permissionLabelMap,
    configurableRoles,
    handleToggle,
    isChecked,
    isToggleDisabled,
    canEditRoles,
    canResetDefaults,
  }
}
