import { describe, test, expect } from 'vitest'
import { ServiceStatus } from '@/enums'
import {
  getStatusDotClass,
  getStatusBgHint,
  computeHealthPercent,
  computeMaxLatency,
  getHealthStatusClass,
  getHealthBgClass,
  getStatusLabel,
} from '@/lib/health-utils'

describe('getStatusDotClass', () => {
  test('HEALTHY returns bg-status-success', () => {
    expect(getStatusDotClass(ServiceStatus.HEALTHY)).toBe('bg-status-success')
  })

  test('DEGRADED returns bg-status-warning', () => {
    expect(getStatusDotClass(ServiceStatus.DEGRADED)).toBe('bg-status-warning')
  })

  test('DOWN returns bg-status-error', () => {
    expect(getStatusDotClass(ServiceStatus.DOWN)).toBe('bg-status-error')
  })

  test('MAINTENANCE returns bg-status-info', () => {
    expect(getStatusDotClass(ServiceStatus.MAINTENANCE)).toBe('bg-status-info')
  })

  test('unknown status returns bg-status-neutral', () => {
    expect(getStatusDotClass('unknown' as ServiceStatus)).toBe('bg-status-neutral')
  })
})

describe('getStatusBgHint', () => {
  test('HEALTHY returns success border', () => {
    expect(getStatusBgHint(ServiceStatus.HEALTHY)).toBe('border-status-success/30')
  })

  test('DOWN returns error border', () => {
    expect(getStatusBgHint(ServiceStatus.DOWN)).toBe('border-status-error/30')
  })

  test('unknown status returns empty string', () => {
    expect(getStatusBgHint('unknown' as ServiceStatus)).toBe('')
  })
})

describe('computeHealthPercent', () => {
  test('empty array returns 0', () => {
    expect(computeHealthPercent([])).toBe(0)
  })

  test('all healthy returns 100', () => {
    const services = [
      { status: ServiceStatus.HEALTHY, latencyMs: 50 },
      { status: ServiceStatus.HEALTHY, latencyMs: 30 },
    ]
    expect(computeHealthPercent(services as never[])).toBe(100)
  })

  test('half healthy returns 50', () => {
    const services = [
      { status: ServiceStatus.HEALTHY, latencyMs: 50 },
      { status: ServiceStatus.DOWN, latencyMs: -1 },
    ]
    expect(computeHealthPercent(services as never[])).toBe(50)
  })

  test('none healthy returns 0', () => {
    const services = [
      { status: ServiceStatus.DOWN, latencyMs: -1 },
      { status: ServiceStatus.DEGRADED, latencyMs: 5000 },
    ]
    expect(computeHealthPercent(services as never[])).toBe(0)
  })
})

describe('computeMaxLatency', () => {
  test('empty array returns 0', () => {
    expect(computeMaxLatency([])).toBe(0)
  })

  test('returns maximum latency', () => {
    const services = [
      { status: ServiceStatus.HEALTHY, latencyMs: 50 },
      { status: ServiceStatus.HEALTHY, latencyMs: 200 },
      { status: ServiceStatus.HEALTHY, latencyMs: 150 },
    ]
    expect(computeMaxLatency(services as never[])).toBe(200)
  })
})

describe('getHealthStatusClass', () => {
  test('90+ returns success', () => {
    expect(getHealthStatusClass(95)).toBe('text-status-success')
  })

  test('boundary 90 returns success', () => {
    expect(getHealthStatusClass(90)).toBe('text-status-success')
  })

  test('70-89 returns warning', () => {
    expect(getHealthStatusClass(80)).toBe('text-status-warning')
  })

  test('below 70 returns error', () => {
    expect(getHealthStatusClass(60)).toBe('text-status-error')
  })
})

describe('getHealthBgClass', () => {
  test('90+ returns bg-status-success', () => {
    expect(getHealthBgClass(95)).toBe('bg-status-success')
  })

  test('70-89 returns bg-status-warning', () => {
    expect(getHealthBgClass(80)).toBe('bg-status-warning')
  })

  test('below 70 returns bg-status-error', () => {
    expect(getHealthBgClass(60)).toBe('bg-status-error')
  })
})

describe('getStatusLabel', () => {
  test('calls translation function with correct key', () => {
    const t = (key: string) => `translated:${key}`
    expect(getStatusLabel(ServiceStatus.HEALTHY, t)).toBe('translated:services.statusHealthy')
    expect(getStatusLabel(ServiceStatus.DOWN, t)).toBe('translated:services.statusDown')
    expect(getStatusLabel(ServiceStatus.DEGRADED, t)).toBe('translated:services.statusDegraded')
    expect(getStatusLabel(ServiceStatus.MAINTENANCE, t)).toBe(
      'translated:services.statusMaintenance'
    )
  })

  test('unknown status returns statusUnknown', () => {
    const t = (key: string) => `translated:${key}`
    expect(getStatusLabel('unknown' as ServiceStatus, t)).toBe('translated:services.statusUnknown')
  })
})
