'use client'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui'
import type { JobKpiCardsProps } from '@/types'

export function JobKpiCards({ stats, t }: JobKpiCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t('kpis.total')}</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold">{stats?.data.total ?? 0}</CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t('kpis.running')}</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold">{stats?.data.running ?? 0}</CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t('kpis.retrying')}</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold">{stats?.data.retrying ?? 0}</CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t('kpis.failed')}</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold">{stats?.data.failed ?? 0}</CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t('kpis.delayed')}</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold">{stats?.data.delayed ?? 0}</CardContent>
      </Card>
    </div>
  )
}
