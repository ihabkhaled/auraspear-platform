'use client'

import { Settings2 } from 'lucide-react'
import { Badge, Card, CardContent } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { ExplorerConnectorCardProps } from '@/types'

export function ExplorerConnectorCard({ connector, meta, onClick, t }: ExplorerConnectorCardProps) {
  const Icon = meta.icon

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      <CardContent className="flex items-center gap-4 pt-6">
        <div className={cn('bg-muted rounded-lg p-3', meta.color)}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{meta.label}</p>
          <p className="text-muted-foreground text-xs">
            {connector.enabled ? t('overview.connected') : t('overview.notConfigured')}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant={connector.enabled ? 'default' : 'secondary'}>
            {connector.enabled ? t('overview.enabled') : t('overview.disabled')}
          </Badge>
          <Badge
            variant={connector.configured ? 'default' : 'destructive'}
            className={cn('gap-1 text-xs', connector.configured && 'bg-status-success text-white')}
          >
            <Settings2 className="h-3 w-3" />
            {connector.configured ? t('overview.configured') : t('overview.notConfigured')}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
