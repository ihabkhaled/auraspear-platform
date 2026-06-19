export interface ExplainAnomalyInput {
  metric: string
  value: number
  previousValue: number
  timeRange: string
}
