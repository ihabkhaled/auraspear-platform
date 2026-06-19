'use client'

import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Toast } from '@/components/common'
import type { Alert, EscalateFormValues } from '@/types'
import { useCreateIncident } from './useIncidents'

export function useEscalateToIncident(alert: Alert | null, onSuccess: () => void) {
  const t = useTranslations('alerts')
  const createIncidentMutation = useCreateIncident()

  const handleEscalate = useCallback(
    (formData: EscalateFormValues) => {
      if (!alert) return

      createIncidentMutation.mutate(
        {
          title: formData.title,
          description: formData.description,
          severity: formData.severity,
          category: formData.category,
          linkedAlertIds: [alert.id],
          mitreTactics: alert.mitreTactics,
          mitreTechniques: alert.mitreTechniques,
        },
        {
          onSuccess: () => {
            Toast.success(t('escalateSuccess'))
            onSuccess()
          },
          onError: () => {
            Toast.error(t('escalateError'))
          },
        }
      )
    },
    [alert, createIncidentMutation, t, onSuccess]
  )

  return {
    t,
    handleEscalate,
    isPending: createIncidentMutation.isPending,
  }
}
