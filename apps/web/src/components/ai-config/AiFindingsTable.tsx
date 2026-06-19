'use client'

import { memo } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { LoadingSpinner } from '@/components/common'
import {
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { useAiFindingsTab } from '@/hooks'
import {
  resolveFindingConfidenceVariant,
  resolveFindingSeverityVariant,
} from '@/lib/ai-config.utils'
import { formatDate, cn } from '@/lib/utils'
import type { AiExecutionFinding } from '@/types'

const FindingRow = memo(
  ({
    finding,
    isExpanded,
    onToggle,
    t,
  }: {
    finding: AiExecutionFinding
    isExpanded: boolean
    onToggle: () => void
    t: (key: string) => string
  }) => (
    <div className="border-border bg-card rounded-lg border">
      <button
        type="button"
        className="flex w-full items-start gap-3 p-3 text-start"
        onClick={onToggle}
      >
        <ChevronDown
          className={cn(
            'text-muted-foreground mt-0.5 h-4 w-4 shrink-0 transition-transform',
            isExpanded && 'rotate-180'
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              {finding.agentId}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {finding.sourceModule}
            </Badge>
            {finding.confidenceScore !== null && (
              <Badge
                variant={resolveFindingConfidenceVariant(finding.confidenceScore)}
                className="text-xs"
              >
                {`${String(finding.confidenceScore)}%`}
              </Badge>
            )}
            {finding.severity && (
              <Badge
                variant={resolveFindingSeverityVariant(finding.severity)}
                className="text-xs capitalize"
              >
                {finding.severity}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm font-medium">{finding.title}</p>
          <p className="text-muted-foreground mt-0.5 text-xs">{formatDate(finding.createdAt)}</p>
        </div>
      </button>

      {isExpanded && (
        <div className="border-border border-t px-3 pt-2 pb-3">
          <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
            {t('aiFindings.summary')}
          </p>
          <div className="bg-muted/50 max-h-96 overflow-auto rounded-lg p-3">
            <pre className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
              {finding.summary}
            </pre>
          </div>
          {finding.recommendedAction && (
            <div className="mt-2">
              <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                {t('aiFindings.recommendedAction')}
              </p>
              <p className="text-foreground text-sm">{finding.recommendedAction}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
)

FindingRow.displayName = 'FindingRow'

export function AiFindingsTable({ t }: { t: (key: string) => string }) {
  const {
    findings,
    pagination,
    isLoading,
    page,
    setPage,
    agentFilter,
    handleAgentFilterChange,
    moduleFilter,
    handleModuleFilterChange,
    expandedId,
    toggleExpanded,
  } = useAiFindingsTab()

  const uniqueAgents = [...new Set(findings.map(f => f.agentId))].sort()
  const uniqueModules = [...new Set(findings.map(f => f.sourceModule))].sort()

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={agentFilter || 'all'} onValueChange={handleAgentFilterChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t('aiFindings.filterAgent')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('aiFindings.allAgents')}</SelectItem>
            {uniqueAgents.map(a => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={moduleFilter || 'all'} onValueChange={handleModuleFilterChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t('aiFindings.filterModule')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('aiFindings.allModules')}</SelectItem>
            {uniqueModules.map(m => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {pagination && (
          <span className="text-muted-foreground ms-auto text-xs">
            {t('aiFindings.totalCount')}: {String(pagination.total)}
          </span>
        )}
      </div>

      {isLoading && <LoadingSpinner />}

      {!isLoading && findings.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12">
          <Sparkles className="text-muted-foreground mb-4 h-12 w-12" />
          <p className="text-muted-foreground text-sm font-medium">{t('aiFindings.noFindings')}</p>
        </div>
      )}

      {!isLoading && findings.length > 0 && (
        <div className="space-y-2">
          {findings.map(finding => (
            <FindingRow
              key={finding.id}
              finding={finding}
              isExpanded={expandedId === finding.id}
              onToggle={() => toggleExpanded(finding.id)}
              t={t}
            />
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-muted-foreground text-xs">
            {String(page)} / {String(pagination.totalPages)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
