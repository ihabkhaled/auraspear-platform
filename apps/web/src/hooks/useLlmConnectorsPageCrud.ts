'use client'

import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Toast, SweetAlertDialog, SweetAlertIcon } from '@/components/common'
import { buildErrorToastHandler } from '@/lib/toast.utils'
import type {
  LlmConnectorsPageDialogsReturn,
  CreateLlmConnectorFormValues,
  EditLlmConnectorFormValues,
  CreateLlmConnectorInput,
  UpdateLlmConnectorInput,
} from '@/types'
import {
  useCreateLlmConnector,
  useUpdateLlmConnector,
  useDeleteLlmConnector,
  useTestLlmConnector,
  useToggleLlmConnector,
} from './useLlmConnectors'

export function useLlmConnectorsPageCrud(dialogs: LlmConnectorsPageDialogsReturn) {
  const t = useTranslations('llmConnectors')
  const tErrors = useTranslations('errors')

  const createMutation = useCreateLlmConnector()
  const updateMutation = useUpdateLlmConnector()
  const deleteMutation = useDeleteLlmConnector()
  const testMutation = useTestLlmConnector()
  const toggleMutation = useToggleLlmConnector()

  const handleCreateSubmit = useCallback(
    (formData: CreateLlmConnectorFormValues) => {
      const input: CreateLlmConnectorInput = {
        name: formData.name,
        baseUrl: formData.baseUrl,
        apiKey: formData.apiKey,
      }
      if (formData.description.length > 0) {
        input.description = formData.description
      }
      if (formData.defaultModel.length > 0) {
        input.defaultModel = formData.defaultModel
      }
      if (formData.organizationId.length > 0) {
        input.organizationId = formData.organizationId
      }
      if (formData.maxTokensParam.length > 0) {
        input.maxTokensParam = formData.maxTokensParam
      }
      if (formData.timeout > 0) {
        input.timeout = formData.timeout
      }
      createMutation.mutate(input, {
        onSuccess: () => {
          Toast.success(t('connectorCreated'))
          dialogs.setCreateDialogOpen(false)
        },
        onError: buildErrorToastHandler(tErrors),
      })
    },
    [createMutation, t, tErrors, dialogs]
  )

  const handleEditSubmit = useCallback(
    (formData: EditLlmConnectorFormValues) => {
      if (!dialogs.editConnector) return
      const input: UpdateLlmConnectorInput = {
        name: formData.name,
        baseUrl: formData.baseUrl,
      }
      if (formData.description.length > 0) {
        input.description = formData.description
      }
      if (formData.apiKey.length > 0) {
        input.apiKey = formData.apiKey
      }
      input.defaultModel = formData.defaultModel.length > 0 ? formData.defaultModel : null
      input.organizationId = formData.organizationId.length > 0 ? formData.organizationId : null
      if (formData.maxTokensParam.length > 0) {
        input.maxTokensParam = formData.maxTokensParam
      }
      if (formData.timeout > 0) {
        input.timeout = formData.timeout
      }
      updateMutation.mutate(
        { id: dialogs.editConnector.id, data: input },
        {
          onSuccess: () => {
            Toast.success(t('connectorUpdated'))
            dialogs.setEditDialogOpen(false)
            dialogs.setEditConnector(null)
          },
          onError: buildErrorToastHandler(tErrors),
        }
      )
    },
    [dialogs, updateMutation, t, tErrors]
  )

  const handleDeleteConfirm = useCallback(
    async (connectorId: string) => {
      const confirmed = await SweetAlertDialog.show({
        text: t('deleteConfirm'),
        icon: SweetAlertIcon.WARNING,
      })
      if (!confirmed) return
      deleteMutation.mutate(connectorId, {
        onSuccess: () => {
          Toast.success(t('connectorDeleted'))
          if (dialogs.selectedConnectorId === connectorId) {
            dialogs.setSelectedConnectorId(null)
          }
        },
        onError: buildErrorToastHandler(tErrors),
      })
    },
    [deleteMutation, dialogs, t, tErrors]
  )

  const handleTestConnector = useCallback(
    (connectorId: string) => {
      testMutation.mutate(connectorId, {
        onSuccess: result => {
          const testResult = result.data
          if (testResult?.ok) {
            Toast.success(testResult.details)
          } else {
            Toast.error(testResult?.details ?? t('testFailed'))
          }
        },
        onError: buildErrorToastHandler(tErrors),
      })
    },
    [testMutation, t, tErrors]
  )

  const handleToggleConnector = useCallback(
    (connectorId: string) => {
      toggleMutation.mutate(connectorId, {
        onSuccess: result => {
          if (result.data?.enabled) {
            Toast.success(t('connectorEnabled'))
          } else {
            Toast.success(t('connectorDisabled'))
          }
        },
        onError: buildErrorToastHandler(tErrors),
      })
    },
    [toggleMutation, t, tErrors]
  )

  return {
    handleCreateSubmit,
    handleEditSubmit,
    handleDeleteConfirm,
    handleTestConnector,
    handleToggleConnector,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isTesting: testMutation.isPending,
    isToggling: toggleMutation.isPending,
  }
}
