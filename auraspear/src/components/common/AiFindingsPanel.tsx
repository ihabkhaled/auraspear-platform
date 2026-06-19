'use client'

import { ChevronDown, Loader2, Sparkles, TrendingUp } from 'lucide-react'
import {
  Badge,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Separator,
} from '@/components/ui'
import { useAiFindingsPanel } from '@/hooks'
import {
  resolveFindingConfidenceVariant,
  resolveFindingSeverityVariant,
  resolveFindingStatusVariant,
} from '@/lib/ai-config.utils'
import { formatTimestamp, cn } from '@/lib/utils'
import type { AiExecutionFinding, AiFindingsPanelProps } from '@/types'

function FindingConfidenceBadge({ score }: { score: number }) {
  return (
    <Badge variant={resolveFindingConfidenceVariant(score)} className="text-xs">
      <TrendingUp className="me-1 h-3 w-3" />
      {`${score}%`}
    </Badge>
  )
}

function FindingSeverityBadge({ severity }: { severity: string }) {
  return (
    <Badge variant={resolveFindingSeverityVariant(severity)} className="text-xs capitalize">
      {severity}
    </Badge>
  )
}

function FindingStatusBadge({ status }: { status: string }) {
  const variant = resolveFindingStatusVariant(status)
  return (
    <Badge variant={variant} className="text-xs capitalize">
      {status}
    </Badge>
  )
}

function FindingItem({
  finding,
  isExpanded,
  onToggle,
  t,
}: {
  finding: AiExecutionFinding
  isExpanded: boolean
  onToggle: () => void
  t: (key: string) => string
}) {
  return (
    <div className="bg-muted/30 rounded-lg border p-3">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-2 text-start"
        onClick={onToggle}
      >
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-medium">{finding.title}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {finding.confidenceScore !== null && (
              <FindingConfidenceBadge score={finding.confidenceScore} />
            )}
            {finding.severity && <FindingSeverityBadge severity={finding.severity} />}
            <FindingStatusBadge status={finding.status} />
          </div>
        </div>
        <ChevronDown
          className={cn(
            'text-muted-foreground h-4 w-4 shrink-0 transition-transform',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-3">
          <Separator />
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs font-medium">{t('aiFindings.summary')}</p>
            <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
              {finding.summary}
            </p>
          </div>

          {finding.recommendedAction && (
            <>
              <Separator />
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs font-medium">
                  {t('aiFindings.recommendedAction')}
                </p>
                <p className="text-foreground text-sm">{finding.recommendedAction}</p>
              </div>
            </>
          )}

          {finding.evidenceJson !== null && finding.evidenceJson !== undefined && (
            <>
              <Separator />
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs font-medium">
                  {t('aiFindings.evidence')}
                </p>
                <pre className="bg-muted max-h-48 overflow-auto rounded-lg p-3 font-mono text-xs">
                  {JSON.stringify(finding.evidenceJson, null, 2)}
                </pre>
              </div>
            </>
          )}

          {finding.appliedAt && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs font-medium">
                  {t('aiFindings.appliedAt')}
                </span>
                <span className="text-muted-foreground text-xs">
                  {formatTimestamp(finding.appliedAt)}
                </span>
              </div>
            </>
          )}

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium">{t('createdAt')}</span>
            <span className="text-muted-foreground text-xs">
              {formatTimestamp(finding.createdAt)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export function AiFindingsPanel({ sourceModule, sourceEntityId, t }: AiFindingsPanelProps) {
  const { findings, isLoading, expandedId, toggleExpanded, count } = useAiFindingsPanel(
    sourceModule,
    sourceEntityId
  )

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4">
        <Loader2 className="text-primary h-4 w-4 animate-spin" />
        <span className="text-muted-foreground text-xs">{t('loading')}</span>
      </div>
    )
  }

  return (
    <Collapsible defaultOpen>
      <div className="space-y-3">
        <CollapsibleTrigger className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="text-primary h-4 w-4" />
            <h4 className="text-sm font-semibold">{t('aiFindings.title')}</h4>
            {count > 0 && (
              <Badge variant="secondary" className="text-xs">
                {count}
              </Badge>
            )}
          </div>
          <ChevronDown className="text-muted-foreground h-4 w-4 transition-transform [[data-state=open]_&]:rotate-180" />
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-2">
          {count === 0 ? (
            <div className="bg-muted/50 flex flex-col items-center gap-2 rounded-lg p-4">
              <Sparkles className="text-muted-foreground h-5 w-5" />
              <p className="text-muted-foreground text-sm">{t('aiFindings.noFindings')}</p>
            </div>
          ) : (
            findings.map(finding => (
              <FindingItem
                key={finding.id}
                finding={finding}
                isExpanded={expandedId === finding.id}
                onToggle={() => toggleExpanded(finding.id)}
                t={t}
              />
            ))
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
