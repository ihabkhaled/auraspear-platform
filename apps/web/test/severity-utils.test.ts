import { describe, test, expect } from 'vitest'
import { AlertSeverity } from '@/enums'
import {
  parseKQLQuery,
  getSeverityDotClass,
  SEVERITY_ORDER,
  getConfidenceColor,
} from '@/lib/alert.utils'
import { getRiskBadgeClass } from '@/lib/dashboard.utils'
import { getSeverityVariant, getSeverityClass } from '@/lib/severity-utils'

/* ------------------------------------------------------------------ */
/* getSeverityVariant                                                    */
/* ------------------------------------------------------------------ */

describe('getSeverityVariant', () => {
  test('CRITICAL returns error classes', () => {
    expect(getSeverityVariant(AlertSeverity.CRITICAL)).toContain('status-error')
  })

  test('HIGH returns warning classes', () => {
    expect(getSeverityVariant(AlertSeverity.HIGH)).toContain('status-warning')
  })

  test('MEDIUM returns info classes', () => {
    expect(getSeverityVariant(AlertSeverity.MEDIUM)).toContain('status-info')
  })

  test('LOW returns success classes', () => {
    expect(getSeverityVariant(AlertSeverity.LOW)).toContain('status-success')
  })

  test('INFO returns neutral classes', () => {
    expect(getSeverityVariant(AlertSeverity.INFO)).toContain('status-neutral')
  })

  test('getSeverityClass is an alias', () => {
    expect(getSeverityClass).toBe(getSeverityVariant)
  })
})

/* ------------------------------------------------------------------ */
/* getSeverityDotClass                                                  */
/* ------------------------------------------------------------------ */

describe('getSeverityDotClass', () => {
  test('CRITICAL returns bg-status-error', () => {
    expect(getSeverityDotClass(AlertSeverity.CRITICAL)).toBe('bg-status-error')
  })

  test('HIGH returns bg-status-warning', () => {
    expect(getSeverityDotClass(AlertSeverity.HIGH)).toBe('bg-status-warning')
  })

  test('MEDIUM returns bg-status-info', () => {
    expect(getSeverityDotClass(AlertSeverity.MEDIUM)).toBe('bg-status-info')
  })

  test('LOW returns bg-status-success', () => {
    expect(getSeverityDotClass(AlertSeverity.LOW)).toBe('bg-status-success')
  })

  test('INFO returns bg-status-neutral', () => {
    expect(getSeverityDotClass(AlertSeverity.INFO)).toBe('bg-status-neutral')
  })
})

/* ------------------------------------------------------------------ */
/* SEVERITY_ORDER                                                       */
/* ------------------------------------------------------------------ */

describe('SEVERITY_ORDER', () => {
  test('has all 5 severity levels', () => {
    expect(SEVERITY_ORDER).toHaveLength(5)
  })

  test('starts with CRITICAL and ends with INFO', () => {
    expect(SEVERITY_ORDER[0]).toBe(AlertSeverity.CRITICAL)
    expect(SEVERITY_ORDER[4]).toBe(AlertSeverity.INFO)
  })
})

/* ------------------------------------------------------------------ */
/* getConfidenceColor                                                   */
/* ------------------------------------------------------------------ */

describe('getConfidenceColor', () => {
  test('high confidence returns success', () => {
    expect(getConfidenceColor(0.9)).toBe('text-status-success')
  })

  test('boundary 0.8 returns success', () => {
    expect(getConfidenceColor(0.8)).toBe('text-status-success')
  })

  test('medium confidence returns warning', () => {
    expect(getConfidenceColor(0.6)).toBe('text-status-warning')
  })

  test('boundary 0.5 returns warning', () => {
    expect(getConfidenceColor(0.5)).toBe('text-status-warning')
  })

  test('low confidence returns error', () => {
    expect(getConfidenceColor(0.3)).toBe('text-status-error')
  })
})

