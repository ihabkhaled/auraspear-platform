'use client'

import { ChevronDown, Edit, Trash2, X } from 'lucide-react'
import { AiFindingsPanel, LoadingSpinner } from '@/components/common'
import {
  Badge,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Separator,
} from '@/components/ui'
import { useAttackPathDetailPanel } from '@/hooks'
import {
  ATTACK_PATH_SEVERITY_CLASSES,
  ATTACK_PATH_SEVERITY_LABEL_KEYS,
  ATTACK_PATH_STATUS_CLASSES,
  ATTACK_PATH_STATUS_LABEL_KEYS,
} from '@/lib/constants/attack-paths'
import { formatDate, lookup } from '@/lib/utils'
import type { AttackPathDetailPanelProps } from '@/types'
import { AttackPathVisualization } from './AttackPathVisualization'

export function AttackPathDetailPanel({
  pathId,
  onClose,
  onEdit,
  onDelete,
  t,
}: AttackPathDetailPanelProps) {
  const { path, isLoading } = useAttackPathDetailPanel(pathId)

  if (isLoading) {
    return (
      <div className="border-border bg-card rounded-lg border p-6">
        <LoadingSpinner />
      </div>
    )
  }

  if (!path) {
    return (
      <div className="border-border bg-card rounded-lg border p-6">
        <p className="text-muted-foreground text-sm">{t('noPathSelected')}</p>
      </div>
    )
  }

  const severityLabelKey = lookup(ATTACK_PATH_SEVERITY_LABEL_KEYS, path.severity)
  const severityClass = lookup(ATTACK_PATH_SEVERITY_CLASSES, path.severity)
  const statusLabelKey = lookup(ATTACK_PATH_STATUS_LABEL_KEYS, path.status)
  const statusClass = lookup(ATTACK_PATH_STATUS_CLASSES, path.status)

  return (
    <div className="border-border bg-card rounded-lg border">
      <div className="border-border flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-medium">{path.pathNumber}</span>
          <h3 className="text-lg font-semibold">{path.title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {onEdit && (
            <Button variant="ghost" size="sm" onClick={() => onEdit(path)}>
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => onDelete(path)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${severityClass ?? ''}`}
          >
            {severityLabelKey ? t(severityLabelKey) : String(path.severity)}
          </span>
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass ?? ''}`}
          >
            {statusLabelKey ? t(statusLabelKey) : String(path.status)}
          </span>
        </div>

        {path.description && (
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs font-medium uppercase">
              {t('fieldDescription')}
            </span>
            <p className="text-sm">{path.description}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs font-medium uppercase">
              {t('colAffectedAssets')}
            </span>
            <span className="text-lg font-semibold">{path.affectedAssets}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs font-medium uppercase">
              {t('colKillChain')}
            </span>
            <div className="flex items-center gap-2">
              <div className="bg-muted h-2 w-20 rounded-full">
                <div
                  className="bg-status-warning h-2 rounded-full"
                  style={{ width: `${path.killChainCoverage}%` }}
                />
              </div>
              <span className="font-mono text-sm">{path.killChainCoverage}%</span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs font-medium uppercase">
              {t('colDetected')}
            </span>
            <span className="text-sm">{formatDate(path.detectedAt)}</span>
          </div>
        </div>

        {path.mitreTechniques.length > 0 && (
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex w-full items-center justify-between">
              <span className="text-muted-foreground text-xs font-medium uppercase">
                {t('colMitre')}
              </span>
              <ChevronDown className="text-muted-foreground h-4 w-4 transition-transform data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="flex flex-wrap gap-1.5 pt-1.5">
                {path.mitreTechniques.map(tech => (
                  <Badge key={tech} variant="outline" className="font-mono text-xs">
                    {tech}
                  </Badge>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {path.stages && path.stages.length > 0 && (
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex w-full items-center justify-between">
              <span className="text-muted-foreground text-xs font-medium uppercase">
                {t('stagesVisualization')}
              </span>
              <ChevronDown className="text-muted-foreground h-4 w-4 transition-transform data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pt-1.5">
                <AttackPathVisualization stages={path.stages} t={t} />
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {path.linkedIncidentIds && path.linkedIncidentIds.length > 0 && (
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex w-full items-center justify-between">
              <span className="text-muted-foreground text-xs font-medium uppercase">
                {t('fieldLinkedIncidents')}
              </span>
              <ChevronDown className="text-muted-foreground h-4 w-4 transition-transform data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="flex flex-wrap gap-1.5 pt-1.5">
                {path.linkedIncidentIds.map(incident => (
                  <Badge key={incident} variant="secondary" className="text-xs">
                    {incident}
                  </Badge>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        <Separator />
        <AiFindingsPanel sourceModule="attack_paths" sourceEntityId={path.id} t={t} />
      </div>
    </div>
  )
}
