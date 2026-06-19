import { useMemo } from 'react'
import { getSeverityColor } from '@/lib/severity-utils'
import type { ColoredDataPoint, SeverityDataPoint } from '@/types'

export function useSeverityChartData(data: SeverityDataPoint[]): ColoredDataPoint[] {
  return useMemo(
    () => data.map(entry => ({ ...entry, fill: getSeverityColor(entry.severity) })),
    [data]
  )
}
