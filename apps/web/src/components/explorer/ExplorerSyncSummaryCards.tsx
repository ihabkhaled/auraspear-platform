'use client'

import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui'
import type { ExplorerSyncSummaryCardsProps } from '@/types'

export function ExplorerSyncSummaryCards({ summary, t }: ExplorerSyncSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">{t('overview.running')}</CardTitle>
          <Loader2 className="text-status-info h-4 w-4 animate-spin" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{summary.running.count}</p>
          {summary.running.connectors.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {summary.running.connectors.map(c => (
                <Badge key={c} variant="secondary" className="text-xs capitalize">
                  {c}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">{t('overview.completed')}</CardTitle>
          <CheckCircle2 className="text-status-success h-4 w-4" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{summary.completed.count}</p>
          {summary.completed.connectors.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {summary.completed.connectors.map(c => (
                <Badge
                  key={c}
                  variant="default"
                  className="bg-status-success text-xs text-white capitalize"
                >
                  {c}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">{t('overview.failed')}</CardTitle>
          <XCircle className="text-status-error h-4 w-4" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{summary.failed.count}</p>
          {summary.failed.connectors.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {summary.failed.connectors.map(c => (
                <Badge key={c} variant="destructive" className="text-xs capitalize">
                  {c}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
