'use client'

import { Settings, Play, Trash2, ExternalLink } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Switch,
} from '@/components/ui'
import { WorkspaceTab } from '@/enums'
import { useConnectorCard } from '@/hooks'
import { deriveConnectorStatus } from '@/lib/connectors.utils'
import { CONNECTOR_ICONS } from '@/lib/constants/connectors.constants'
import { formatRelativeTime } from '@/lib/utils'
import type { ConnectorCardProps } from '@/types'
import { StatusBadge } from './StatusBadge'

export function ConnectorCard({ connector }: ConnectorCardProps) {
  const {
    router,
    t,
    isEditor,
    isAdmin,
    meta,
    testMutation,
    toggleMutation,
    deleteMutation,
    handleToggle,
    handleTest,
    handleDelete,
  } = useConnectorCard({ connector })

  const Icon = CONNECTOR_ICONS[connector.type]
  const connectorStatus = deriveConnectorStatus(connector.lastTestOk)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
              <Icon className="text-muted-foreground h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">{connector.name}</CardTitle>
              <CardDescription>{t(meta.descriptionKey)}</CardDescription>
            </div>
          </div>
          <Switch
            checked={connector.enabled}
            onCheckedChange={handleToggle}
            disabled={!isEditor || toggleMutation.isPending}
          />
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
        <div className="flex flex-wrap gap-2">
          {connector.enabled && (
            <Button
              variant="default"
              size="sm"
              onClick={() => router.push(`/connectors/${connector.type}`)}
            >
              <ExternalLink className="me-1 h-3.5 w-3.5" />
              {t('openWorkspace')}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/connectors/${connector.type}?tab=${WorkspaceTab.CONFIG}`)}
          >
            <Settings className="me-1 h-3.5 w-3.5" />
            {t('configure')}
          </Button>
          {isEditor && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={testMutation.isPending}
            >
              <Play className="me-1 h-3.5 w-3.5" />
              {t('test')}
            </Button>
          )}
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="me-1 h-3.5 w-3.5" />
              {t('deleteConnector')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
