'use client'

import { REASONING_STEP_CONFIG_MAP, STEP_ICONS } from '@/lib/constants/hunt'
import { cn, lookup } from '@/lib/utils'
import type { ReasoningStepsProps } from '@/types'

export function ReasoningSteps({ steps }: ReasoningStepsProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {steps.map(step => {
        const config = lookup(REASONING_STEP_CONFIG_MAP, step.status)
        const Icon = STEP_ICONS[step.status]

        return (
          <div key={step.id} className="flex items-center gap-2">
            <Icon
              className={cn(
                'h-3.5 w-3.5 shrink-0',
                config.iconClass,
                config.animate && 'animate-spin'
              )}
            />
            <span className={cn('text-xs', config.textClass)}>{step.label}</span>
          </div>
        )
      })}
    </div>
  )
}
