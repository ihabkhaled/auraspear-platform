'use client'

import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Toast } from '@/components/common'
import { IncidentStatus } from '@/enums'
import { getErrorKey } from '@/lib/api-error'
import { nowISO } from '@/lib/dayjs'
import { copyToClipboard } from '@/lib/utils'
import type {
  CreateIncidentFormValues,
  EditIncidentFormValues,
  Incident,
  IncidentPageDialogsReturn,
} from '@/types'
import { useIncidentDeleteDialog } from './useIncidentDeleteDialog'
import {
  useChangeIncidentStatus,
  useCreateIncident,
  useUpdateIncident,
  useDeleteIncident,
} from './useIncidents'

export function useIncidentPageCrud(dialogs: IncidentPageDialogsReturn) {
  const t = useTranslations('incidents')
  const tCommon = useTranslations('common')
  const tError = useTranslations('errors')

  const createMutation = useCreateIncident()
  const updateMutation = useUpdateIncident()
  const changeStatusMutation = useChangeIncidentStatus()
  const deleteMutation = useDeleteIncident()
  const { confirmDelete } = useIncidentDeleteDialog()

  const handleCreate = useCallback(
    (formData: CreateIncidentFormValues) => {
      const payload: Record<string, unknown> = {
        title: formData.title,
        description: formData.description,
        severity: formData.severity,
        category: formData.category,
      }
      if (formData.assigneeId) {
        payload['assigneeId'] = formData.assigneeId
      }
      if (formData.mitreTechniques && formData.mitreTechniques.trim().length > 0) {
        payload['mitreTechniques'] = formData.mitreTechniques
          .split(',')
          .map(s => s.trim())
          .filter(s => s.length > 0)
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
    (formData: EditIncidentFormValues) => {
      if (!dialogs.editingIncident) {
        return
      }
      const payload: Record<string, unknown> = {
        title: formData.title,
        description: formData.description,
        severity: formData.severity,
        category: formData.category,
        status: formData.status,
      }
      if (formData.assigneeId) {
        payload['assigneeId'] = formData.assigneeId
      }
      if (formData.mitreTechniques && formData.mitreTechniques.trim().length > 0) {
        payload['mitreTechniques'] = formData.mitreTechniques
          .split(',')
          .map(s => s.trim())
          .filter(s => s.length > 0)
      }
      if (
        formData.status === IncidentStatus.RESOLVED &&
        dialogs.editingIncident.status !== IncidentStatus.RESOLVED
      ) {
        payload['resolvedAt'] = nowISO()
      }
      updateMutation.mutate(
        { id: dialogs.editingIncident.id, data: payload },
        {
          onSuccess: () => {
            Toast.success(t('updateSuccess'))
            dialogs.setEditDialogOpen(false)
            dialogs.setEditingIncident(null)
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
    async (incident: Incident) => {
      const confirmed = await confirmDelete(incident.incidentNumber, incident.title)
      if (!confirmed) {
        return
      }
      deleteMutation.mutate(incident.id, {
        onSuccess: () => {
          Toast.success(t('deleteSuccess'))
        },
        onError: () => {
          Toast.error(t('deleteError'))
        },
      })
    },
    [confirmDelete, deleteMutation, t]
  )

  const handleCopyId = useCallback(
    (id: string) => {
      void copyToClipboard(id)
      Toast.success(tCommon('copied'))
    },
    [tCommon]
  )

  const handleChangeStatus = useCallback(
    (status: IncidentStatus) => {
      if (!dialogs.detailIncident) {
        return
      }

      changeStatusMutation.mutate(
        { id: dialogs.detailIncident.id, status },
        {
          onSuccess: response => {
            Toast.success(t('updateSuccess'))
            dialogs.setDetailIncident(response.data)
            if (dialogs.editingIncident?.id === response.data.id) {
              dialogs.setEditingIncident(response.data)
            }
          },
          onError: (error: unknown) => {
            Toast.error(tError(getErrorKey(error)))
          },
        }
      )
    },
    [changeStatusMutation, dialogs, t, tError]
  )

  return {
    handleCreate,
    handleEdit,
    handleChangeStatus,
    handleDelete,
    handleCopyId,
    createLoading: createMutation.isPending,
    editLoading: updateMutation.isPending,
    changeStatusLoading: changeStatusMutation.isPending,
    deleteLoading: deleteMutation.isPending,
  }
}
