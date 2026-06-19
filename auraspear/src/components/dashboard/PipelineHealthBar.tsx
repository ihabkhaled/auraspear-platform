'use client'

import { Activity } from 'lucide-react'
import { EmptyState } from '@/components/common'
import type { ServiceStatus } from '@/enums'
import { usePipelineHealthBar } from '@/hooks'
import { getStatusDotClass } from '@/lib/health-utils'
import { cn } from '@/lib/utils'
import type { PipelineHealthBarProps } from '@/types'

function HealthDot({ status }: { status: ServiceStatus }) {
  return (
    <span className={cn('inline-block h-2 w-2 shrink-0 rounded-full', getStatusDotClass(status))} />
  )
}

export function PipelineHealthBar({ services, onServiceClick }: PipelineHealthBarProps) {
  const { t } = usePipelineHealthBar()

  if (services.length === 0) {
    return (
      <EmptyState
        icon={<Activity className="h-6 w-6" />}
        title={t('pipelineEmptyTitle')}
        description={t('pipelineEmptyDescription')}
        className="py-6"
      />
    )
  }

  return (
    <div className="flex flex-wrap gap-4">
      {services.map(service => (
        <div
          key={service.name}
          className={cn(
            'flex items-center gap-2',
            onServiceClick && 'cursor-pointer hover:opacity-80'
          )}
          onClick={onServiceClick ? () => onServiceClick(service.type) : undefined}
        >
          <HealthDot status={service.status} />
          <span className="text-foreground text-sm">{service.name}</span>
          {service.latencyMs >= 0 && (
            <span className="text-muted-foreground text-xs">({service.latencyMs}ms)</span>
          )}
        </div>
      ))}
    </div>
  )
}
