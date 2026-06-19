'use client'

import { ChevronDown, Pencil, Power, Trash2 } from 'lucide-react'
import { AiFindingsPanel } from '@/components/common'
import { AiDetectionCopilotPanel } from '@/components/detection-rules/AiDetectionCopilotPanel'
import {
  Badge,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui'
import { useDetectionRuleDetailPanel } from '@/hooks'
import {
  DETECTION_RULE_SEVERITY_CLASSES,
  DETECTION_RULE_SEVERITY_LABEL_KEYS,
  DETECTION_RULE_STATUS_CLASSES,
  DETECTION_RULE_STATUS_LABEL_KEYS,
  DETECTION_RULE_TYPE_LABEL_KEYS,
} from '@/lib/constants/detection-rules'
import { cn, formatTimestamp, lookup } from '@/lib/utils'
import type { DetectionRuleDetailPanelProps } from '@/types'

export function DetectionRuleDetailPanel({
  rule,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onToggle,
  deleteLoading,
  toggleLoading,
}: DetectionRuleDetailPanelProps) {
  const { t, tCommon, hasData, aiCopilot } = useDetectionRuleDetailPanel({ rule })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{t('detailTitle')}</SheetTitle>
          <SheetDescription>{t('detailDescription')}</SheetDescription>
        </SheetHeader>

        {hasData && rule && (
          <div className="space-y-6">
            {(onEdit ?? onDelete ?? onToggle) && (
              <div className="flex items-center gap-2">
                {onToggle && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={toggleLoading}
                    onClick={() => onToggle(rule)}
                  >
                    <Power className="mr-1.5 h-3.5 w-3.5" />
                    {rule.status === 'disabled' ? t('actions.enable') : t('actions.disable')}
                  </Button>
                )}
                {onEdit && (
                  <Button variant="outline" size="sm" onClick={() => onEdit(rule)}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    {t('editRule')}
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={deleteLoading}
                    onClick={() => onDelete(rule)}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    {t('actions.delete')}
                  </Button>
                )}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">{t('fieldRuleName')}</span>
                <span className="text-foreground text-sm font-medium">{rule.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">{t('fieldRuleType')}</span>
                <Badge variant="secondary">
                  {t(lookup(DETECTION_RULE_TYPE_LABEL_KEYS, rule.ruleType))}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">{tCommon('severity')}</span>
                <span
                  className={cn(
                    'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                    lookup(DETECTION_RULE_SEVERITY_CLASSES, rule.severity)
                  )}
                >
                  {t(lookup(DETECTION_RULE_SEVERITY_LABEL_KEYS, rule.severity))}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">{tCommon('status')}</span>
                <span
                  className={cn(
                    'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                    lookup(DETECTION_RULE_STATUS_CLASSES, rule.status)
                  )}
                >
                  {t(lookup(DETECTION_RULE_STATUS_LABEL_KEYS, rule.status))}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">{t('columnMatches')}</span>
                <span className="text-foreground text-sm font-medium">
                  {rule.hitCount.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">{t('columnFalsePositives')}</span>
                <span className="text-foreground text-sm font-medium">
                  {rule.falsePositiveCount.toLocaleString()}
                </span>
              </div>
              {rule.description && (
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-sm">{tCommon('description')}</span>
                  <p className="bg-muted text-foreground rounded-md p-2 text-sm">
                    {rule.description}
                  </p>
                </div>
              )}
            </div>

            <Collapsible defaultOpen>
              <CollapsibleTrigger className="flex w-full items-center justify-between py-2">
                <span className="text-foreground text-sm font-semibold">
                  {t('fieldConditions')}
                </span>
                <ChevronDown className="text-muted-foreground h-4 w-4 transition-transform [[data-state=open]>&]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <pre className="bg-muted text-foreground overflow-auto rounded-md p-3 font-mono text-xs">
                  {JSON.stringify(rule.conditions, null, 2)}
                </pre>
              </CollapsibleContent>
            </Collapsible>

            <Collapsible defaultOpen>
              <CollapsibleTrigger className="flex w-full items-center justify-between py-2">
                <span className="text-foreground text-sm font-semibold">{t('fieldActions')}</span>
                <ChevronDown className="text-muted-foreground h-4 w-4 transition-transform [[data-state=open]>&]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <pre className="bg-muted text-foreground overflow-auto rounded-md p-3 font-mono text-xs">
                  {JSON.stringify(rule.actions, null, 2)}
                </pre>
              </CollapsibleContent>
            </Collapsible>

            <div className="space-y-3">
              {rule.lastTriggeredAt && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">{t('lastTriggered')}</span>
                  <span className="text-foreground text-sm">
                    {formatTimestamp(rule.lastTriggeredAt)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">{t('createdAt')}</span>
                <span className="text-foreground text-sm">{formatTimestamp(rule.createdAt)}</span>
              </div>
            </div>

            <Separator />

            <AiDetectionCopilotPanel
              ruleId={rule.id}
              canUseCopilot={aiCopilot.canUseCopilot}
              results={aiCopilot.results}
              activeTask={aiCopilot.activeTask}
              isLoading={aiCopilot.isLoading}
              draftDescription={aiCopilot.draftDescription}
              onDraftDescriptionChange={aiCopilot.setDraftDescription}
              onDraftRule={aiCopilot.handleDraftRule}
              onTuning={aiCopilot.handleTuning}
              tCommon={aiCopilot.tCommon}
              t={aiCopilot.t}
            />

            <Separator />
            <AiFindingsPanel sourceModule="detection_rules" sourceEntityId={rule.id} t={tCommon} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
