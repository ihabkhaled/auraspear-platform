'use client'

import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Toast } from '@/components/common'
import { Permission } from '@/enums'
import { hasPermission } from '@/lib/permissions'
import { useAuthStore } from '@/stores'
import type {
  CloudAccount,
  CreateCloudAccountFormValues,
  EditCloudAccountFormValues,
} from '@/types'
import {
  useCreateCloudAccount,
  useUpdateCloudAccount,
  useDeleteCloudAccount,
} from './useCloudSecurity'

export function useCloudSecurityPageCrud(dialogs: {
  setCreateOpen: (open: boolean) => void
  setEditOpen: (open: boolean) => void
  selectedAccount: CloudAccount | null
  setSelectedAccount: (account: CloudAccount | null) => void
}) {
  const t = useTranslations('cloudSecurity')
  const permissions = useAuthStore(s => s.permissions)

  const canCreate = hasPermission(permissions, Permission.CLOUD_SECURITY_CREATE)
  const canEdit = hasPermission(permissions, Permission.CLOUD_SECURITY_UPDATE)
  const canDelete = hasPermission(permissions, Permission.CLOUD_SECURITY_DELETE)

  const createMutation = useCreateCloudAccount()
  const updateMutation = useUpdateCloudAccount()
  const deleteMutation = useDeleteCloudAccount()

  const handleCreate = useCallback(
    (formData: CreateCloudAccountFormValues) => {
      createMutation.mutate(formData as unknown as Record<string, unknown>, {
        onSuccess: () => {
          Toast.success(t('createSuccess'))
          dialogs.setCreateOpen(false)
        },
        onError: () => {
          Toast.error(t('createError'))
        },
      })
    },
    [createMutation, t, dialogs]
  )

  const handleEdit = useCallback(
    (formData: EditCloudAccountFormValues) => {
      if (!dialogs.selectedAccount) {
        return
      }
      updateMutation.mutate(
        { id: dialogs.selectedAccount.id, data: formData as unknown as Record<string, unknown> },
        {
          onSuccess: () => {
            Toast.success(t('editSuccess'))
            dialogs.setEditOpen(false)
            dialogs.setSelectedAccount(null)
          },
          onError: () => {
            Toast.error(t('editError'))
          },
        }
      )
    },
    [updateMutation, dialogs, t]
  )

  const handleDelete = useCallback(
    (id: string) => {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          Toast.success(t('deleteSuccess'))
        },
        onError: () => {
          Toast.error(t('deleteError'))
        },
      })
    },
    [deleteMutation, t]
  )

  return {
    handleCreate,
    handleEdit,
    handleDelete,
    createLoading: createMutation.isPending,
    editLoading: updateMutation.isPending,
    deleteLoading: deleteMutation.isPending,
    canCreate,
    canEdit,
    canDelete,
  }
}
