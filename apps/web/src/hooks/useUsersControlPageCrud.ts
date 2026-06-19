'use client'

import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Toast, SweetAlertDialog, SweetAlertIcon } from '@/components/common'
import { Permission } from '@/enums'
import { hasPermission } from '@/lib/permissions'
import { buildErrorToastHandler } from '@/lib/toast.utils'
import { canManageUsersControlTarget } from '@/lib/users-control'
import { useAuthStore } from '@/stores'
import type { UsersControlUser } from '@/types'
import {
  useForceLogoutAllControlledUsers,
  useForceLogoutControlledSession,
  useForceLogoutControlledUser,
} from './useUsersControl'

export function useUsersControlPageCrud(selectedUser: UsersControlUser | null, scopeLabel: string) {
  const t = useTranslations('admin.usersControl')
  const tErrors = useTranslations('errors')
  const user = useAuthStore(s => s.user)
  const permissions = useAuthStore(s => s.permissions)

  const canForceLogoutUser = hasPermission(permissions, Permission.USERS_CONTROL_FORCE_LOGOUT)
  const canForceLogoutAll = hasPermission(permissions, Permission.USERS_CONTROL_FORCE_LOGOUT_ALL)

  const forceLogoutUserMutation = useForceLogoutControlledUser()
  const forceLogoutSessionMutation = useForceLogoutControlledSession()
  const forceLogoutAllMutation = useForceLogoutAllControlledUsers()

  const canManageTargetUser = useCallback(
    (targetUser: UsersControlUser): boolean => canManageUsersControlTarget(user?.role, targetUser),
    [user?.role]
  )

  const canManageSelectedUser = selectedUser === null ? false : canManageTargetUser(selectedUser)

  const handleForceLogoutUser = useCallback(
    async (targetUser: UsersControlUser) => {
      const confirmed = await SweetAlertDialog.show({
        title: t('confirmForceLogoutUserTitle'),
        text: t('confirmForceLogoutUserText', { name: targetUser.email }),
        icon: SweetAlertIcon.WARNING,
      })

      if (confirmed) {
        forceLogoutUserMutation.mutate(targetUser.id, {
          onSuccess: response => {
            Toast.success(
              t('forceLogoutUserSuccess', {
                count: String(response.data.revokedSessions),
              })
            )
          },
          onError: buildErrorToastHandler(tErrors),
        })
      }
    },
    [forceLogoutUserMutation, t, tErrors]
  )

  const handleForceLogoutAll = useCallback(async () => {
    const confirmed = await SweetAlertDialog.show({
      title: t('confirmForceLogoutAllTitle'),
      text: t('confirmForceLogoutAllText', { scope: scopeLabel }),
      icon: SweetAlertIcon.WARNING,
    })

    if (confirmed) {
      forceLogoutAllMutation.mutate(undefined, {
        onSuccess: response => {
          Toast.success(
            t('forceLogoutAllSuccess', {
              count: String(response.data.revokedSessions),
            })
          )
        },
        onError: buildErrorToastHandler(tErrors),
      })
    }
  }, [forceLogoutAllMutation, scopeLabel, t, tErrors])

  const handleTerminateSession = useCallback(
    async (sessionId: string) => {
      if (!selectedUser) {
        return
      }

      const confirmed = await SweetAlertDialog.show({
        title: t('confirmTerminateSessionTitle'),
        text: t('confirmTerminateSessionText', { name: selectedUser.email }),
        icon: SweetAlertIcon.WARNING,
      })

      if (confirmed) {
        forceLogoutSessionMutation.mutate(
          { userId: selectedUser.id, sessionId },
          {
            onSuccess: response => {
              Toast.success(
                t('terminateSessionSuccess', {
                  count: String(response.data.revokedSessions),
                })
              )
            },
            onError: buildErrorToastHandler(tErrors),
          }
        )
      }
    },
    [forceLogoutSessionMutation, selectedUser, t, tErrors]
  )

  return {
    handleForceLogoutUser,
    handleForceLogoutAll,
    handleTerminateSession,
    canManageTargetUser,
    canManageSelectedUser,
    canForceLogoutUser,
    canForceLogoutAll,
    isForceLogoutUserPending: forceLogoutUserMutation.isPending,
    terminatingSessionId: forceLogoutSessionMutation.variables?.sessionId ?? '',
    isForceLogoutAllPending: forceLogoutAllMutation.isPending,
  }
}
