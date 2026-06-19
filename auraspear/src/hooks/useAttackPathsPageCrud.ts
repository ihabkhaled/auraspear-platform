'use client'

import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Toast } from '@/components/common'
import { getErrorKey } from '@/lib/api-error'
import type {
  AttackPath,
  AttackPathsPageDialogsReturn,
  CreateAttackPathFormValues,
  EditAttackPathFormValues,
} from '@/types'
import { useAttackPathDeleteDialog } from './useAttackPathDeleteDialog'
import { useCreateAttackPath, useUpdateAttackPath, useDeleteAttackPath } from './useAttackPaths'

export function useAttackPathsPageCrud(dialogs: AttackPathsPageDialogsReturn) {
  const t = useTranslations('attackPath')
  const tError = useTranslations('errors')

  const createMutation = useCreateAttackPath()
  const updateMutation = useUpdateAttackPath()
  const deleteMutation = useDeleteAttackPath()
  const { confirmDelete } = useAttackPathDeleteDialog()

  const handleCreate = useCallback(
    (formData: CreateAttackPathFormValues) => {
      const payload: Record<string, unknown> = {
        title: formData.title,
        description: formData.description,
        severity: formData.severity,
        stages: formData.stages,
        affectedAssets: formData.affectedAssets,
      }

      createMutation.mutate(payload, {
        onSuccess: () => {
          Toast.success(t('createSuccess'))
          dialogs.setCreateDialogOpen(false)
        },
        onError: (error: unknown) => {
          Toast.error(tError(getErrorKey(error)))
        },
      })
    },
    [createMutation, t, tError, dialogs]
  )

  const handleEdit = useCallback(
    (formData: EditAttackPathFormValues) => {
      if (!dialogs.editingPath) {
        return
      }

      const payload: Record<string, unknown> = {
        title: formData.title,
        description: formData.description,
        severity: formData.severity,
        status: formData.status,
        stages: formData.stages,
        affectedAssets: formData.affectedAssets,
      }

      updateMutation.mutate(
        { id: dialogs.editingPath.id, data: payload },
        {
          onSuccess: () => {
            Toast.success(t('updateSuccess'))
            dialogs.setEditDialogOpen(false)
            dialogs.setEditingPath(null)
          },
          onError: (error: unknown) => {
            Toast.error(tError(getErrorKey(error)))
          },
        }
      )
    },
    [dialogs, updateMutation, t, tError]
  )

  const handleDelete = useCallback(
    async (path: AttackPath) => {
      const confirmed = await confirmDelete(path.title)
      if (!confirmed) {
        return
      }

      deleteMutation.mutate(path.id, {
        onSuccess: () => {
          Toast.success(t('deleteSuccess'))
          if (dialogs.selectedPathId === path.id) {
            dialogs.setSelectedPathId(null)
          }
        },
        onError: (error: unknown) => {
          Toast.error(tError(getErrorKey(error)))
        },
      })
    },
    [confirmDelete, deleteMutation, t, tError, dialogs]
  )

  return {
    handleCreate,
    handleEdit,
    handleDelete,
    createLoading: createMutation.isPending,
    editLoading: updateMutation.isPending,
  }
}
