import { useTranslations } from 'next-intl'
import type { DetectionRuleKpiCardsProps } from '@/types'

export function useDetectionRuleKpiCards(_props: Pick<DetectionRuleKpiCardsProps, 'stats'>) {
  const t = useTranslations('detectionRules')

  return { t }
}
