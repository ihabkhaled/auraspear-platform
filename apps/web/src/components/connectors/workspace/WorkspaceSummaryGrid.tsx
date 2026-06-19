'use client'

import { Card, CardContent } from '@/components/ui'
import { CardVariant } from '@/enums'
import { WORKSPACE_ICON_MAP, WORKSPACE_VARIANT_CLASSES } from '@/lib/constants/connectors.constants'
import { cn, lookup } from '@/lib/utils'
import type { WorkspaceSummaryGridProps } from '@/types'

export function WorkspaceSummaryGrid({ cards, loading }: WorkspaceSummaryGridProps) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="bg-muted h-16 animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (cards.length === 0) return null

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(card => {
        const IconComponent = card.icon ? lookup(WORKSPACE_ICON_MAP, card.icon) : undefined
        const variantClass = lookup(WORKSPACE_VARIANT_CLASSES, card.variant ?? CardVariant.DEFAULT)

        return (
          <Card key={card.key}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">{card.label}</p>
                  <p className={cn('text-2xl font-bold', variantClass)}>
                    {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
                  </p>
                  {card.change && <p className="text-muted-foreground text-xs">{card.change}</p>}
                </div>
                {IconComponent && (
                  <div className={cn('rounded-lg p-2', variantClass, 'opacity-60')}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
