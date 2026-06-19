import { describe, test, expect } from 'vitest'
import { AlertSeverity } from '@/enums'
import {
  parseKQLQuery,
  getSeverityDotClass,
  SEVERITY_ORDER,
  getConfidenceColor,
} from '@/lib/alert.utils'

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

  test('agent filter (alias: agentname)', () => {
    expect(parseKQLQuery('agentname:web-01')).toEqual({ agentName: 'web-01' })
  })

  test('rule filter', () => {
    expect(parseKQLQuery('rule:brute_force')).toEqual({ ruleGroup: 'brute_force' })
  })

  test('rule filter (alias: rulegroup)', () => {
    expect(parseKQLQuery('rulegroup:brute_force')).toEqual({ ruleGroup: 'brute_force' })
  })

  test('rule filter (alias: rulename)', () => {
    expect(parseKQLQuery('rulename:brute_force')).toEqual({ ruleGroup: 'brute_force' })
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

  test('single-quoted value in free text', () => {
    const result = parseKQLQuery("'failed login'")
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

  test('mixed case field names', () => {
    expect(parseKQLQuery('Status:open')).toEqual({ status: 'open' })
  })

  test('multiple severity values across tokens are merged', () => {
    const result = parseKQLQuery('severity:critical severity:high')
    expect(result.severity).toBe('critical,high')
  })

  test('all filters combined with free text', () => {
    const result = parseKQLQuery(
      'severity:high status:open agent:srv-01 rule:ssh_brute source:wazuh suspicious activity'
    )
    expect(result.severity).toBe('high')
    expect(result.status).toBe('open')
    expect(result.agentName).toBe('srv-01')
    expect(result.ruleGroup).toBe('ssh_brute')
    expect(result.source).toBe('wazuh')
    expect(result.query).toBe('suspicious activity')
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

  test('covers all AlertSeverity values', () => {
    for (const severity of Object.values(AlertSeverity)) {
      const result = getSeverityDotClass(severity)
      expect(result).toBeTruthy()
      expect(result).toMatch(/^bg-status-/)
    }
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

  test('is ordered from most severe to least', () => {
    expect(SEVERITY_ORDER[0]).toBe(AlertSeverity.CRITICAL)
    expect(SEVERITY_ORDER[1]).toBe(AlertSeverity.HIGH)
    expect(SEVERITY_ORDER[2]).toBe(AlertSeverity.MEDIUM)
    expect(SEVERITY_ORDER[3]).toBe(AlertSeverity.LOW)
    expect(SEVERITY_ORDER[4]).toBe(AlertSeverity.INFO)
  })

  test('contains all AlertSeverity values', () => {
    for (const severity of Object.values(AlertSeverity)) {
      expect(SEVERITY_ORDER).toContain(severity)
    }
  })
})

/* ------------------------------------------------------------------ */
/* getConfidenceColor                                                   */
/* ------------------------------------------------------------------ */

describe('getConfidenceColor', () => {
  test('high confidence (>= 0.8) returns success', () => {
    expect(getConfidenceColor(0.9)).toBe('text-status-success')
    expect(getConfidenceColor(1)).toBe('text-status-success')
  })

  test('boundary 0.8 returns success', () => {
    expect(getConfidenceColor(0.8)).toBe('text-status-success')
  })

  test('medium confidence (>= 0.5 and < 0.8) returns warning', () => {
    expect(getConfidenceColor(0.6)).toBe('text-status-warning')
    expect(getConfidenceColor(0.7)).toBe('text-status-warning')
  })

  test('boundary 0.5 returns warning', () => {
    expect(getConfidenceColor(0.5)).toBe('text-status-warning')
  })

  test('low confidence (< 0.5) returns error', () => {
    expect(getConfidenceColor(0.3)).toBe('text-status-error')
    expect(getConfidenceColor(0.1)).toBe('text-status-error')
    expect(getConfidenceColor(0)).toBe('text-status-error')
  })

  test('boundary 0.49 returns error', () => {
    expect(getConfidenceColor(0.49)).toBe('text-status-error')
  })

  test('boundary 0.79 returns warning', () => {
    expect(getConfidenceColor(0.79)).toBe('text-status-warning')
  })
})
