'use client'

import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Toast } from '@/components/common'
import { safeJsonParse } from '@/lib/utils'
import type {
  CreateSoarPlaybookFormValues,
  EditSoarPlaybookFormValues,
  SoarPageDialogsReturn,
} from '@/types'
import {
  useCreatePlaybook,
  useUpdatePlaybook,
  useDeletePlaybook,
  useExecutePlaybook,
} from './useSoar'

export function useSoarPageCrud(dialogs: SoarPageDialogsReturn) {
  const t = useTranslations('soar')

  const createMutation = useCreatePlaybook()
  const updateMutation = useUpdatePlaybook()
  const deleteMutation = useDeletePlaybook()
  const executeMutation = useExecutePlaybook()

  const handleCreate = useCallback(
    (formData: CreateSoarPlaybookFormValues) => {
      const payload: Record<string, unknown> = {
        name: formData.name,
        description: formData.description,
        triggerType: formData.triggerType,
        steps: safeJsonParse<unknown[]>(formData.steps, []),
      }
      if (formData.triggerConditions && formData.triggerConditions.trim().length > 0) {
        payload['triggerConditions'] = safeJsonParse<Record<string, unknown>>(
          formData.triggerConditions,
          {}
        )
      }
      if (formData.cronExpression.length > 0) {
        payload['cronExpression'] = formData.cronExpression
      }
      createMutation.mutate(payload, {
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
    (formData: EditSoarPlaybookFormValues) => {
      if (!dialogs.selectedPlaybook) {
        return
      }
      const payload: Record<string, unknown> = {
        name: formData.name,
        description: formData.description,
        triggerType: formData.triggerType,
        steps: safeJsonParse<unknown[]>(formData.steps, []),
      }
      if (formData.triggerConditions && formData.triggerConditions.trim().length > 0) {
        payload['triggerConditions'] = safeJsonParse<Record<string, unknown>>(
          formData.triggerConditions,
          {}
        )
      }
      if (formData.cronExpression.length > 0) {
        payload['cronExpression'] = formData.cronExpression
      }
      updateMutation.mutate(
        { id: dialogs.selectedPlaybook.id, data: payload },
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
          dialogs.setDeletePlaybookId(null)
        },
        onError: () => {
          Toast.error(t('deleteError'))
        },
      })
    },
    [deleteMutation, t, dialogs]
  )

  const handleExecute = useCallback(
    (id: string) => {
      executeMutation.mutate(id, {
        onSuccess: () => {
          Toast.success(t('executeSuccess'))
          dialogs.setRunPlaybookId(null)
        },
        onError: () => {
          Toast.error(t('executeError'))
        },
      })
    },
    [executeMutation, t, dialogs]
  )

  return {
    handleCreate,
    handleEdit,
    handleDelete,
    handleExecute,
    createLoading: createMutation.isPending,
    editLoading: updateMutation.isPending,
  }
}
