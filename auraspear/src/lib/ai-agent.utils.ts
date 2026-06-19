import {
  AiAgentSessionStatus,
  AiConnectorPreference,
  BadgeVariant,
  StatusBgClass,
  StatusBorderClass,
  StatusTextClass,
  type AiAgentPanelTab,
} from '@/enums'
import { AI_AGENT_PANEL_TABS } from '@/lib/constants/ai-agents'
import type { SessionStatusBadgeProps } from '@/types'

export function isAiAgentPanelTab(value: string): value is AiAgentPanelTab {
  for (const tab of AI_AGENT_PANEL_TABS) {
    if (tab === value) {
      return true
    }
  }

  return false
}

const AI_CONNECTOR_PREFERENCE_VALUES: ReadonlySet<string> = new Set(
  Object.values(AiConnectorPreference)
)

export function isAiConnectorPreference(value: string): value is AiConnectorPreference {
  return AI_CONNECTOR_PREFERENCE_VALUES.has(value)
}

export function getSessionStatusBadgeProps(status: string): SessionStatusBadgeProps {
  switch (status) {
    case AiAgentSessionStatus.COMPLETED:
      return {
        variant: BadgeVariant.DEFAULT,
        className: `${StatusBgClass.SUCCESS} ${StatusTextClass.WHITE}`,
      }
    case AiAgentSessionStatus.FAILED:
      return { variant: BadgeVariant.DESTRUCTIVE, className: '' }
    case AiAgentSessionStatus.CANCELLED:
      return {
        variant: BadgeVariant.OUTLINE,
        className: `${StatusBorderClass.WARNING} ${StatusTextClass.WARNING}`,
      }
    case AiAgentSessionStatus.RUNNING:
      return { variant: BadgeVariant.SECONDARY, className: '' }
    default:
      return { variant: BadgeVariant.OUTLINE, className: '' }
  }
}
