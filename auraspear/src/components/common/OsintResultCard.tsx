'use client'

import { ChevronDown, ExternalLink, Loader2, RefreshCw } from 'lucide-react'
import {
  Badge,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui'
import { useOsintResultCard } from '@/hooks'
import type { OsintResultCardProps } from '@/types'

export function OsintResultCard({
  result,
  t,
  fetchedData,
  isFetchingAnalysis,
  onFetchAnalysis,
}: OsintResultCardProps) {
  const { analysisUrl, hasAnalysisStub, displayData, vtSummary, vtGuiUrl } = useOsintResultCard(
    result,
    fetchedData
  )

  return (
    <div className="bg-muted rounded p-2 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-medium">{result.sourceName}</span>
        <div className="flex items-center gap-2">
          {vtGuiUrl && (
            <a
              href={vtGuiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-status-info inline-flex items-center gap-0.5 text-[10px] hover:underline"
            >
              <ExternalLink className="h-2.5 w-2.5" />
              {t('viewOnVirusTotal')}
            </a>
          )}
          <span className="text-muted-foreground text-[10px]">
            {String(result.responseTimeMs)}
            {t('osintMs')}
          </span>
          <Badge variant={result.success ? 'success' : 'destructive'} className="text-[10px]">
            {result.success ? t('osintOk') : t('osintFailed')}
          </Badge>
        </div>
      </div>

      {hasAnalysisStub && onFetchAnalysis && (
        <div className="mt-1 flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-5 text-[10px]"
            onClick={() => {
              if (analysisUrl) {
                onFetchAnalysis(analysisUrl, result.sourceId)
              }
            }}
            disabled={isFetchingAnalysis}
          >
            {isFetchingAnalysis ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="mr-1 h-3 w-3" />
            )}
            {isFetchingAnalysis ? t('fetchingResults') : t('fetchAnalysisResults')}
          </Button>
        </div>
      )}

      {result.success && vtSummary && (
        <div className="mt-1.5 space-y-1">
          <div className="flex flex-wrap gap-1">
            {vtSummary.malicious > 0 && (
              <Badge variant="destructive" className="text-[10px]">
                {String(vtSummary.malicious)} {t('osintMalicious')}
              </Badge>
            )}
            {vtSummary.suspicious > 0 && (
              <Badge variant="warning" className="text-[10px]">
                {String(vtSummary.suspicious)} {t('osintSuspicious')}
              </Badge>
            )}
            <Badge variant="success" className="text-[10px]">
              {String(vtSummary.harmless)} {t('osintClean')}
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              {String(vtSummary.undetected)} {t('osintUndetected')}
            </Badge>
            <span className="text-muted-foreground text-[10px]">
              / {String(vtSummary.total)} {t('osintEngines')}
            </span>
          </div>

          {vtSummary.reputation !== null && (
            <p className="text-muted-foreground text-[10px]">
              {t('osintReputation')}: {String(vtSummary.reputation)}
            </p>
          )}

          {vtSummary.tags.length > 0 && (
            <div className="flex flex-wrap gap-0.5">
              {vtSummary.tags.map(tag => (
                <Badge key={tag} variant="outline" className="text-[9px]">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {vtSummary.whois && (
            <Collapsible>
              <CollapsibleTrigger className="text-muted-foreground flex items-center gap-1 text-[10px] hover:underline">
                <ChevronDown className="h-2.5 w-2.5" />
                WHOIS
              </CollapsibleTrigger>
              <CollapsibleContent>
                <pre className="text-muted-foreground mt-0.5 max-h-16 overflow-auto text-[9px]">
                  {vtSummary.whois}
                </pre>
              </CollapsibleContent>
            </Collapsible>
          )}

          <Collapsible>
            <CollapsibleTrigger className="text-muted-foreground flex items-center gap-1 text-[10px] hover:underline">
              <ChevronDown className="h-2.5 w-2.5" />
              {t('osintRawData')}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <pre className="text-muted-foreground mt-0.5 max-h-60 overflow-auto rounded bg-black/20 p-1.5 text-[9px]">
                {JSON.stringify(displayData, null, 2)}
              </pre>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {result.success && !vtSummary && displayData !== null && displayData !== undefined && (
        <pre className="text-muted-foreground mt-1 max-h-60 overflow-auto rounded bg-black/20 p-1.5 text-[10px]">
          {typeof displayData === 'string' ? displayData : JSON.stringify(displayData, null, 2)}
        </pre>
      )}

      {Boolean(!result.success && result.error) && (
        <p className="text-status-error mt-1 text-[10px]">{result.error}</p>
      )}
    </div>
  )
}
