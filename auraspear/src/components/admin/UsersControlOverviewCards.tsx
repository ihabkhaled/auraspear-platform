'use client'

import { Activity, ShieldOff, Users } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@/components/ui'
import type { UsersControlOverviewCardsProps } from '@/types'

export function UsersControlOverviewCards({
  summary,
  loading = false,
  canForceLogoutAll,
  isForceLogoutAllPending = false,
  onForceLogoutAll,
  scopeLabel,
  t,
}: UsersControlOverviewCardsProps) {
  const metrics = [
    {
      key: 'totalUsers',
      label: t('summary.totalUsers'),
      value: summary?.totalUsers ?? 0,
      icon: <Users className="h-5 w-5" />,
    },
    {
      key: 'onlineUsers',
      label: t('summary.onlineUsers'),
      value: summary?.onlineUsers ?? 0,
      icon: <Activity className="h-5 w-5" />,
    },
    {
      key: 'activeSessions',
      label: t('summary.activeSessions'),
      value: summary?.activeSessions ?? 0,
      icon: <ShieldOff className="h-5 w-5" />,
    },
  ] as const

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            {t('scopeLabel')}
          </p>
          <p className="text-sm font-medium">{scopeLabel}</p>
        </div>

        {canForceLogoutAll && onForceLogoutAll && (
          <Button
            type="button"
            variant="destructive"
            className="cursor-pointer"
            disabled={loading || isForceLogoutAllPending}
            onClick={onForceLogoutAll}
          >
            <ShieldOff className="me-2 h-4 w-4" />
            {t('forceLogoutAll')}
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map(metric => (
          <Card key={metric.key}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
              <div className="text-muted-foreground">{metric.icon}</div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-3xl font-semibold tracking-tight">{metric.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
