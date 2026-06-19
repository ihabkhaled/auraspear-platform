import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { BadgeVariant } from '@/enums'
import { SEVERITY_VARIANT_MAP } from '@/lib/constants/ueba'
import { lookup } from '@/lib/utils'
import type { UebaAnomaly } from '@/types'

export function useUebaAnomalyCard({
  anomaly,
  onResolve,
}: {
  anomaly: UebaAnomaly
  onResolve: (id: string) => void
}) {
  const t = useTranslations('ueba')

  const severityVariant = lookup(SEVERITY_VARIANT_MAP, anomaly.severity) ?? BadgeVariant.SECONDARY

  const handleResolve = useCallback(() => {
    onResolve(anomaly.id)
  }, [anomaly.id, onResolve])

  return {
    t,
    severityVariant,
    handleResolve,
  }
}
