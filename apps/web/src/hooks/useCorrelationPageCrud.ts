import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Toast } from '@/components/common'
import { getErrorKey } from '@/lib/api-error'
import { safeJsonParse } from '@/lib/utils'
import type {
  CorrelationCreateFormValues,
  CorrelationEditFormValues,
  CorrelationPageDialogsReturn,
} from '@/types'
import { useCreateRule, useUpdateRule, useDeleteRule } from './useCorrelation'

export function useCorrelationPageCrud(dialogs: CorrelationPageDialogsReturn) {
  const t = useTranslations('correlation')
  const tError = useTranslations('errors')

  const createMutation = useCreateRule()
  const updateMutation = useUpdateRule()
  const deleteMutation = useDeleteRule()

  const handleCreateSubmit = useCallback(
    (formData: CorrelationCreateFormValues) => {
      const payload: Record<string, unknown> = {
        title: formData.title,
        description: formData.description,
        source: formData.source,
        severity: formData.severity,
        status: formData.status,
        mitreTechniques: formData.mitreTechniques
          .split(',')
          .map(s => s.trim())
          .filter(s => s.length > 0),
        yamlContent: formData.yamlContent || null,
        conditions:
          formData.conditions.trim().length > 0
            ? safeJsonParse<Record<string, unknown>>(formData.conditions, {})
            : null,
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

  const handleEditSubmit = useCallback(
    (formData: CorrelationEditFormValues) => {
      if (!dialogs.editingRule) return

      const payload: Record<string, unknown> = {
        title: formData.title,
        description: formData.description,
        source: formData.source,
        severity: formData.severity,
        status: formData.status,
        mitreTechniques: formData.mitreTechniques
          .split(',')
          .map(s => s.trim())
          .filter(s => s.length > 0),
        yamlContent: formData.yamlContent || null,
        conditions:
          formData.conditions.trim().length > 0
            ? safeJsonParse<Record<string, unknown>>(formData.conditions, {})
            : null,
      }

      updateMutation.mutate(
        { id: dialogs.editingRule.id, data: payload },
        {
          onSuccess: () => {
            Toast.success(t('updateSuccess'))
            dialogs.setEditDialogOpen(false)
            dialogs.setEditingRule(null)
          },
          onError: (error: unknown) => {
            Toast.error(tError(getErrorKey(error)))
          },
        }
      )
    },
    [dialogs, updateMutation, t, tError]
  )

  const handleDeleteConfirm = useCallback(
    (id: string) => {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          Toast.success(t('deleteSuccess'))
          dialogs.setDeletingRule(null)
          if (dialogs.selectedRuleId === id) {
            dialogs.setSelectedRuleId(null)
            dialogs.setDetailPanelOpen(false)
          }
        },
        onError: (error: unknown) => {
          Toast.error(tError(getErrorKey(error)))
        },
      })
    },
    [deleteMutation, dialogs, t, tError]
  )

  return {
    handleCreateSubmit,
    handleEditSubmit,
    handleDeleteConfirm,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
