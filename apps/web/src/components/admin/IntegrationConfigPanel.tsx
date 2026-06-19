'use client'

import { Loader2, Settings } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui'
import { useIntegrationConfigPanel } from '@/hooks'
import { getStatusBorderClass, getStatusIcon } from '@/lib/integration-utils'
import { cn } from '@/lib/utils'
import type { IntegrationConfigPanelProps } from '@/types'

export function IntegrationConfigPanel({
  integrations,
  onTestConnection,
  onConfigure,
  testingId,
}: IntegrationConfigPanelProps) {
  const { t } = useIntegrationConfigPanel()

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {integrations.map(integration => {
        const isTesting = testingId === integration.id
        return (
          <Card
            key={integration.id}
            className={cn('transition-colors', getStatusBorderClass(integration.status))}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                {getStatusIcon(integration.status)}
                {integration.name}
              </CardTitle>
              <p className="text-muted-foreground text-xs">{integration.description}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {integration.configFields && Object.keys(integration.configFields).length > 0 && (
                <div className="space-y-1">
                  {Object.entries(integration.configFields).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{key}</span>
                      <span className="max-w-[180px] truncate font-mono">{value}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onTestConnection(integration.id)}
                  disabled={isTesting}
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="me-1.5 h-3 w-3 animate-spin" />
                      {t('integrations.testing')}
                    </>
                  ) : (
                    t('integrations.testConnection')
                  )}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onConfigure(integration.id)}>
                  <Settings className="me-1.5 h-3 w-3" />
                  {t('integrations.configure')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
