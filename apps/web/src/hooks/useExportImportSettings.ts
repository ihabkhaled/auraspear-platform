import { useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Toast } from '@/components/common'
import { nowISO, todayDate } from '@/lib/dayjs'
import { buildErrorToastHandler } from '@/lib/toast.utils'
import type { ExportedSettings } from '@/types'
import { usePreferences, useUpdatePreferences } from './useSettings'

export function useExportImportSettings() {
  const t = useTranslations('settings')
  const tErrors = useTranslations('errors')
  const { data: preferences } = usePreferences()
  const updatePreferences = useUpdatePreferences()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = useCallback(() => {
    if (!preferences) {
      return
    }

    const exportData: ExportedSettings = {
      notificationPreferences: {
        criticalAlerts: Boolean(preferences['notifyCriticalAlerts'] ?? true),
        highAlerts: Boolean(preferences['notifyHighAlerts'] ?? true),
        caseAssignments: Boolean(preferences['notifyCaseAssignments'] ?? true),
        caseUpdates: Boolean(preferences['notifyCaseUpdates'] ?? true),
        caseComments: Boolean(preferences['notifyCaseComments'] ?? true),
        caseActivity: Boolean(preferences['notifyCaseActivity'] ?? true),
        incidentUpdates: Boolean(preferences['notifyIncidentUpdates'] ?? true),
        complianceAlerts: Boolean(preferences['notifyComplianceAlerts'] ?? true),
        userManagement: Boolean(preferences['notifyUserManagement'] ?? true),
      },
      dataRetention: {
        alertRetention: (preferences['retentionAlerts'] as string) ?? '90',
        logRetention: (preferences['retentionLogs'] as string) ?? '90',
        incidentRetention: (preferences['retentionIncidents'] as string) ?? '365',
        auditLogRetention: (preferences['retentionAuditLogs'] as string) ?? '365',
      },
      theme: (preferences['theme'] as string) ?? 'system',
      language: (preferences['language'] as string) ?? 'en',
      exportedAt: nowISO(),
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `auraspear-settings-${todayDate()}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    Toast.success(t('exportSuccess'))
  }, [preferences, t])

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) {
        return
      }

      const reader = new FileReader()
      reader.onload = (e: ProgressEvent<FileReader>) => {
        try {
          const content = e.target?.result
          if (typeof content !== 'string') {
            Toast.error(t('importError'))
            return
          }

          const importedData = JSON.parse(content) as Partial<ExportedSettings>

          if (!importedData.exportedAt) {
            Toast.warning(t('importWarning'))
            return
          }

          const flatPreferences: Record<string, unknown> = {}

          if (importedData.notificationPreferences) {
            const notifMap: Record<string, string> = {
              criticalAlerts: 'notifyCriticalAlerts',
              highAlerts: 'notifyHighAlerts',
              caseAssignments: 'notifyCaseAssignments',
              caseUpdates: 'notifyCaseUpdates',
              caseComments: 'notifyCaseComments',
              caseActivity: 'notifyCaseActivity',
              incidentUpdates: 'notifyIncidentUpdates',
              complianceAlerts: 'notifyComplianceAlerts',
              userManagement: 'notifyUserManagement',
            }
            for (const [key, value] of Object.entries(importedData.notificationPreferences)) {
              const mappedKey = Reflect.get(notifMap, key) as string | undefined
              if (mappedKey) {
                Reflect.set(flatPreferences, mappedKey, value)
              }
            }
          }

          if (importedData.dataRetention) {
            const retentionMap: Record<string, string> = {
              alertRetention: 'retentionAlerts',
              logRetention: 'retentionLogs',
              incidentRetention: 'retentionIncidents',
              auditLogRetention: 'retentionAuditLogs',
            }
            for (const [key, value] of Object.entries(importedData.dataRetention)) {
              const mappedKey = Reflect.get(retentionMap, key) as string | undefined
              if (mappedKey) {
                Reflect.set(flatPreferences, mappedKey, value)
              }
            }
          }

          if (importedData.theme) {
            flatPreferences['theme'] = importedData.theme
          }

          if (importedData.language) {
            flatPreferences['language'] = importedData.language
          }

          updatePreferences.mutate(flatPreferences, {
            onSuccess: () => {
              Toast.success(t('importSuccess'))
            },
            onError: buildErrorToastHandler(tErrors),
          })
        } catch {
          Toast.error(t('importError'))
        }
      }
      reader.readAsText(file)

      if (event.currentTarget) {
        event.currentTarget.value = ''
      }
    },
    [updatePreferences, t, tErrors]
  )

  return {
    t,
    fileInputRef,
    isPending: updatePreferences.isPending,
    handleExport,
    handleImportClick,
    handleFileChange,
  }
}
