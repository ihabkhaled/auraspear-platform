import { HealthStatus } from '../../common/enums'
import { toIso } from '../../common/utils/date-time.utility'
import type { ComponentCheck, OverallHealth, ServiceHealthResult } from './health.types'

export function determineOverallStatus(
  database: ComponentCheck,
  redis: ComponentCheck
): HealthStatus {
  if (database.status === HealthStatus.DOWN && redis.status === HealthStatus.DOWN) {
    return HealthStatus.DOWN
  }

  if (database.status === HealthStatus.DOWN || redis.status === HealthStatus.DOWN) {
    return HealthStatus.DEGRADED
  }

  return HealthStatus.HEALTHY
}

export function buildOverallHealthResponse(
  status: HealthStatus,
  database: ComponentCheck,
  redis: ComponentCheck
): OverallHealth {
  return {
    status,
    timestamp: toIso(),
    checks: { database, redis },
  }
}

export function determineConnectorHealthStatus(ok: boolean, latencyMs: number): HealthStatus {
  if (!ok) {
    return HealthStatus.DOWN
  }

  return latencyMs > 3000 ? HealthStatus.DEGRADED : HealthStatus.HEALTHY
}

export function buildServiceHealthResult(
  name: string,
  type: string,
  status: HealthStatus,
  latencyMs: number
): ServiceHealthResult {
  return { name, type, status, latencyMs }
}

export function buildFailedServiceHealthResult(name: string, type: string): ServiceHealthResult {
  return { name, type, status: HealthStatus.DOWN, latencyMs: -1 }
}

export function buildComponentCheckResult(
  status: HealthStatus.HEALTHY | HealthStatus.DOWN,
  latencyMs: number
): ComponentCheck {
  return { status, latencyMs }
}

export { extractErrorMessage } from '../../common/utils/error-extraction.utility'

export function countUnhealthy(results: ServiceHealthResult[]): number {
  return results.filter(r => r.status !== HealthStatus.HEALTHY).length
}
