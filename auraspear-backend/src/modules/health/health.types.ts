import { type HealthStatus } from '../../common/enums'

export interface ServiceHealthResult {
  name: string
  type: string
  status: HealthStatus
  latencyMs: number
}

export interface OverallHealth {
  status: HealthStatus
  timestamp: string
  checks: {
    database: ComponentCheck
    redis: ComponentCheck
  }
}

export interface ComponentCheck {
  status: HealthStatus.HEALTHY | HealthStatus.DOWN
  latencyMs: number
}
