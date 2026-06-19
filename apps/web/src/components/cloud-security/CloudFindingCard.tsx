'use client'

import { CheckCircle2, EyeOff } from 'lucide-react'
import { Badge, Button } from '@/components/ui'
import { useCloudSecurityFilters } from '@/hooks'
import {
  CLOUD_FINDING_SEVERITY_CLASSES,
  CLOUD_FINDING_SEVERITY_LABEL_KEYS,
  CLOUD_FINDING_STATUS_CLASSES,
  CLOUD_FINDING_STATUS_LABEL_KEYS,
} from '@/lib/constants/cloud-security'
import { cn, formatTimestamp, lookup } from '@/lib/utils'
import type { CloudFindingCardProps } from '@/types'

export function CloudFindingCard({ finding, onResolve, onSuppress }: CloudFindingCardProps) {
  const { t } = useCloudSecurityFilters()

  return (
    <div className="bg-card border-border space-y-3 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-foreground text-sm font-medium">{finding.title}</h4>
        <span
          className={cn(
            'inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
            lookup(CLOUD_FINDING_SEVERITY_CLASSES, finding.severity)
          )}
        >
          {t(lookup(CLOUD_FINDING_SEVERITY_LABEL_KEYS, finding.severity))}
        </span>
      </div>

      {finding.description && (
        <p className="text-muted-foreground text-sm">{finding.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{finding.resourceType}</Badge>
        <Badge variant="outline" className="font-mono text-xs">
          {finding.resourceId}
        </Badge>
        <span
          className={cn(
            'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
            lookup(CLOUD_FINDING_STATUS_CLASSES, finding.status)
          )}
        >
          {t(lookup(CLOUD_FINDING_STATUS_LABEL_KEYS, finding.status))}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs">{formatTimestamp(finding.detectedAt)}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onResolve(finding.id)}>
            <CheckCircle2 className="me-1 h-3.5 w-3.5" />
            {t('resolve')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => onSuppress(finding.id)}>
            <EyeOff className="me-1 h-3.5 w-3.5" />
            {t('suppress')}
          </Button>
        </div>
      </div>

      {finding.remediationSteps && (
        <div className="bg-muted rounded-md p-2">
          <p className="text-muted-foreground text-xs">{finding.remediationSteps}</p>
        </div>
      )}
    </div>
  )
}
