'use client'

import { Swords } from 'lucide-react'
import { EmptyState } from '@/components/common'
import { Progress } from '@/components/ui'
import { useMitreTopTechniques } from '@/hooks'
import type { MITRETopTechniquesProps } from '@/types'

export function MitreTopTechniques({ techniques }: MITRETopTechniquesProps) {
  const { t } = useMitreTopTechniques()

  if (techniques.length === 0) {
    return (
      <EmptyState
        icon={<Swords className="h-6 w-6" />}
        title={t('mitreEmptyTitle')}
        description={t('mitreEmptyDescription')}
        className="py-6"
      />
    )
  }

  return (
    <div className="space-y-3">
      {techniques.map(technique => (
        <div key={technique.id} className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-mono text-xs">{technique.id}</span>
              <span className="text-foreground font-medium">{technique.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">{technique.count}</span>
              <span className="text-foreground w-10 text-end text-xs font-medium">
                {technique.percentage}%
              </span>
            </div>
          </div>
          <Progress value={technique.percentage} className="h-1.5" />
        </div>
      ))}
    </div>
  )
}
