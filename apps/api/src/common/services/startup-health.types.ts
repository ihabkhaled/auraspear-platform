export interface ServiceCheck {
  name: string
  status: 'up' | 'down'
  latencyMs: number
  error?: string
}
