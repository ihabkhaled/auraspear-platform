import type { AlertTrendPoint, MITRETechnique } from './dashboard.types'

export interface SeverityDataPoint {
  name: string
  value: number
  severity: string
}

export interface AlertTrendChartProps {
  data: AlertTrendPoint[]
}

export interface MitreBarChartProps {
  data: MITRETechnique[]
}

export interface ColoredDataPoint extends SeverityDataPoint {
  fill: string
}

export interface SeverityDistributionChartProps {
  data: SeverityDataPoint[]
}
