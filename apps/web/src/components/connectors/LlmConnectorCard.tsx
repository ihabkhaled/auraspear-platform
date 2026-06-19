'use client'

import { Cable, Settings } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui'
import { useLlmConnectorCard } from '@/hooks'
import { formatRelativeTime } from '@/lib/utils'
import type { LlmConnectorCardProps } from '@/types'
import { StatusBadge } from './StatusBadge'

export function LlmConnectorCard({ connector, t }: LlmConnectorCardProps) {
  const { connectorStatus, handleManage } = useLlmConnectorCard({ connector })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
              <Cable className="text-muted-foreground h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{connector.name}</CardTitle>
                <Badge
                  variant={connector.enabled ? 'default' : 'secondary'}
                  className={
                    connector.enabled ? 'bg-status-success text-[10px] text-white' : 'text-[10px]'
                  }
                >
                  {connector.enabled ? t('enabled') : t('disabled')}
                </Badge>
              </div>
              <CardDescription>
                {connector.description ?? connector.defaultModel ?? connector.baseUrl}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <StatusBadge status={connectorStatus} />
          {connector.lastTestAt && (
            <span className="text-muted-foreground text-xs">
              {t('tested')} {formatRelativeTime(connector.lastTestAt)}
            </span>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleManage}>
          <Settings className="me-1 h-3.5 w-3.5" />
          {t('manage')}
        </Button>
      </CardContent>
    </Card>
  )
}
