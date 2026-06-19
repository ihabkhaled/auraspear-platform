import { useTranslations } from 'next-intl'
import type { DetectionRuleDetailPanelProps } from '@/types'
import { useAiDetectionCopilot } from './useAiDetectionCopilot'

export function useDetectionRuleDetailPanel({ rule }: Pick<DetectionRuleDetailPanelProps, 'rule'>) {
  const t = useTranslations('detectionRules')
  const tCommon = useTranslations('common')

  const hasData = rule !== null

  const aiCopilot = useAiDetectionCopilot(rule?.id ?? null)

  return { t, tCommon, hasData, aiCopilot }
}
