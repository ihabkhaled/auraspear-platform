import { AppLogFeature, type AppLogOutcome, AppLogSourceType } from '../enums'
import type { AppLogContext } from './app-logger.types'
import type { ServiceCheck } from './startup-health.types'

export function buildChecksMetadata(checks: ServiceCheck[]): Record<string, unknown> {
  const metadata: Record<string, unknown> = {}
  for (const check of checks) {
    metadata[check.name] = {
      status: check.status,
      latencyMs: check.latencyMs,
      error: check.error ?? null,
    }
  }
  return metadata
}

export function buildStartupSummaryLogContext(
  outcome: AppLogOutcome,
  metadata: Record<string, unknown>
): AppLogContext {
  return {
    feature: AppLogFeature.SYSTEM_HEALTH,
    action: 'startupCheck',
    outcome,
    sourceType: AppLogSourceType.SERVICE,
    className: 'StartupHealthService',
    functionName: 'runStartupChecks',
    metadata,
  }
}

export function buildServiceCheckLogContext(
  check: ServiceCheck,
  outcome: AppLogOutcome
): AppLogContext {
  const metadata: Record<string, unknown> = {
    service: check.name,
    latencyMs: check.latencyMs,
  }

  if (check.error) {
    metadata.error = check.error
  }

  return {
    feature: AppLogFeature.SYSTEM_HEALTH,
    action: 'serviceCheck',
    outcome,
    sourceType: AppLogSourceType.SERVICE,
    className: 'StartupHealthService',
    functionName: 'runStartupChecks',
    metadata,
  }
}

export function buildServiceCheckMessage(check: ServiceCheck): string {
  if (check.status === 'up') {
    return `${check.name}: UP (${String(check.latencyMs)}ms)`
  }

  return `${check.name}: DOWN — ${check.error ?? 'Unknown error'}`
}
