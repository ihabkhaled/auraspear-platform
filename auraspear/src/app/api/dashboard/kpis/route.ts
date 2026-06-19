import { type NextRequest } from 'next/server'
import { fetchBackendJson, jsonNoStore } from '@/lib/backend-proxy'
import type { BackendSummary } from '@/types/dashboard.types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { data: rawData } = await fetchBackendJson(request, '/dashboards/summary')
    const raw = rawData as BackendSummary

    const mttrValue = Number.parseInt(raw.meanTimeToRespond, 10) || 0

    const data = [
      {
        label: 'totalAlerts',
        value: raw.totalAlerts,
        trend: raw.totalAlertsTrend,
        trendLabel: 'vsLastWeek',
        icon: 'shield',
      },
      {
        label: 'criticalAlerts',
        value: raw.criticalAlerts,
        trend: raw.criticalAlertsTrend,
        trendLabel: 'vsLastWeek',
        icon: 'alert-triangle',
      },
      {
        label: 'openCases',
        value: raw.openCases,
        trend: raw.openCasesTrend,
        trendLabel: 'vsLastWeek',
        icon: 'briefcase',
      },
      {
        label: 'meanResponseTime',
        value: mttrValue,
        trend: raw.mttrTrend,
        trendLabel: 'minutesVsLastWeek',
        icon: 'clock',
      },
    ]

    return jsonNoStore({ data })
  } catch (error) {
    console.error('[dashboard/kpis]', error)
    return jsonNoStore({ data: null, error: 'Internal server error' }, { status: 502 })
  }
}
