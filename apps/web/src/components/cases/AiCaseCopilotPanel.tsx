'use client'

import {
  Brain,
  ChevronDown,
  ClipboardList,
  Clock,
  FileText,
  Loader2,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
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
import type { AiCaseCopilotPanelProps, AiCaseCopilotResult } from '@/types'

function CopilotResultCard({
  result,
  t,
}: {
  result: AiCaseCopilotResult
  t: (key: string) => string
}) {
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

function CopilotActionButton({
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

export function AiCaseCopilotPanel({
  caseId: _caseId,
  canUseCopilot,
  results,
  activeTask,
  isLoading,
  onSummarize,
  onExecutiveSummary,
  onTimeline,
  onNextTasks,
  tCommon,
  t,
}: AiCaseCopilotPanelProps) {
  if (!canUseCopilot) {
    return null
  }

  const summarizeResult = results['summarize'] as AiCaseCopilotResult | undefined
  const executiveResult = results['executiveSummary'] as AiCaseCopilotResult | undefined
  const timelineResult = results['timeline'] as AiCaseCopilotResult | undefined
  const nextTasksResult = results['nextTasks'] as AiCaseCopilotResult | undefined

  return (
    <Collapsible defaultOpen>
      <div className="space-y-3">
        <CollapsibleTrigger className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="text-primary h-4 w-4" />
            <h4 className="text-sm font-semibold">{t('aiCopilot')}</h4>
          </div>
          <ChevronDown className="text-muted-foreground h-4 w-4 transition-transform [[data-state=open]_&]:rotate-180" />
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-xs">{t('aiCopilotDescription')}</p>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">{tCommon('aiConnector')}</span>
              <AiConnectorSelect />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <CopilotActionButton
              label={t('aiSummarize')}
              icon={<Brain className="h-3.5 w-3.5" />}
              isActive={activeTask === 'summarize'}
              isLoading={isLoading}
              hasResult={Boolean(summarizeResult)}
              onClick={onSummarize}
            />
            <CopilotActionButton
              label={t('aiExecutiveSummary')}
              icon={<FileText className="h-3.5 w-3.5" />}
              isActive={activeTask === 'executiveSummary'}
              isLoading={isLoading}
              hasResult={Boolean(executiveResult)}
              onClick={onExecutiveSummary}
            />
            <CopilotActionButton
              label={t('aiTimeline')}
              icon={<Clock className="h-3.5 w-3.5" />}
              isActive={activeTask === 'timeline'}
              isLoading={isLoading}
              hasResult={Boolean(timelineResult)}
              onClick={onTimeline}
            />
            <CopilotActionButton
              label={t('aiNextTasks')}
              icon={<ClipboardList className="h-3.5 w-3.5" />}
              isActive={activeTask === 'nextTasks'}
              isLoading={isLoading}
              hasResult={Boolean(nextTasksResult)}
              onClick={onNextTasks}
            />
          </div>

          {isLoading && activeTask && (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="text-primary h-4 w-4 animate-spin" />
              <span className="text-muted-foreground text-xs">{t('aiLoading')}</span>
            </div>
          )}

          {summarizeResult && (
            <>
              <Separator />
              <div className="space-y-1">
                <h5 className="text-xs font-semibold">{t('aiSummarize')}</h5>
                <CopilotResultCard result={summarizeResult} t={t} />
              </div>
            </>
          )}

          {executiveResult && (
            <>
              <Separator />
              <div className="space-y-1">
                <h5 className="text-xs font-semibold">{t('aiExecutiveSummary')}</h5>
                <CopilotResultCard result={executiveResult} t={t} />
              </div>
            </>
          )}

          {timelineResult && (
            <>
              <Separator />
              <div className="space-y-1">
                <h5 className="text-xs font-semibold">{t('aiTimeline')}</h5>
                <CopilotResultCard result={timelineResult} t={t} />
              </div>
            </>
          )}

          {nextTasksResult && (
            <>
              <Separator />
              <div className="space-y-1">
                <h5 className="text-xs font-semibold">{t('aiNextTasks')}</h5>
                <CopilotResultCard result={nextTasksResult} t={t} />
              </div>
            </>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
