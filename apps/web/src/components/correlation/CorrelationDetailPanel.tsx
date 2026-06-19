'use client'

import { ChevronDown, Edit, Trash2 } from 'lucide-react'
import {
  Badge,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui'
import { useCorrelationDetailPanel } from '@/hooks'
import {
  RULE_SOURCE_LABEL_KEYS,
  RULE_SOURCE_CLASSES,
  RULE_SEVERITY_LABEL_KEYS,
  RULE_SEVERITY_CLASSES,
  RULE_STATUS_LABEL_KEYS,
  RULE_STATUS_CLASSES,
} from '@/lib/constants/correlation'
import { lookup } from '@/lib/utils'
import type { CorrelationDetailPanelProps } from '@/types'

export function CorrelationDetailPanel({
  rule,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: CorrelationDetailPanelProps) {
  const {
    t,
    formattedCreatedAt,
    formattedUpdatedAt,
    formattedLastFiredAt,
    handleEdit,
    handleDelete,
  } = useCorrelationDetailPanel({ rule, open, onOpenChange, onEdit, onDelete })

  if (!rule) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{t('detailTitle')}</SheetTitle>
          <SheetDescription>{rule.ruleNumber}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Edit className="me-1 h-3.5 w-3.5" />
              {t('edit')}
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="me-1 h-3.5 w-3.5" />
              {t('delete')}
            </Button>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <p className="text-muted-foreground text-xs font-medium">{t('fieldTitle')}</p>
              <p className="text-sm font-medium">{rule.title}</p>
            </div>

            <div>
              <p className="text-muted-foreground text-xs font-medium">{t('fieldDescription')}</p>
              <p className="text-sm">{rule.description ?? '-'}</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-muted-foreground text-xs font-medium">{t('fieldSource')}</p>
                <span
                  className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${lookup(RULE_SOURCE_CLASSES, rule.source) ?? ''}`}
                >
                  {t(lookup(RULE_SOURCE_LABEL_KEYS, rule.source) as 'sourceSigma')}
                </span>
              </div>

              <div>
                <p className="text-muted-foreground text-xs font-medium">{t('fieldSeverity')}</p>
                <span
                  className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${lookup(RULE_SEVERITY_CLASSES, rule.severity) ?? ''}`}
                >
                  {t(lookup(RULE_SEVERITY_LABEL_KEYS, rule.severity) as 'severityCritical')}
                </span>
              </div>

              <div>
                <p className="text-muted-foreground text-xs font-medium">{t('fieldStatus')}</p>
                <span
                  className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${lookup(RULE_STATUS_CLASSES, rule.status) ?? ''}`}
                >
                  {t(lookup(RULE_STATUS_LABEL_KEYS, rule.status) as 'statusActive')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground text-xs font-medium">{t('detailHitCount')}</p>
                <p className="text-sm font-medium">{rule.hitCount}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium">
                  {t('detailLinkedIncidents')}
                </p>
                <p className="text-sm font-medium">{rule.linkedIncidents}</p>
              </div>
            </div>

            {rule.mitreTechniques.length > 0 && (
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex w-full items-center justify-between py-1">
                  <p className="text-sm font-semibold">{t('fieldMitreTechniques')}</p>
                  <ChevronDown className="text-muted-foreground h-4 w-4 transition-transform [[data-state=open]>&]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="flex flex-wrap gap-1 pt-2">
                    {rule.mitreTechniques.map(technique => (
                      <Badge key={technique} variant="outline" className="font-mono text-xs">
                        {technique}
                      </Badge>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {rule.mitreTactics.length > 0 && (
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex w-full items-center justify-between py-1">
                  <p className="text-sm font-semibold">{t('detailMitreTactics')}</p>
                  <ChevronDown className="text-muted-foreground h-4 w-4 transition-transform [[data-state=open]>&]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="flex flex-wrap gap-1 pt-2">
                    {rule.mitreTactics.map(tactic => (
                      <Badge key={tactic} variant="secondary" className="text-xs">
                        {tactic}
                      </Badge>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground text-xs font-medium">{t('detailCreatedBy')}</p>
                <p className="text-sm">{rule.createdByName ?? rule.createdBy}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium">{t('detailTenant')}</p>
                <p className="text-sm">{rule.tenantName}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-muted-foreground text-xs font-medium">{t('detailCreatedAt')}</p>
                <p className="text-sm">{formattedCreatedAt}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium">{t('detailUpdatedAt')}</p>
                <p className="text-sm">{formattedUpdatedAt}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium">{t('detailLastFired')}</p>
                <p className="text-sm">{formattedLastFiredAt}</p>
              </div>
            </div>

            {rule.yamlContent && (
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex w-full items-center justify-between py-1">
                  <p className="text-sm font-semibold">{t('fieldYamlContent')}</p>
                  <ChevronDown className="text-muted-foreground h-4 w-4 transition-transform [[data-state=open]>&]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <pre className="bg-muted mt-2 overflow-x-auto rounded-lg p-4 font-mono text-xs">
                    <code>{rule.yamlContent}</code>
                  </pre>
                </CollapsibleContent>
              </Collapsible>
            )}

            {rule.conditions && (
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex w-full items-center justify-between py-1">
                  <p className="text-sm font-semibold">{t('detailConditions')}</p>
                  <ChevronDown className="text-muted-foreground h-4 w-4 transition-transform [[data-state=open]>&]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <pre className="bg-muted mt-2 overflow-x-auto rounded-lg p-4 font-mono text-xs">
                    <code>{JSON.stringify(rule.conditions, null, 2)}</code>
                  </pre>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
