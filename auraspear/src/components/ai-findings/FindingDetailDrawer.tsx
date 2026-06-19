'use client'

import { ArrowRightLeft, Briefcase, CheckCircle, ShieldAlert, XCircle } from 'lucide-react'
import {
  Badge,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui'
import { AiFindingStatus } from '@/enums'
import {
  resolveFindingConfidenceVariant,
  resolveFindingSeverityVariant,
  resolveFindingStatusVariant,
} from '@/lib/ai-config.utils'
import { formatTimestamp } from '@/lib/utils'
import type { FindingDetailDrawerProps } from '@/types'

export function FindingDetailDrawer({
  finding,
  open,
  onOpenChange,
  onUpdateStatus,
  onPromote,
  statusLoading,
  promoteLoading,
  canPromote,
  t,
}: FindingDetailDrawerProps) {
  if (!finding) {
    return null
  }

  const canApply = finding.status !== AiFindingStatus.APPLIED
  const canDismiss = finding.status !== AiFindingStatus.DISMISSED

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg" side="right">
        <SheetHeader>
          <SheetTitle className="text-start">{t('findingDetail')}</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 pt-4">
          {/* Title */}
          <div>
            <p className="text-foreground text-sm font-semibold">{finding.title}</p>
          </div>

          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={resolveFindingStatusVariant(finding.status)} className="text-xs capitalize">
              {finding.status}
            </Badge>
            {finding.severity && (
              <Badge variant={resolveFindingSeverityVariant(finding.severity)} className="text-xs capitalize">
                {finding.severity}
              </Badge>
            )}
            {typeof finding.confidenceScore === 'number' && (
              <Badge variant={resolveFindingConfidenceVariant(finding.confidenceScore <= 1 ? Math.round(finding.confidenceScore * 100) : Math.round(finding.confidenceScore))} className="text-xs">
                {`${t('confidence')}: ${String(finding.confidenceScore <= 1 ? Math.round(finding.confidenceScore * 100) : Math.round(finding.confidenceScore))}%`}
              </Badge>
            )}
          </div>

          {/* Metadata grid */}
          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <span className="text-muted-foreground">{t('agent')}: </span>
              <span className="font-mono font-medium">{finding.agentId}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('module')}: </span>
              <span>{finding.sourceModule}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('type')}: </span>
              <span className="capitalize">{finding.findingType.replaceAll('_', ' ')}</span>
            </div>
            {finding.sourceEntityId && (
              <div>
                <span className="text-muted-foreground">{t('sourceEntity')}: </span>
                <span className="font-mono text-xs">{finding.sourceEntityId}</span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">{t('createdAt')}: </span>
              <span>{formatTimestamp(finding.createdAt)}</span>
            </div>
            {finding.appliedAt && (
              <div>
                <span className="text-muted-foreground">{t('appliedAt')}: </span>
                <span>{formatTimestamp(finding.appliedAt)}</span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">{t('session')}: </span>
              <span className="font-mono text-xs">{finding.sessionId}</span>
            </div>
          </div>

          {/* Summary */}
          <div>
            <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
              {t('summary')}
            </p>
            <div className="bg-muted/50 max-h-64 overflow-auto rounded-lg p-3">
              <pre className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
                {finding.summary}
              </pre>
            </div>
          </div>

          {/* Recommended Action */}
          {finding.recommendedAction && (
            <div>
              <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                {t('recommendedAction')}
              </p>
              <p className="text-foreground text-sm">{finding.recommendedAction}</p>
            </div>
          )}

          {/* Evidence JSON (collapsible) */}
          {Boolean(finding.evidenceJson) && (
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="text-muted-foreground flex items-center gap-1 text-xs font-medium uppercase hover:underline">
                {t('evidence')}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="bg-muted/50 mt-1 max-h-64 overflow-auto rounded-lg p-3">
                  <pre className="text-foreground text-xs leading-relaxed whitespace-pre-wrap">
                    {String(JSON.stringify(finding.evidenceJson, null, 2))}
                  </pre>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Status action buttons */}
          <div className="flex items-center gap-2 pt-2">
            {canApply && (
              <Button
                variant="default"
                size="sm"
                disabled={statusLoading}
                onClick={() => onUpdateStatus(finding.id, AiFindingStatus.APPLIED)}
              >
                <CheckCircle className="me-1 h-4 w-4" />
                {t('markApplied')}
              </Button>
            )}
            {canDismiss && (
              <Button
                variant="outline"
                size="sm"
                disabled={statusLoading}
                onClick={() => onUpdateStatus(finding.id, AiFindingStatus.DISMISSED)}
              >
                <XCircle className="me-1 h-4 w-4" />
                {t('markDismissed')}
              </Button>
            )}
          </div>

          {/* Promote to operations */}
          {canPromote && onPromote && finding.status === AiFindingStatus.PROPOSED && (
            <div className="border-border space-y-2 border-t pt-4">
              <p className="text-muted-foreground text-xs font-medium uppercase">
                <ArrowRightLeft className="me-1 inline h-3.5 w-3.5" />
                {t('promoteToOps')}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="default"
                  size="sm"
                  disabled={Boolean(promoteLoading)}
                  onClick={() => onPromote(finding.id, 'case')}
                >
                  <Briefcase className="me-1 h-4 w-4" />
                  {t('promoteToCase')}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={Boolean(promoteLoading)}
                  onClick={() => onPromote(finding.id, 'incident')}
                >
                  <ShieldAlert className="me-1 h-4 w-4" />
                  {t('promoteToIncident')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
