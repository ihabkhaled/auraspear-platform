import { useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Toast } from '@/components/common'
import { RetentionPeriod } from '@/enums'
import { buildErrorToastHandler } from '@/lib/toast.utils'
import {
  DEFAULT_RETENTION,
  RETENTION_KEY_TO_PREF,
  RETENTION_OPTIONS,
} from '@/lib/constants/settings'
import { lookup } from '@/lib/utils'
import type { DataRetentionConfig } from '@/types'
import { usePreferences, useUpdatePreferences } from './useSettings'

export function useDataRetention() {
  const t = useTranslations('settings')
  const tErrors = useTranslations('errors')
  const { data: preferences } = usePreferences()
  const updatePreferences = useUpdatePreferences()

  const retentionConfig = useMemo(
    (): DataRetentionConfig => ({
      alertRetention:
        (preferences?.['retentionAlerts'] as RetentionPeriod | undefined) ??
        DEFAULT_RETENTION.alertRetention,
      logRetention:
        (preferences?.['retentionLogs'] as RetentionPeriod | undefined) ??
        DEFAULT_RETENTION.logRetention,
      incidentRetention:
        (preferences?.['retentionIncidents'] as RetentionPeriod | undefined) ??
        DEFAULT_RETENTION.incidentRetention,
      auditLogRetention:
        (preferences?.['retentionAuditLogs'] as RetentionPeriod | undefined) ??
        DEFAULT_RETENTION.auditLogRetention,
    }),
    [preferences]
  )

  const handleRetentionChange = useCallback(
    (key: keyof DataRetentionConfig, value: string) => {
      updatePreferences.mutate(
        { [lookup(RETENTION_KEY_TO_PREF, key)]: value },
        {
          onSuccess: () => {
            Toast.success(t('saved'))
          },
          onError: buildErrorToastHandler(tErrors),
        }
      )
    },
    [updatePreferences, t, tErrors]
  )

  const getRetentionLabel = useCallback(
    (period: RetentionPeriod): string => {
      const labelMap: Record<RetentionPeriod, string> = {
        [RetentionPeriod.DAYS_30]: t('days30'),
        [RetentionPeriod.DAYS_90]: t('days90'),
        [RetentionPeriod.DAYS_180]: t('days180'),
        [RetentionPeriod.DAYS_365]: t('days365'),
        [RetentionPeriod.UNLIMITED]: t('unlimited'),
      }
      return lookup(labelMap, period)
    },
    [t]
  )

  return {
    t,
    retentionConfig,
    retentionOptions: RETENTION_OPTIONS,
    isPending: updatePreferences.isPending,
    handleRetentionChange,
    getRetentionLabel,
  }
}
