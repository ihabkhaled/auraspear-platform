import { ServiceStatus, StatusBgClass, StatusBorderClass, StatusTextClass } from '@/enums'
import type { ServiceHealth } from '@/types'

/**
 * Returns the Tailwind dot-colour class for a service status indicator.
 */
export function getStatusDotClass(status: ServiceStatus): string {
  switch (status) {
    case ServiceStatus.HEALTHY:
      return StatusBgClass.SUCCESS
    case ServiceStatus.DEGRADED:
      return StatusBgClass.WARNING
    case ServiceStatus.DOWN:
      return StatusBgClass.ERROR
    case ServiceStatus.MAINTENANCE:
      return StatusBgClass.INFO
    default:
      return StatusBgClass.NEUTRAL
  }
}

/**
 * Returns the border hint class for a service status card.
 */
export function getStatusBgHint(status: ServiceStatus): string {
  switch (status) {
    case ServiceStatus.HEALTHY:
      return StatusBorderClass.SUCCESS_30
    case ServiceStatus.DEGRADED:
      return StatusBorderClass.WARNING_30
    case ServiceStatus.DOWN:
      return StatusBorderClass.ERROR_30
    case ServiceStatus.MAINTENANCE:
      return StatusBorderClass.INFO_30
    default:
      return ''
  }
}

/**
 * Computes overall health percentage: healthy services / total services × 100.
 * Returns 0 when no services are present.
 */
export function computeHealthPercent(services: ServiceHealth[]): number {
  if (services.length === 0) return 0
  const healthyCount = services.filter(s => s.status === ServiceStatus.HEALTHY).length
  return Math.round((healthyCount / services.length) * 100)
}

/**
 * Returns the maximum latency (ms) across all services.
 * Returns 0 when no services are present.
 */
export function computeMaxLatency(services: ServiceHealth[]): number {
  if (services.length === 0) return 0
  return Math.max(...services.map(s => s.latencyMs))
}

/**
 * Returns a text colour class for the health percentage indicator.
 */
export function getHealthStatusClass(percent: number): string {
  if (percent >= 90) return StatusTextClass.SUCCESS
  if (percent >= 70) return StatusTextClass.WARNING
  return StatusTextClass.ERROR
}

/**
 * Returns a background colour class for the health percentage indicator.
 */
export function getHealthBgClass(percent: number): string {
  if (percent >= 90) return StatusBgClass.SUCCESS
  if (percent >= 70) return StatusBgClass.WARNING
  return StatusBgClass.ERROR
}

/**
 * Returns a translated label for the given service status.
 * `t` must be the `useTranslations('admin')` return value.
 */
export function getStatusLabel(status: ServiceStatus, t: (key: string) => string): string {
  switch (status) {
    case ServiceStatus.HEALTHY:
      return t('services.statusHealthy')
    case ServiceStatus.DEGRADED:
      return t('services.statusDegraded')
    case ServiceStatus.DOWN:
      return t('services.statusDown')
    case ServiceStatus.MAINTENANCE:
      return t('services.statusMaintenance')
    default:
      return t('services.statusUnknown')
  }
}
