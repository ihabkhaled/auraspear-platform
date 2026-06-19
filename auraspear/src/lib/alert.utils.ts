import {
  AlertSeverity,
  KqlField,
  StatusBgClass,
  StatusTextClass,
  type AlertTimelineEventType,
} from '@/enums'
import {
  DEFAULT_TIMELINE_COLOR,
  DEFAULT_TIMELINE_ICON,
  TIMELINE_EVENT_COLOR_MAP,
  TIMELINE_EVENT_ICON_MAP,
} from '@/lib/constants/alerts'
import { lookup } from '@/lib/utils'
import type { ParsedKQLQuery } from '@/types'

/**
 * Parses a KQL-style query string into structured alert search parameters.
 *
 * Supported syntax:
 *   severity:critical            → severity filter
 *   severity:critical,high       → multi-value severity
 *   status:new_alert             → status filter
 *   agent:hostname               → agentName filter
 *   rule:brute_force             → ruleGroup filter
 *   source:wazuh                 → source filter
 *   plain text                   → full-text search query
 *
 * Multiple tokens can be combined: severity:high agent:web-01 failed login
 */
export function parseKQLQuery(input: string): ParsedKQLQuery {
  if (!input || input.trim().length === 0) {
    return {}
  }

  const result: ParsedKQLQuery = {}
  const freeTextTerms: string[] = []
  const tokens = tokenizeKQL(input.trim())
  const severityValues: string[] = []

  for (const token of tokens) {
    const colonIdx = token.indexOf(':')
    if (colonIdx === -1) {
      freeTextTerms.push(token)
      continue
    }

    const field = token.slice(0, colonIdx).toLowerCase()
    const value = token.slice(colonIdx + 1)

    if (!value) {
      freeTextTerms.push(token)
      continue
    }

    switch (field) {
      case KqlField.SEVERITY: {
        // support comma-separated values inline: severity:critical,high
        const parts = value.split(',').filter(Boolean)
        severityValues.push(...parts)
        break
      }
      case KqlField.STATUS:
        result.status = value
        break
      case KqlField.AGENT:
      case KqlField.AGENTNAME:
      case KqlField.HOST:
        result.agentName = value
        break
      case KqlField.RULE:
      case KqlField.RULEGROUP:
      case KqlField.RULENAME:
        result.ruleGroup = value
        break
      case KqlField.SOURCE:
        result.source = value
        break
      default:
        // unknown field — treat as free text
        freeTextTerms.push(token)
    }
  }

  if (severityValues.length > 0) {
    result.severity = severityValues.join(',')
  }

  if (freeTextTerms.length > 0) {
    result.query = freeTextTerms.join(' ')
  }

  return result
}

function tokenizeKQL(input: string): string[] {
  const tokens: string[] = []
  let current = ''
  let inQuotes = false
  let quoteChar = ''

  for (const ch of input) {
    if (inQuotes) {
      if (ch === quoteChar) {
        inQuotes = false
      } else {
        current += ch
      }
    } else if (ch === '"' || ch === "'") {
      inQuotes = true
      quoteChar = ch
    } else if (ch === ' ') {
      if (current.length > 0) {
        tokens.push(current)
        current = ''
      }
    } else {
      current += ch
    }
  }

  if (current.length > 0) {
    tokens.push(current)
  }

  return tokens
}

export function getSeverityDotClass(severity: AlertSeverity): string {
  switch (severity) {
    case AlertSeverity.CRITICAL:
      return StatusBgClass.ERROR
    case AlertSeverity.HIGH:
      return StatusBgClass.WARNING
    case AlertSeverity.MEDIUM:
      return StatusBgClass.INFO
    case AlertSeverity.LOW:
      return StatusBgClass.SUCCESS
    case AlertSeverity.INFO:
      return StatusBgClass.NEUTRAL
  }
}

export const SEVERITY_ORDER = [
  AlertSeverity.CRITICAL,
  AlertSeverity.HIGH,
  AlertSeverity.MEDIUM,
  AlertSeverity.LOW,
  AlertSeverity.INFO,
] as const

export function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return StatusTextClass.SUCCESS
  if (confidence >= 0.5) return StatusTextClass.WARNING
  return StatusTextClass.ERROR
}

export function getTimelineEventIcon(type: AlertTimelineEventType): string {
  return lookup(TIMELINE_EVENT_ICON_MAP, type) ?? DEFAULT_TIMELINE_ICON
}

export function getTimelineEventColor(type: AlertTimelineEventType): string {
  return lookup(TIMELINE_EVENT_COLOR_MAP, type) ?? DEFAULT_TIMELINE_COLOR
}
