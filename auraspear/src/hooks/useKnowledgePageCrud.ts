'use client'

import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { SweetAlertDialog, SweetAlertIcon, Toast } from '@/components/common'
import { Permission } from '@/enums'
import { hasPermission } from '@/lib/permissions'
import { buildErrorToastHandler } from '@/lib/toast.utils'
import { useAiConnectorStore, useAuthStore } from '@/stores'
import type { CreateRunbookFormValues, EditRunbookFormValues, RunbookRecord } from '@/types'
import { useAiGenerateRunbook, useAiSearchKnowledge } from './useAiKnowledge'
import { useCreateRunbook, useUpdateRunbook, useDeleteRunbook } from './useRunbooks'

export function useKnowledgePageCrud(dialogs: {
  setCreateOpen: (open: boolean) => void
  setEditOpen: (open: boolean) => void
  selectedRunbook: RunbookRecord | null
  setSelectedRunbook: (runbook: RunbookRecord | null) => void
  detailRunbook: RunbookRecord | null
  setDetailRunbook: (runbook: RunbookRecord | null) => void
}) {
  const t = useTranslations('knowledge')
  const tErrors = useTranslations('errors')
  const permissions = useAuthStore(s => s.permissions)

  const canCreate = hasPermission(permissions, Permission.RUNBOOKS_CREATE)
  const canEdit = hasPermission(permissions, Permission.RUNBOOKS_UPDATE)
  const canDelete = hasPermission(permissions, Permission.RUNBOOKS_DELETE)

  const createMutation = useCreateRunbook()
  const updateMutation = useUpdateRunbook()
  const deleteMutation = useDeleteRunbook()

  const selectedConnector = useAiConnectorStore(s => s.selectedConnector)
  const connectorValue = selectedConnector === 'default' ? undefined : selectedConnector
  const aiGenerateMutation = useAiGenerateRunbook(connectorValue)
  const aiSearchMutation = useAiSearchKnowledge(connectorValue)

  const handleCreate = useCallback(
    (values: CreateRunbookFormValues) => {
      const tags = values.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)

      createMutation.mutate(
        {
          title: values.title,
          content: values.content,
          category: values.category.length > 0 ? values.category : undefined,
          tags: tags.length > 0 ? tags : undefined,
        },
        {
          onSuccess: () => {
            Toast.success(t('runbookCreated'))
            dialogs.setCreateOpen(false)
          },
          onError: error => {
            buildErrorToastHandler(tErrors)(error)
          },
        }
      )
    },
    [createMutation, t, tErrors, dialogs]
  )

  const handleEdit = useCallback(
    (values: EditRunbookFormValues) => {
      if (!dialogs.selectedRunbook) {
        return
      }
      const tags = values.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)

      updateMutation.mutate(
        {
          id: dialogs.selectedRunbook.id,
          data: {
            title: values.title,
            content: values.content,
            category: values.category.length > 0 ? values.category : undefined,
            tags: tags.length > 0 ? tags : undefined,
          },
        },
        {
          onSuccess: () => {
            Toast.success(t('runbookUpdated'))
            dialogs.setEditOpen(false)
            dialogs.setSelectedRunbook(null)
          },
          onError: error => {
            buildErrorToastHandler(tErrors)(error)
          },
        }
      )
    },
    [updateMutation, dialogs, t, tErrors]
  )

  const handleDelete = useCallback(
    async (runbook: RunbookRecord) => {
      const confirmed = await SweetAlertDialog.show({
        text: t('deleteConfirm'),
        icon: SweetAlertIcon.QUESTION,
      })
      if (!confirmed) {
        return
      }
      deleteMutation.mutate(runbook.id, {
        onSuccess: () => {
          Toast.success(t('runbookDeleted'))
          if (dialogs.detailRunbook?.id === runbook.id) {
            dialogs.setDetailRunbook(null)
          }
        },
        onError: error => {
          buildErrorToastHandler(tErrors)(error)
        },
      })
    },
    [deleteMutation, t, tErrors, dialogs]
  )

  const handleAiGenerate = useCallback(
    (description: string) => {
      aiGenerateMutation.mutate(description, {
        onError: buildErrorToastHandler(tErrors),
      })
    },
    [aiGenerateMutation, tErrors]
  )

  const handleAiSearch = useCallback(
    (query: string) => {
      aiSearchMutation.mutate(query, {
        onError: buildErrorToastHandler(tErrors),
      })
    },
    [aiSearchMutation, tErrors]
  )

  return {
    handleCreate,
    handleEdit,
    handleDelete,
    createLoading: createMutation.isPending,
    editLoading: updateMutation.isPending,
    canCreate,
    canEdit,
    canDelete,
    aiGenerate: {
      mutate: handleAiGenerate,
      data: aiGenerateMutation.data,
      isPending: aiGenerateMutation.isPending,
    },
    aiSearch: {
      mutate: handleAiSearch,
      data: aiSearchMutation.data,
      isPending: aiSearchMutation.isPending,
    },
  }
}
