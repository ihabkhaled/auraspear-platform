import { Bot } from 'lucide-react'
import { Badge } from '@/components/ui'
import { resolveAutomationBadgeLabel, resolveAutomationBadgeVariant } from '@/lib/ai-config.utils'
import type { AiAutomationBadgeProps } from '@/types'

export function AiAutomationBadge({ automationMode, isEnabled, t }: AiAutomationBadgeProps) {
  const variant = resolveAutomationBadgeVariant(automationMode, isEnabled)
  const label = resolveAutomationBadgeLabel(automationMode, isEnabled, t)

  return (
    <Badge variant={variant} className="gap-1 text-[10px]">
      <Bot className="h-3 w-3" />
      {label}
    </Badge>
  )
}
