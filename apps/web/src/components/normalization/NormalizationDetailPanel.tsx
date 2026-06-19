'use client'

import { Bot, ChevronDown, Edit, Trash2 } from 'lucide-react'
import { AiFindingsPanel } from '@/components/common'
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
import { useNormalizationDetailPanel } from '@/hooks'
import {
  NORMALIZATION_PIPELINE_STATUS_CLASSES,
  NORMALIZATION_PIPELINE_STATUS_LABEL_KEYS,
  NORMALIZATION_SOURCE_TYPE_LABEL_KEYS,
} from '@/lib/constants/normalization'
import { cn, formatTimestamp, lookup } from '@/lib/utils'
import type { NormalizationDetailPanelProps } from '@/types'

export function NormalizationDetailPanel({
  pipeline,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onAiVerify,
  aiVerifying,
}: NormalizationDetailPanelProps) {
  const {
    t,
    tCommon,
    hasData,
    handleEdit,
    handleDelete,
    handleAiVerify,
    hasEditAction,
    hasDeleteAction,
    hasAiVerifyAction,
    aiVerifying: isVerifying,
  } = useNormalizationDetailPanel({ pipeline, onEdit, onDelete, onAiVerify, aiVerifying })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{t('detailTitle')}</SheetTitle>
          <SheetDescription>{t('detailDescription')}</SheetDescription>
        </SheetHeader>

        {hasData && pipeline && (hasEditAction || hasDeleteAction || hasAiVerifyAction) && (
          <div className="flex items-center gap-2">
            {hasAiVerifyAction && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAiVerify}
                disabled={isVerifying}
                className="gap-1.5"
              >
                <Bot className="h-3.5 w-3.5" />
                {isVerifying ? t('aiVerifying') : t('aiVerify')}
              </Button>
            )}
            {hasEditAction && (
              <Button variant="outline" size="sm" onClick={handleEdit} className="gap-1.5">
                <Edit className="h-3.5 w-3.5" />
                {tCommon('edit')}
              </Button>
            )}
            {hasDeleteAction && (
              <Button variant="destructive" size="sm" onClick={handleDelete} className="gap-1.5">
                <Trash2 className="h-3.5 w-3.5" />
                {tCommon('delete')}
              </Button>
            )}
          </div>
        )}

        {hasData && pipeline && (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">{t('fieldPipelineName')}</span>
                <span className="text-foreground text-sm font-medium">{pipeline.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">{t('fieldSourceType')}</span>
                <Badge variant="secondary">
                  {t(lookup(NORMALIZATION_SOURCE_TYPE_LABEL_KEYS, pipeline.sourceType))}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">{tCommon('status')}</span>
                <span
                  className={cn(
                    'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                    lookup(NORMALIZATION_PIPELINE_STATUS_CLASSES, pipeline.status)
                  )}
                >
                  {t(lookup(NORMALIZATION_PIPELINE_STATUS_LABEL_KEYS, pipeline.status))}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">{t('columnEventsProcessed')}</span>
                <span className="text-foreground text-sm font-medium">
                  {pipeline.processedCount.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">{t('columnErrorRate')}</span>
                <span className="text-foreground text-sm font-medium">
                  {pipeline.errorCount.toLocaleString()}
                </span>
              </div>
              {pipeline.description && (
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-sm">{tCommon('description')}</span>
                  <p className="bg-muted text-foreground rounded-md p-2 text-sm">
                    {pipeline.description}
                  </p>
                </div>
              )}
              {pipeline.lastProcessedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">{t('lastRun')}</span>
                  <span className="text-foreground text-sm">
                    {formatTimestamp(pipeline.lastProcessedAt)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">{t('createdAt')}</span>
                <span className="text-foreground text-sm">
                  {formatTimestamp(pipeline.createdAt)}
                </span>
              </div>
            </div>

            <Collapsible defaultOpen>
              <CollapsibleTrigger className="flex w-full items-center justify-between py-2">
                <span className="text-sm font-semibold">{t('fieldParserConfig')}</span>
                <ChevronDown className="text-muted-foreground h-4 w-4 transition-transform [[data-state=open]>&]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <pre className="bg-muted text-foreground overflow-x-auto rounded-md p-3 font-mono text-xs">
                  {JSON.stringify(pipeline.parserConfig, null, 2)}
                </pre>
              </CollapsibleContent>
            </Collapsible>

            <Collapsible defaultOpen>
              <CollapsibleTrigger className="flex w-full items-center justify-between py-2">
                <span className="text-sm font-semibold">{t('fieldFieldMappings')}</span>
                <ChevronDown className="text-muted-foreground h-4 w-4 transition-transform [[data-state=open]>&]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <pre className="bg-muted text-foreground overflow-x-auto rounded-md p-3 font-mono text-xs">
                  {JSON.stringify(pipeline.fieldMappings, null, 2)}
                </pre>
              </CollapsibleContent>
            </Collapsible>

            <Separator />
            <AiFindingsPanel
              sourceModule="normalization"
              sourceEntityId={pipeline.id}
              t={tCommon}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
