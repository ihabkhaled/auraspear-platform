'use client'

import { ChevronDown, Loader2, RefreshCw, Settings2, Sparkles, Wand2 } from 'lucide-react'
import {
  Badge,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Separator,
  Textarea,
} from '@/components/ui'
import { AiConnectorSelect } from '@/components/common'
import { cn } from '@/lib/utils'
import type { AiDetectionCopilotPanelProps, AiDetectionCopilotResult } from '@/types'

function CopilotResultCard({
  result,
  t,
}: {
  result: AiDetectionCopilotResult
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
      <pre className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
        {result.result}
      </pre>
    </div>
  )
}

export function AiDetectionCopilotPanel({
  ruleId,
  canUseCopilot,
  results,
  activeTask,
  isLoading,
  draftDescription,
  onDraftDescriptionChange,
  onDraftRule,
  onTuning,
  tCommon,
  t,
}: AiDetectionCopilotPanelProps) {
  if (!canUseCopilot) {
    return null
  }

  const draftResult = results['draftRule'] as AiDetectionCopilotResult | undefined
  const tuningResult = results['tuning'] as AiDetectionCopilotResult | undefined

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

        <CollapsibleContent className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">{tCommon('aiConnector')}</span>
            <AiConnectorSelect />
          </div>

          {/* Draft Rule from Description */}
          <div className="space-y-2">
            <h5 className="text-xs font-semibold">{t('aiDraftRule')}</h5>
            <Textarea
              value={draftDescription}
              onChange={e => onDraftDescriptionChange(e.target.value)}
              placeholder={t('aiDraftDescription')}
              className="min-h-[80px] text-sm"
              disabled={isLoading}
            />
            <Button
              variant="secondary"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={onDraftRule}
              disabled={isLoading || !draftDescription.trim()}
            >
              {activeTask === 'draftRule' && isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Wand2 className="h-3.5 w-3.5" />
              )}
              <span>{t('aiGenerate')}</span>
              {draftResult && (
                <RefreshCw
                  className={cn(
                    'ms-auto h-3 w-3',
                    activeTask === 'draftRule' && isLoading && 'animate-spin'
                  )}
                />
              )}
            </Button>
          </div>

          {/* Tuning Suggestions */}
          {ruleId && (
            <div className="space-y-2">
              <h5 className="text-xs font-semibold">{t('aiTuning')}</h5>
              <Button
                variant={tuningResult ? 'outline' : 'secondary'}
                size="sm"
                className="w-full justify-start gap-2"
                onClick={onTuning}
                disabled={isLoading}
              >
                {activeTask === 'tuning' && isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Settings2 className="h-3.5 w-3.5" />
                )}
                <span>{t('aiTuning')}</span>
                {tuningResult && (
                  <RefreshCw
                    className={cn(
                      'ms-auto h-3 w-3',
                      activeTask === 'tuning' && isLoading && 'animate-spin'
                    )}
                  />
                )}
              </Button>
            </div>
          )}

          {isLoading && activeTask && (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="text-primary h-4 w-4 animate-spin" />
              <span className="text-muted-foreground text-xs">{t('aiLoading')}</span>
            </div>
          )}

          {draftResult && (
            <>
              <Separator />
              <div className="space-y-1">
                <h5 className="text-xs font-semibold">{t('aiDraftRule')}</h5>
                <CopilotResultCard result={draftResult} t={t} />
              </div>
            </>
          )}

          {tuningResult && (
            <>
              <Separator />
              <div className="space-y-1">
                <h5 className="text-xs font-semibold">{t('aiTuning')}</h5>
                <CopilotResultCard result={tuningResult} t={t} />
              </div>
            </>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
