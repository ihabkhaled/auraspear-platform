import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { AiDailyUsageEntry, TranslationFn } from '@/types'

export function FinopsDailyTrendChart({
  t,
  data,
}: {
  t: TranslationFn
  data: AiDailyUsageEntry[]
}) {
  if (data.length === 0) {
    return (
      <div className="text-muted-foreground flex h-48 items-center justify-center">
        {t('noData')}
      </div>
    )
  }

  return (
    <div className="h-64 w-full sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
          <YAxis
            tick={{ fontSize: 11 }}
            className="fill-muted-foreground"
            tickFormatter={(v: number) => `$${v.toFixed(2)}`}
          />
          <Tooltip
            formatter={value => [`$${Number(value ?? 0).toFixed(4)}`, t('chart.cost')]}
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
              fontSize: '12px',
            }}
          />
          <Bar dataKey="cost" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
