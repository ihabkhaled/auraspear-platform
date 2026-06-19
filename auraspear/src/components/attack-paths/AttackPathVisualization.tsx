'use client'

import { ArrowRight, Shield } from 'lucide-react'
import { Badge } from '@/components/ui'
import type { AttackPathVisualizationProps } from '@/types'

export function AttackPathVisualization({ stages, t }: AttackPathVisualizationProps) {
  if (stages.length === 0) {
    return <div className="text-muted-foreground py-4 text-center text-sm">{t('noStages')}</div>
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {stages.map((stage, index) => (
          <div key={`stage-${String(index)}`} className="flex items-center gap-1">
            <div className="border-border bg-card flex min-w-[140px] flex-col gap-1.5 rounded-lg border p-3">
              <div className="flex items-center gap-1.5">
                <Shield className="text-status-info h-3.5 w-3.5 shrink-0" />
                <Badge variant="outline" className="gap-1 font-mono text-xs">
                  {stage.mitreId}
                </Badge>
              </div>
              <span className="text-xs font-medium">{stage.name}</span>
              {(stage.description ?? '').length > 0 && (
                <span className="text-muted-foreground line-clamp-2 text-xs">
                  {stage.description}
                </span>
              )}
              {(stage.assets ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {(stage.assets ?? []).slice(0, 2).map(asset => (
                    <span key={asset} className="bg-muted rounded px-1.5 py-0.5 text-xs">
                      {asset}
                    </span>
                  ))}
                  {(stage.assets ?? []).length > 2 && (
                    <span className="text-muted-foreground text-xs">
                      +{stage.assets.length - 2}
                    </span>
                  )}
                </div>
              )}
            </div>
            {index < stages.length - 1 && (
              <ArrowRight className="text-muted-foreground h-4 w-4 shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
