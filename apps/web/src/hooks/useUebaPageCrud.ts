'use client'

import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Toast } from '@/components/common'
import { getErrorKey } from '@/lib/api-error'
import type {
  CreateUebaEntityFormValues,
  EditUebaEntityFormValues,
  UebaEntity,
  UebaPageDialogsReturn,
} from '@/types'
import { useCreateUebaEntity, useUpdateUebaEntity, useDeleteUebaEntity } from './useUeba'

export function useUebaPageCrud(dialogs: UebaPageDialogsReturn) {
  const t = useTranslations('ueba')
  const tError = useTranslations('errors')

  const createEntity = useCreateUebaEntity()
  const updateEntity = useUpdateUebaEntity()
  const deleteEntity = useDeleteUebaEntity()

  const handleCreateSubmit = useCallback(
    (formData: CreateUebaEntityFormValues) => {
      createEntity.mutate(formData as unknown as Record<string, unknown>, {
        onSuccess: () => {
          Toast.success(t('entityCreated'))
          dialogs.setCreateDialogOpen(false)
        },
        onError: (error: unknown) => {
          Toast.error(tError(getErrorKey(error)))
        },
      })
    },
    [createEntity, t, tError, dialogs]
  )

  const handleEditSubmit = useCallback(
    (formData: EditUebaEntityFormValues) => {
      if (!dialogs.editingEntity) {
        return
      }
      updateEntity.mutate(
        { id: dialogs.editingEntity.id, data: formData as unknown as Record<string, unknown> },
        {
          onSuccess: () => {
            Toast.success(t('entityUpdated'))
            dialogs.setEditDialogOpen(false)
            dialogs.setEditingEntity(null)
          },
          onError: (error: unknown) => {
            Toast.error(tError(getErrorKey(error)))
          },
        }
      )
    },
    [dialogs, updateEntity, t, tError]
  )

  const handleDeleteEntity = useCallback(
    (entity: UebaEntity) => {
      deleteEntity.mutate(entity.id, {
        onSuccess: () => {
          Toast.success(t('entityDeleted'))
          if (dialogs.selectedEntityId === entity.id) {
            dialogs.setSelectedEntityId(null)
          }
        },
        onError: (error: unknown) => {
          Toast.error(tError(getErrorKey(error)))
        },
      })
    },
    [deleteEntity, t, tError, dialogs]
  )

  return {
    handleCreateSubmit,
    handleEditSubmit,
    handleDeleteEntity,
    createLoading: createEntity.isPending,
    editLoading: updateEntity.isPending,
    deleteLoading: deleteEntity.isPending,
  }
}
