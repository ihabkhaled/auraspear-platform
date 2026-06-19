'use client'

import { Activity, ShieldUser, Users } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui'
import type { UsersControlSummaryCardsProps } from '@/types'

export function UsersControlSummaryCards({
  summary,
  loading,
  canForceLogoutAll,
  isForceLogoutAllPending,
  scopeLabel,
  onForceLogoutAll,
  t,
}: UsersControlSummaryCardsProps) {
  const cards = [
    {
      key: 'totalUsers',
      icon: <Users className="text-primary h-5 w-5" />,
      value: summary?.totalUsers ?? 0,
    },
    {
      key: 'onlineUsers',
      icon: <ShieldUser className="text-status-success h-5 w-5" />,
      value: summary?.onlineUsers ?? 0,
    },
    {
      key: 'activeSessions',
      icon: <Activity className="text-status-info h-5 w-5" />,
      value: summary?.activeSessions ?? 0,
    },
  ] as const

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-muted-foreground text-sm">{t('scopeLabel')}</p>
          <p className="text-sm font-medium">{scopeLabel}</p>
        </div>
        {canForceLogoutAll && (
          <Button
            variant="destructive"
            onClick={onForceLogoutAll}
            disabled={isForceLogoutAllPending || loading}
          >
            {t('forceLogoutAll')}
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map(card => (
          <Card key={card.key}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t(`summary.${card.key}`)}</CardTitle>
              {card.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '-' : card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
