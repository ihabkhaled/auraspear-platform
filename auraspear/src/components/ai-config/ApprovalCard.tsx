'use client'

import { CheckCircle, Clock, XCircle } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Textarea,
} from '@/components/ui'
import { ApprovalStatus } from '@/enums'
import { useApprovalCard } from '@/hooks'
import { formatDate } from '@/lib/utils'
import type { ApprovalCardProps } from '@/types'

export function ApprovalCard({ approval, onResolve, resolveLoading, t }: ApprovalCardProps) {
  const { comment, setComment, isPending, statusVariant, handleApprove, handleReject } =
    useApprovalCard(approval, onResolve)

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Clock className="text-status-warning h-4 w-4" />
          <div>
            <h3 className="text-sm font-semibold">{approval.agentName}</h3>
            <p className="text-muted-foreground text-xs">{approval.actionType}</p>
          </div>
        </div>
        <Badge variant={statusVariant}>{approval.status}</Badge>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <p className="text-muted-foreground text-xs">{approval.description}</p>

        <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
          <div>
            <span className="text-muted-foreground">{t('riskLevel')}: </span>
            <Badge
              variant={
                approval.riskLevel === 'high' || approval.riskLevel === 'critical'
                  ? 'destructive'
                  : 'secondary'
              }
              className="ml-1"
            >
              {approval.riskLevel}
            </Badge>
          </div>
          <div>
            <span className="text-muted-foreground">{t('requestedBy')}: </span>
            <span>{approval.requestedByName}</span>
          </div>
          <div>
            <span className="text-muted-foreground">{t('expiresAt')}: </span>
            <span>{formatDate(approval.expiresAt)}</span>
          </div>
        </div>

        {isPending && (
          <div className="space-y-2">
            <Textarea
              placeholder={t('comment')}
              value={comment}
              onChange={e => setComment(e.currentTarget.value)}
              rows={2}
            />
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                className="flex-1"
                onClick={handleApprove}
                disabled={resolveLoading}
              >
                <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                {t('approve')}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="flex-1"
                onClick={handleReject}
                disabled={resolveLoading}
              >
                <XCircle className="mr-1.5 h-3.5 w-3.5" />
                {t('reject')}
              </Button>
            </div>
          </div>
        )}

        {approval.resolvedByName && (
          <div className="text-muted-foreground text-xs">
            {approval.status === ApprovalStatus.APPROVED ? (
              <CheckCircle className="text-status-success mr-1 inline h-3 w-3" />
            ) : (
              <XCircle className="text-status-error mr-1 inline h-3 w-3" />
            )}
            {approval.resolvedByName}
            {approval.comment ? `: ${approval.comment}` : ''}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
