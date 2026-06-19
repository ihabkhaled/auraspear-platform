'use client'

import { ChevronDown, Loader2, Sparkles } from 'lucide-react'
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
import type { AiSoarPanelProps, AiSoarResult } from '@/types'

function SoarResultCard({ result, t }: { result: AiSoarResult; t: (key: string) => string }) {
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

export function AiSoarPanel({
  canUseCopilot,
  description,
  onDescriptionChange,
  isLoading,
  draftResult,
  onDraftPlaybook,
  tCommon,
  t,
}: AiSoarPanelProps) {
  if (!canUseCopilot) {
    return null
  }

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

          <Textarea
            placeholder={t('aiDraftDescription')}
            value={description}
            onChange={e => onDescriptionChange(e.target.value)}
            rows={3}
            className="resize-none"
          />

          <Button
            variant="secondary"
            size="sm"
            className="w-full gap-2"
            onClick={onDraftPlaybook}
            disabled={isLoading || description.trim().length === 0}
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {isLoading ? t('aiDraftLoading') : t('aiDraftPlaybook')}
          </Button>

          {draftResult && (
            <>
              <Separator />
              <div className="space-y-1">
                <h5 className="text-xs font-semibold">{t('aiDraftPlaybook')}</h5>
                <SoarResultCard result={draftResult} t={t} />
              </div>
            </>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
