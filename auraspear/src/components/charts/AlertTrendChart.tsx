'use client'

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { useAlertTrendChart } from '@/hooks'
import { SEVERITY_COLORS } from '@/lib/constants'
import type { AlertTrendChartProps } from '@/types'

export function AlertTrendChart({ data }: AlertTrendChartProps) {
  const { t } = useAlertTrendChart()

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradCritical" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={SEVERITY_COLORS.critical} stopOpacity={0.3} />
            <stop offset="95%" stopColor={SEVERITY_COLORS.critical} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradHigh" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={SEVERITY_COLORS.high} stopOpacity={0.3} />
            <stop offset="95%" stopColor={SEVERITY_COLORS.high} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradMedium" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={SEVERITY_COLORS.medium} stopOpacity={0.3} />
            <stop offset="95%" stopColor={SEVERITY_COLORS.medium} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradLow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={SEVERITY_COLORS.low} stopOpacity={0.3} />
            <stop offset="95%" stopColor={SEVERITY_COLORS.low} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="date"
          stroke="var(--muted-foreground)"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            color: 'var(--foreground)',
            fontSize: '12px',
          }}
        />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        <Area
          type="monotone"
          dataKey="critical"
          name={t('severity')}
          stackId="1"
          stroke={SEVERITY_COLORS.critical}
          fill="url(#gradCritical)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="high"
          stackId="1"
          stroke={SEVERITY_COLORS.high}
          fill="url(#gradHigh)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="medium"
          stackId="1"
          stroke={SEVERITY_COLORS.medium}
          fill="url(#gradMedium)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="low"
          stackId="1"
          stroke={SEVERITY_COLORS.low}
          fill="url(#gradLow)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
