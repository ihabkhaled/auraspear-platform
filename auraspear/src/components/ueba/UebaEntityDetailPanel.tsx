'use client'

import { ChevronDown, X } from 'lucide-react'
import { AiFindingsPanel, LoadingSpinner } from '@/components/common'
import {
  Badge,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Separator,
} from '@/components/ui'
import { useUebaEntityDetailPanel } from '@/hooks'
import {
  UEBA_ENTITY_TYPE_LABEL_KEYS,
  UEBA_ENTITY_TYPE_CLASSES,
  UEBA_RISK_LEVEL_LABEL_KEYS,
  UEBA_RISK_LEVEL_CLASSES,
} from '@/lib/constants/ueba'
import { formatDate, lookup } from '@/lib/utils'
import type { UebaEntityDetailPanelProps } from '@/types'
import { UebaAnomalyCard } from './UebaAnomalyCard'

export function UebaEntityDetailPanel({ entityId, onClose }: UebaEntityDetailPanelProps) {
  const {
    t,
    entity,
    entityLoading,
    anomalies,
    anomaliesFetching,
    isResolving,
    handleResolveAnomaly,
    handleClose,
  } = useUebaEntityDetailPanel({ entityId, onClose })

  if (!entityId) {
    return null
  }

  if (entityLoading) {
    return (
      <div className="bg-card border-border rounded-lg border p-6">
        <LoadingSpinner />
      </div>
    )
  }

  if (!entity) {
    return (
      <div className="bg-card border-border rounded-lg border p-6">
        <p className="text-muted-foreground text-sm">{t('entityNotFound')}</p>
      </div>
    )
  }

  const trendValues = Array.isArray(entity.trendData) ? entity.trendData : []

  return (
    <div className="bg-card border-border flex flex-col gap-4 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{entity.entityName}</h3>
        <Button variant="ghost" size="sm" onClick={handleClose} aria-label={t('close')}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${lookup(UEBA_ENTITY_TYPE_CLASSES, entity.entityType)}`}
        >
          {t(lookup(UEBA_ENTITY_TYPE_LABEL_KEYS, entity.entityType))}
        </span>
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${lookup(UEBA_RISK_LEVEL_CLASSES, entity.riskLevel)}`}
        >
          {t(lookup(UEBA_RISK_LEVEL_LABEL_KEYS, entity.riskLevel))}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground text-xs">{t('colRiskScore')}</span>
          <span className="font-mono text-sm font-medium">{entity.riskScore}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground text-xs">{t('colAnomalyCount')}</span>
          <span className="text-sm font-medium">{entity.anomalyCount}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground text-xs">{t('colLastSeen')}</span>
          <span className="text-sm">{entity.lastSeenAt ? formatDate(entity.lastSeenAt) : '-'}</span>
        </div>
      </div>

      {trendValues.length > 0 && (
        <Collapsible defaultOpen>
          <CollapsibleTrigger className="flex w-full items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium">{t('riskTrend')}</span>
            <ChevronDown className="text-muted-foreground h-4 w-4 transition-transform data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="flex items-end gap-0.5 pt-1.5">
              {trendValues.map((value, index) => (
                <div
                  key={`trend-${String(index)}`}
                  className="bg-primary/60 w-3 rounded-t"
                  style={{ height: `${Math.max(Number(value), 4)}px` }}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      <Collapsible defaultOpen>
        <CollapsibleTrigger className="flex w-full items-center justify-between">
          <h4 className="text-sm font-medium">{t('anomalies')}</h4>
          <div className="flex items-center gap-2">
            {anomaliesFetching && <Badge variant="secondary">{t('loading')}</Badge>}
            <ChevronDown className="text-muted-foreground h-4 w-4 transition-transform data-[state=open]:rotate-180" />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="pt-2">
            {anomalies.length === 0 ? (
              <p className="text-muted-foreground text-xs">{t('noAnomalies')}</p>
            ) : (
              <div className="flex flex-col gap-2">
                {anomalies.map(anomaly => (
                  <UebaAnomalyCard
                    key={anomaly.id}
                    anomaly={anomaly}
                    onResolve={handleResolveAnomaly}
                    resolving={isResolving}
                  />
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Separator />
      <AiFindingsPanel sourceModule="ueba" sourceEntityId={entityId} t={t} />
    </div>
  )
}
