'use client'

import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { SweetAlertDialog, SweetAlertIcon, Toast } from '@/components/common'
import { Permission } from '@/enums'
import { hasPermission } from '@/lib/permissions'
import { safeJsonParse } from '@/lib/utils'
import { useAuthStore } from '@/stores'
import type {
  CreateNormalizationFormValues,
  EditNormalizationFormValues,
  NormalizationPipeline,
} from '@/types'
import { useAiNormVerifier } from './useAiNormVerifier'
import { useCreatePipeline, useUpdatePipeline, useDeletePipeline } from './useNormalization'

export function useNormalizationPageCrud(dialogs: {
  setCreateOpen: (open: boolean) => void
  setEditOpen: (open: boolean) => void
  setSelectedPipeline: (pipeline: NormalizationPipeline | null) => void
  selectedPipeline: NormalizationPipeline | null
  setDetailOpen: (open: boolean) => void
}) {
  const t = useTranslations('normalization')
  const tCommon = useTranslations('common')
  const permissions = useAuthStore(s => s.permissions)

  const canCreate = hasPermission(permissions, Permission.NORMALIZATION_CREATE)
  const canEdit = hasPermission(permissions, Permission.NORMALIZATION_UPDATE)
  const canDelete = hasPermission(permissions, Permission.NORMALIZATION_DELETE)

  const createMutation = useCreatePipeline()
  const updateMutation = useUpdatePipeline()
  const deleteMutation = useDeletePipeline()
  const {
    handleVerify: handleAiVerify,
    isVerifying: aiVerifying,
    canVerify: canAiVerify,
  } = useAiNormVerifier()

  const handleCreate = useCallback(
    (formData: CreateNormalizationFormValues) => {
      const payload: Record<string, unknown> = {
        name: formData.name,
        sourceType: formData.sourceType,
        parserConfig: safeJsonParse(formData.parserConfig, {}),
        fieldMappings: safeJsonParse(formData.fieldMappings, {}),
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
    (formData: EditNormalizationFormValues) => {
      if (!dialogs.selectedPipeline) {
        return
      }
      const payload: Record<string, unknown> = {
        name: formData.name,
        sourceType: formData.sourceType,
        parserConfig: safeJsonParse(formData.parserConfig, {}),
        fieldMappings: safeJsonParse(formData.fieldMappings, {}),
      }
      updateMutation.mutate(
        { id: dialogs.selectedPipeline.id, data: payload },
        {
          onSuccess: () => {
            Toast.success(t('editSuccess'))
            dialogs.setEditOpen(false)
            dialogs.setSelectedPipeline(null)
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
    async (id: string, name?: string) => {
      const confirmed = await SweetAlertDialog.show({
        text: t('confirmDeletePipeline', { name: name ?? '' }),
        icon: SweetAlertIcon.WARNING,
        confirmButtonText: tCommon('delete'),
        cancelButtonText: tCommon('cancel'),
      })
      if (!confirmed) {
        return
      }
      deleteMutation.mutate(id, {
        onSuccess: () => {
          Toast.success(t('deleteSuccess'))
        },
        onError: () => {
          Toast.error(t('deleteError'))
        },
      })
    },
    [deleteMutation, t, tCommon]
  )

  const handleOpenDelete = useCallback(
    (pipeline: NormalizationPipeline) => {
      dialogs.setDetailOpen(false)
      void handleDelete(pipeline.id, pipeline.name)
    },
    [handleDelete, dialogs]
  )

  return {
    handleCreate,
    handleEdit,
    handleDelete,
    handleOpenDelete,
    createLoading: createMutation.isPending,
    editLoading: updateMutation.isPending,
    deleteLoading: deleteMutation.isPending,
    canCreate,
    canEdit,
    canDelete,
    canAiVerify,
    handleAiVerify,
    aiVerifying,
  }
}
