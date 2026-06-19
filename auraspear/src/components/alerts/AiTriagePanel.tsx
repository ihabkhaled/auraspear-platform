'use client'

import { Brain, ChevronDown, Loader2, RefreshCw, Shield, Sparkles, Target } from 'lucide-react'
import {
  Badge,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Separator,
} from '@/components/ui'
import { AiConnectorSelect } from '@/components/common'
import { cn } from '@/lib/utils'
import type { AiTriagePanelProps, AiTriageResult } from '@/types'

function TriageResultCard({ result, t }: { result: AiTriageResult; t: (key: string) => string }) {
  return (
    <div className="bg-muted/50 space-y-2 rounded-lg p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="text-xs">
          {`${t('aiConfidence')}: ${result.confidence}%`}
        </Badge>
        <Badge variant="secondary" className="text-xs">
          {result.provider ?? result.model}
        </Badge>
      </div>
      <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">{result.result}</p>
    </div>
  )
}

function TriageActionButton({
  label,
  icon,
  isActive,
  isLoading,
  hasResult,
  onClick,
}: {
  label: string
  icon: React.ReactNode
  isActive: boolean
  isLoading: boolean
  hasResult: boolean
  onClick: () => void
}) {
  return (
    <Button
      variant={hasResult ? 'outline' : 'secondary'}
      size="sm"
      className="w-full justify-start gap-2"
      onClick={onClick}
      disabled={isLoading}
    >
      {isActive && isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
      <span className="truncate">{label}</span>
      {hasResult && (
        <RefreshCw className={cn('ms-auto h-3 w-3', isActive && isLoading && 'animate-spin')} />
      )}
    </Button>
  )
}

export function AiTriagePanel({
  alertId: _alertId,
  canTriage,
  results,
  activeTask,
  isLoading,
  onSummarize,
  onExplainSeverity,
  onFalsePositiveScore,
  onNextAction,
  tCommon,
  t,
}: AiTriagePanelProps) {
  if (!canTriage) {
    return null
  }

  const summarizeResult = results['summarize'] as AiTriageResult | undefined
  const explainResult = results['explainSeverity'] as AiTriageResult | undefined
  const fpResult = results['falsePositiveScore'] as AiTriageResult | undefined
  const nextActionResult = results['nextAction'] as AiTriageResult | undefined

  return (
    <Collapsible defaultOpen>
      <div className="space-y-3">
        <CollapsibleTrigger className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="text-primary h-4 w-4" />
            <h4 className="text-sm font-semibold">{t('aiTriage')}</h4>
          </div>
          <ChevronDown className="text-muted-foreground h-4 w-4 transition-transform [[data-state=open]_&]:rotate-180" />
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-xs">{t('aiTriageDescription')}</p>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">{tCommon('aiConnector')}</span>
              <AiConnectorSelect />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <TriageActionButton
              label={t('aiSummarize')}
              icon={<Brain className="h-3.5 w-3.5" />}
              isActive={activeTask === 'summarize'}
              isLoading={isLoading}
              hasResult={Boolean(summarizeResult)}
              onClick={onSummarize}
            />
            <TriageActionButton
              label={t('aiExplainSeverity')}
              icon={<Shield className="h-3.5 w-3.5" />}
              isActive={activeTask === 'explainSeverity'}
              isLoading={isLoading}
              hasResult={Boolean(explainResult)}
              onClick={onExplainSeverity}
            />
            <TriageActionButton
              label={t('aiFalsePositiveScore')}
              icon={<Target className="h-3.5 w-3.5" />}
              isActive={activeTask === 'falsePositiveScore'}
              isLoading={isLoading}
              hasResult={Boolean(fpResult)}
              onClick={onFalsePositiveScore}
            />
            <TriageActionButton
              label={t('aiNextAction')}
              icon={<Sparkles className="h-3.5 w-3.5" />}
              isActive={activeTask === 'nextAction'}
              isLoading={isLoading}
              hasResult={Boolean(nextActionResult)}
              onClick={onNextAction}
            />
          </div>

          {isLoading && activeTask && (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="text-primary h-4 w-4 animate-spin" />
              <span className="text-muted-foreground text-xs">{t('aiTriageLoading')}</span>
            </div>
          )}

          {summarizeResult && (
            <>
              <Separator />
              <div className="space-y-1">
                <h5 className="text-xs font-semibold">{t('aiSummarize')}</h5>
                <TriageResultCard result={summarizeResult} t={t} />
              </div>
            </>
          )}

          {explainResult && (
            <>
              <Separator />
              <div className="space-y-1">
                <h5 className="text-xs font-semibold">{t('aiExplainSeverity')}</h5>
                <TriageResultCard result={explainResult} t={t} />
              </div>
            </>
          )}

          {fpResult && (
            <>
              <Separator />
              <div className="space-y-1">
                <h5 className="text-xs font-semibold">{t('aiFalsePositiveScore')}</h5>
                <TriageResultCard result={fpResult} t={t} />
              </div>
            </>
          )}

          {nextActionResult && (
            <>
              <Separator />
              <div className="space-y-1">
                <h5 className="text-xs font-semibold">{t('aiNextAction')}</h5>
                <TriageResultCard result={nextActionResult} t={t} />
              </div>
            </>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
