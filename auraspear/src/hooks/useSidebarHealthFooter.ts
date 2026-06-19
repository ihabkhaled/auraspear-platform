import { useTranslations } from 'next-intl'
import { getHealthStatusClass, getHealthBgClass } from '@/lib/health-utils'

export function useSidebarHealthFooter(healthPercent: number) {
  const t = useTranslations('layout')
  const statusClass = getHealthStatusClass(healthPercent)
  const bgClass = getHealthBgClass(healthPercent)

  return { t, statusClass, bgClass }
}
