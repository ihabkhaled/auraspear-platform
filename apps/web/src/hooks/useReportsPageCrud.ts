'use client'

import { useCallback, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Toast } from '@/components/common'
import { safeJsonParse } from '@/lib/utils'
import type {
  CreateReportFormValues,
  EditReportFormValues,
  ReportTemplate,
  ReportsPageDialogsReturn,
} from '@/types'
import {
  useCreateReport,
  useCreateReportFromTemplate,
  useDeleteReport,
  useUpdateReport,
} from './useReports'

export function useReportsPageCrud(dialogs: ReportsPageDialogsReturn) {
  const t = useTranslations('reports')

  const createMutation = useCreateReport()
  const createFromTemplateMutation = useCreateReportFromTemplate()
  const updateMutation = useUpdateReport()
  const deleteMutation = useDeleteReport()
  const [generatingTemplateKey, setGeneratingTemplateKey] = useState<ReportTemplate['key'] | null>(
    null
  )

  const handleCreate = useCallback(
    (formData: CreateReportFormValues) => {
      const payload: Record<string, unknown> = {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        module: formData.module,
        templateKey: formData.templateKey,
        format: formData.format,
      }
      if (formData.parameters.trim().length > 0) {
        payload['parameters'] = safeJsonParse<Record<string, unknown>>(formData.parameters, {})
      }
      if (formData.filterSnapshot?.trim().length) {
        payload['filterSnapshot'] = safeJsonParse<Record<string, unknown>>(
          formData.filterSnapshot,
          {}
        )
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
    (formData: EditReportFormValues) => {
      if (!dialogs.selectedReport) {
        return
      }
      const payload: Record<string, unknown> = {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        module: formData.module,
        templateKey: formData.templateKey,
        format: formData.format,
      }
      if (formData.parameters.trim().length > 0) {
        payload['parameters'] = safeJsonParse<Record<string, unknown>>(formData.parameters, {})
      }
      if (formData.filterSnapshot?.trim().length) {
        payload['filterSnapshot'] = safeJsonParse<Record<string, unknown>>(
          formData.filterSnapshot,
          {}
        )
      }
      updateMutation.mutate(
        { id: dialogs.selectedReport.id, data: payload },
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
          dialogs.setDeleteReportId(null)
        },
        onError: () => {
          Toast.error(t('deleteError'))
        },
      })
    },
    [deleteMutation, t, dialogs]
  )

  const handleGenerateFromTemplate = useCallback(
    (template: ReportTemplate) => {
      setGeneratingTemplateKey(template.key)
      createFromTemplateMutation.mutate(
        {
          templateKey: template.key,
          module: template.module,
        },
        {
          onSuccess: () => {
            Toast.success(t('templateGenerateSuccess'))
            setGeneratingTemplateKey(null)
          },
          onError: () => {
            Toast.error(t('templateGenerateError'))
            setGeneratingTemplateKey(null)
          },
        }
      )
    },
    [createFromTemplateMutation, t]
  )

  return {
    handleCreate,
    handleEdit,
    handleDelete,
    handleGenerateFromTemplate,
    generatingTemplateKey,
    createLoading: createMutation.isPending,
    editLoading: updateMutation.isPending,
  }
}
