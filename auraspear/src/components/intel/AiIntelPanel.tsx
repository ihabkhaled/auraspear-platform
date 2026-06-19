'use client'

import { ChevronDown, Loader2, RefreshCw, Search, Sparkles, FileText } from 'lucide-react'
import {
  Badge,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Separator,
} from '@/components/ui'
import { AiConnectorSelect } from '@/components/common'
import type { AiIntelPanelProps, AiIntelResult } from '@/types'

function IntelResultCard({ result, t }: { result: AiIntelResult; t: (key: string) => string }) {
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

export function AiIntelPanel({
  canEnrich,
  activeTask,
  isLoading,
  enrichResult,
  advisoryResult,
  selectedIocId,
  selectedIocIds,
  onEnrichIoc,
  onDraftAdvisory,
  tCommon,
  t,
}: AiIntelPanelProps) {
  if (!canEnrich) {
    return null
  }

  return (
    <Collapsible defaultOpen>
      <div className="space-y-3">
        <CollapsibleTrigger className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="text-primary h-4 w-4" />
            <h4 className="text-sm font-semibold">{t('aiEnrich')}</h4>
          </div>
          <ChevronDown className="text-muted-foreground h-4 w-4 transition-transform [[data-state=open]_&]:rotate-180" />
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-xs">{t('aiEnrichDescription')}</p>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">{tCommon('aiConnector')}</span>
              <AiConnectorSelect />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              variant={enrichResult ? 'outline' : 'secondary'}
              size="sm"
              className="w-full justify-start gap-2"
              onClick={() => (selectedIocId ? onEnrichIoc(selectedIocId) : undefined)}
              disabled={isLoading || !selectedIocId}
            >
              {activeTask === 'enrich' && isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Search className="h-3.5 w-3.5" />
              )}
              <span className="truncate">{t('aiEnrichIoc')}</span>
              {enrichResult && <RefreshCw className="ms-auto h-3 w-3" />}
            </Button>
            <Button
              variant={advisoryResult ? 'outline' : 'secondary'}
              size="sm"
              className="w-full justify-start gap-2"
              onClick={() =>
                selectedIocIds && selectedIocIds.length > 0
                  ? onDraftAdvisory(selectedIocIds)
                  : undefined
              }
              disabled={isLoading || !selectedIocIds || selectedIocIds.length === 0}
            >
              {activeTask === 'advisory' && isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileText className="h-3.5 w-3.5" />
              )}
              <span className="truncate">{t('aiDraftAdvisory')}</span>
              {advisoryResult && <RefreshCw className="ms-auto h-3 w-3" />}
            </Button>
          </div>

          {isLoading && activeTask && (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="text-primary h-4 w-4 animate-spin" />
              <span className="text-muted-foreground text-xs">{t('aiLoading')}</span>
            </div>
          )}

          {enrichResult && (
            <>
              <Separator />
              <div className="space-y-1">
                <h5 className="text-xs font-semibold">{t('aiEnrichIoc')}</h5>
                <IntelResultCard result={enrichResult} t={t} />
              </div>
            </>
          )}

          {advisoryResult && (
            <>
              <Separator />
              <div className="space-y-1">
                <h5 className="text-xs font-semibold">{t('aiDraftAdvisory')}</h5>
                <IntelResultCard result={advisoryResult} t={t} />
              </div>
            </>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
