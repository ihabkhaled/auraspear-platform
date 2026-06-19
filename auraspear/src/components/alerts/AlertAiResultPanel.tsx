'use client'

import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Loader2,
  Play,
  Shield,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import {
  Badge,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Separator,
} from '@/components/ui'
import { AlertAiStatus } from '@/enums'
import { resolveFindingConfidenceVariant } from '@/lib/ai-config.utils'
import { formatTimestamp } from '@/lib/utils'
import type { AlertAiResultPanelProps } from '@/types'

function ConfidenceBadge({ confidence, t }: { confidence: number; t: (key: string) => string }) {
  return (
    <Badge variant={resolveFindingConfidenceVariant(confidence)} className="text-xs">
      <TrendingUp className="me-1 h-3 w-3" />
      {`${confidence}% ${t('ai.aiConfidence')}`}
    </Badge>
  )
}

function StatusBadge({ status, t }: { status: string; t: (key: string) => string }) {
  switch (status) {
    case AlertAiStatus.COMPLETED:
      return (
        <Badge variant="success" className="text-xs">
          <CheckCircle2 className="me-1 h-3 w-3" />
          {t('ai.aiStatusCompleted')}
        </Badge>
      )
    case AlertAiStatus.RUNNING:
      return (
        <Badge variant="info" className="text-xs">
          <Loader2 className="me-1 h-3 w-3 animate-spin" />
          {t('ai.aiStatusRunning')}
        </Badge>
      )
    case AlertAiStatus.FAILED:
      return (
        <Badge variant="destructive" className="text-xs">
          <AlertCircle className="me-1 h-3 w-3" />
          {t('ai.aiStatusFailed')}
        </Badge>
      )
    case AlertAiStatus.PENDING:
      return (
        <Badge variant="pending" className="text-xs">
          <Clock className="me-1 h-3 w-3" />
          {t('ai.aiStatusPending')}
        </Badge>
      )
    default:
      return null
  }
}

export function AlertAiResultPanel({
  aiResult,
  isLoading,
  onRunTriage,
  t,
}: AlertAiResultPanelProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4">
        <Loader2 className="text-primary h-4 w-4 animate-spin" />
        <span className="text-muted-foreground text-xs">{t('ai.aiStatusRunning')}</span>
      </div>
    )
  }

  if (!aiResult) {
    return (
      <div className="bg-muted/50 flex flex-col items-center gap-3 rounded-lg p-4">
        <Sparkles className="text-muted-foreground h-6 w-6" />
        <p className="text-muted-foreground text-sm">{t('ai.noAiAnalysis')}</p>
        {onRunTriage && (
          <Button variant="outline" size="sm" onClick={onRunTriage}>
            <Play className="me-1 h-3.5 w-3.5" />
            {t('ai.runAiTriage')}
          </Button>
        )}
      </div>
    )
  }

  return (
    <Collapsible defaultOpen>
      <div className="space-y-3">
        <CollapsibleTrigger className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="text-primary h-4 w-4" />
            <h4 className="text-sm font-semibold">{t('ai.aiAnalysis')}</h4>
          </div>
          <ChevronDown className="text-muted-foreground h-4 w-4 transition-transform [[data-state=open]_&]:rotate-180" />
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {aiResult.aiStatus && <StatusBadge status={aiResult.aiStatus} t={t} />}
            {aiResult.aiConfidence !== null && (
              <ConfidenceBadge confidence={aiResult.aiConfidence} t={t} />
            )}
          </div>

          {aiResult.aiSummary && (
            <>
              <Separator />
              <div className="space-y-1">
                <h5 className="text-muted-foreground text-xs font-medium">{t('ai.aiSummary')}</h5>
                <div className="bg-muted/50 rounded-lg border p-3">
                  <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
                    {aiResult.aiSummary}
                  </p>
                </div>
              </div>
            </>
          )}

          {aiResult.aiSeveritySuggestion && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs font-medium">
                  {t('ai.aiSeveritySuggestion')}
                </span>
                <Badge variant="outline" className="text-xs capitalize">
                  <Shield className="me-1 h-3 w-3" />
                  {aiResult.aiSeveritySuggestion}
                </Badge>
              </div>
            </>
          )}

          {aiResult.aiEscalationSuggestion && (
            <>
              <Separator />
              <div className="space-y-1">
                <h5 className="text-muted-foreground text-xs font-medium">
                  {t('ai.aiEscalation')}
                </h5>
                <p className="text-foreground text-sm">{aiResult.aiEscalationSuggestion}</p>
              </div>
            </>
          )}

          {aiResult.aiLastRunAt && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs font-medium">
                  {t('ai.aiLastRun')}
                </span>
                <span className="text-muted-foreground text-xs">
                  {formatTimestamp(aiResult.aiLastRunAt)}
                </span>
              </div>
            </>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
