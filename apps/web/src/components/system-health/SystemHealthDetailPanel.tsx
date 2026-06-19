'use client'

import { ChevronDown } from 'lucide-react'
import {
  Badge,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui'
import { useSystemHealthDetailPanel } from '@/hooks'
import {
  HEALTH_CHECK_STATUS_CLASSES,
  HEALTH_CHECK_STATUS_LABEL_KEYS,
  METRIC_TYPE_LABEL_KEYS,
  SERVICE_TYPE_LABEL_KEYS,
} from '@/lib/constants/system-health'
import { cn, formatTimestamp, lookup } from '@/lib/utils'
import type { SystemHealthDetailPanelProps } from '@/types'

export function SystemHealthDetailPanel({
  healthCheck,
  metrics,
  open,
  onOpenChange,
}: SystemHealthDetailPanelProps) {
  const { t, tCommon, hasData } = useSystemHealthDetailPanel({ healthCheck })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{t('detailTitle')}</SheetTitle>
          <SheetDescription>{t('detailDescription')}</SheetDescription>
        </SheetHeader>

        {hasData && healthCheck && (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">{t('fieldServiceType')}</span>
                <span className="text-foreground text-sm font-medium">
                  {t(lookup(SERVICE_TYPE_LABEL_KEYS, healthCheck.serviceType))}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">{tCommon('status')}</span>
                <span
                  className={cn(
                    'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                    lookup(HEALTH_CHECK_STATUS_CLASSES, healthCheck.status)
                  )}
                >
                  {t(lookup(HEALTH_CHECK_STATUS_LABEL_KEYS, healthCheck.status))}
                </span>
              </div>
              {healthCheck.responseTimeMs !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">{t('columnResponseTime')}</span>
                  <span className="text-foreground text-sm font-medium">
                    {`${healthCheck.responseTimeMs}ms`}
                  </span>
                </div>
              )}
              {healthCheck.version && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">{t('columnVersion')}</span>
                  <Badge variant="secondary">{healthCheck.version}</Badge>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">{t('columnCheckedAt')}</span>
                <span className="text-foreground text-sm">
                  {formatTimestamp(healthCheck.checkedAt)}
                </span>
              </div>
            </div>

            {healthCheck.message && (
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex w-full items-center justify-between py-2">
                  <span className="text-foreground text-sm font-semibold">
                    {t('columnMessage')}
                  </span>
                  <ChevronDown className="text-muted-foreground h-4 w-4 transition-transform [[data-state=open]>_&]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <p className="bg-muted text-foreground rounded-md p-2 text-sm">
                    {healthCheck.message}
                  </p>
                </CollapsibleContent>
              </Collapsible>
            )}

            {metrics.length > 0 && (
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex w-full items-center justify-between py-2">
                  <span className="text-foreground text-sm font-semibold">
                    {t('metricsHistory')}
                  </span>
                  <ChevronDown className="text-muted-foreground h-4 w-4 transition-transform [[data-state=open]>_&]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-2">
                    {metrics.map(metric => (
                      <div
                        key={metric.id}
                        className="bg-muted flex items-center justify-between rounded-md p-2"
                      >
                        <span className="text-foreground text-sm">
                          {t(lookup(METRIC_TYPE_LABEL_KEYS, metric.metricType))}
                        </span>
                        <span className="text-muted-foreground text-sm">
                          {`${metric.value} ${metric.unit}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
