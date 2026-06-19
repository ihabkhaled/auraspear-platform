'use client'

import { useTranslations } from 'next-intl'
import { AlertStatus } from '@/enums'

export function useAlertDetailDrawer() {
  const t = useTranslations('alerts')
  const tCommon = useTranslations('common')

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case AlertStatus.NEW_ALERT:
        return t('statusNewAlert')
      case AlertStatus.ACKNOWLEDGED:
        return t('statusAcknowledged')
      case AlertStatus.IN_PROGRESS:
        return t('statusInProgress')
      case AlertStatus.RESOLVED:
        return t('statusResolved')
      case AlertStatus.CLOSED:
        return t('statusClosed')
      case AlertStatus.FALSE_POSITIVE:
        return t('statusFalsePositive')
      default:
        return status
    }
  }

  return { t, tCommon, getStatusLabel }
}
