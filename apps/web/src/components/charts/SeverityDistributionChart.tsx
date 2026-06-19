'use client'

import { ResponsiveContainer, PieChart, Pie, Legend, Tooltip } from 'recharts'
import { useSeverityChartData } from '@/hooks'
import type { SeverityDistributionChartProps } from '@/types'

export function SeverityDistributionChart({ data }: SeverityDistributionChartProps) {
  const coloredData = useSeverityChartData(data)

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={coloredData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
          nameKey="name"
          strokeWidth={0}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            color: 'var(--foreground)',
            fontSize: '12px',
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: '12px' }}
          formatter={(value: string) => <span style={{ color: 'var(--foreground)' }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
