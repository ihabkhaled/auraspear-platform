'use client'

import { ChevronDown } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { CollapsibleSectionProps } from '@/types'

export function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = true,
  className,
  badge,
}: CollapsibleSectionProps) {
  return (
    <Collapsible defaultOpen={defaultOpen}>
      <div className={cn('space-y-3', className)}>
        <CollapsibleTrigger className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <h4 className="text-sm font-semibold">{title}</h4>
            {badge}
          </div>
          <ChevronDown className="text-muted-foreground h-4 w-4 transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3">{children}</CollapsibleContent>
      </div>
    </Collapsible>
  )
}
