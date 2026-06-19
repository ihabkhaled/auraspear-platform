'use client'

import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Toast } from '@/components/common'
import { Permission } from '@/enums'
import { hasPermission } from '@/lib/permissions'
import { useAuthStore } from '@/stores'
import type {
  ComplianceFramework,
  CreateComplianceFrameworkFormValues,
  EditComplianceFrameworkFormValues,
} from '@/types'
import { useCreateFramework, useUpdateFramework, useDeleteFramework } from './useCompliance'

export function useCompliancePageCrud(dialogs: {
  setCreateOpen: (open: boolean) => void
  setEditOpen: (open: boolean) => void
  selectedFramework: ComplianceFramework | null
  setDeleteFrameworkId: (id: string | null) => void
}) {
  const t = useTranslations('compliance')
  const permissions = useAuthStore(s => s.permissions)

  const canCreate = hasPermission(permissions, Permission.COMPLIANCE_CREATE)
  const canEdit = hasPermission(permissions, Permission.COMPLIANCE_UPDATE)

  const createMutation = useCreateFramework()
  const updateMutation = useUpdateFramework()
  const deleteMutation = useDeleteFramework()

  const handleCreate = useCallback(
    (formData: CreateComplianceFrameworkFormValues) => {
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
    (formData: EditComplianceFrameworkFormValues) => {
      if (!dialogs.selectedFramework) {
        return
      }
      updateMutation.mutate(
        { id: dialogs.selectedFramework.id, data: formData as unknown as Record<string, unknown> },
        {
          onSuccess: () => {
            Toast.success(t('updateSuccess'))
            dialogs.setEditOpen(false)
          },
          onError: () => {
            Toast.error(t('updateError'))
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
          dialogs.setDeleteFrameworkId(null)
        },
        onError: () => {
          Toast.error(t('deleteError'))
        },
      })
    },
    [deleteMutation, t, dialogs]
  )

  return {
    handleCreate,
    handleEdit,
    handleDelete,
    createLoading: createMutation.isPending,
    editLoading: updateMutation.isPending,
    canCreate,
    canEdit,
  }
}