/* ------------------------------------------------------------------ */
/* parseKQLQuery                                                        */
/* ------------------------------------------------------------------ */

describe('parseKQLQuery', () => {
  test('empty string returns empty object', () => {
    expect(parseKQLQuery('')).toEqual({})
  })

  test('whitespace-only returns empty object', () => {
    expect(parseKQLQuery('   ')).toEqual({})
  })

  test('severity filter', () => {
    expect(parseKQLQuery('severity:critical')).toEqual({ severity: 'critical' })
  })

  test('comma-separated severity', () => {
    expect(parseKQLQuery('severity:critical,high')).toEqual({ severity: 'critical,high' })
  })

  test('status filter', () => {
    expect(parseKQLQuery('status:new_alert')).toEqual({ status: 'new_alert' })
  })

  test('agent filter (alias: agent)', () => {
    expect(parseKQLQuery('agent:web-01')).toEqual({ agentName: 'web-01' })
  })

  test('agent filter (alias: host)', () => {
    expect(parseKQLQuery('host:web-01')).toEqual({ agentName: 'web-01' })
  })

  test('rule filter', () => {
    expect(parseKQLQuery('rule:brute_force')).toEqual({ ruleGroup: 'brute_force' })
  })

  test('source filter', () => {
    expect(parseKQLQuery('source:wazuh')).toEqual({ source: 'wazuh' })
  })

  test('free text only', () => {
    expect(parseKQLQuery('failed login attempt')).toEqual({ query: 'failed login attempt' })
  })

  test('mixed field and free text', () => {
    const result = parseKQLQuery('severity:high failed login')
    expect(result.severity).toBe('high')
    expect(result.query).toBe('failed login')
  })

  test('multiple field filters', () => {
    const result = parseKQLQuery('severity:critical agent:web-01 status:new_alert')
    expect(result.severity).toBe('critical')
    expect(result.agentName).toBe('web-01')
    expect(result.status).toBe('new_alert')
  })

  test('quoted value in free text', () => {
    const result = parseKQLQuery('"failed login"')
    expect(result.query).toBe('failed login')
  })

  test('unknown field treated as free text', () => {
    const result = parseKQLQuery('unknown:value')
    expect(result.query).toBe('unknown:value')
  })

  test('empty value after colon treated as free text', () => {
    const result = parseKQLQuery('severity:')
    expect(result.query).toBe('severity:')
  })

  test('case-insensitive field names', () => {
    expect(parseKQLQuery('SEVERITY:critical')).toEqual({ severity: 'critical' })
  })
})

/* ------------------------------------------------------------------ */
/* getRiskBadgeClass                                                    */
/* ------------------------------------------------------------------ */

describe('getRiskBadgeClass', () => {
  test('score > 80 returns error classes', () => {
    expect(getRiskBadgeClass(85)).toContain('status-error')
  })

  test('score > 60 returns warning classes', () => {
    expect(getRiskBadgeClass(70)).toContain('status-warning')
  })

  test('score > 40 returns info classes', () => {
    expect(getRiskBadgeClass(50)).toContain('status-info')
  })

  test('score <= 40 returns neutral classes', () => {
    expect(getRiskBadgeClass(30)).toContain('status-neutral')
  })

  test('boundary 81 returns error', () => {
    expect(getRiskBadgeClass(81)).toContain('status-error')
  })

  test('boundary 80 returns warning', () => {
    expect(getRiskBadgeClass(80)).toContain('status-warning')
  })

  test('boundary 61 returns warning', () => {
    expect(getRiskBadgeClass(61)).toContain('status-warning')
  })

  test('boundary 60 returns info', () => {
    expect(getRiskBadgeClass(60)).toContain('status-info')
  })

  test('boundary 41 returns info', () => {
    expect(getRiskBadgeClass(41)).toContain('status-info')
  })

  test('boundary 40 returns neutral', () => {
    expect(getRiskBadgeClass(40)).toContain('status-neutral')
  })
})
