import { SENSITIVE_KEYS, MAX_REDACT_DEPTH } from './redaction.constants'

export { SENSITIVE_KEYS } from './redaction.constants'

export function redactSensitiveFields(
  object: Record<string, unknown>,
  depth = 0
): Record<string, unknown> {
  const sanitized = new Map<string, unknown>()
  for (const [key, value] of Object.entries(object)) {
    if (SENSITIVE_KEYS.has(key)) {
      sanitized.set(key, '[REDACTED]')
    } else if (depth < MAX_REDACT_DEPTH && Array.isArray(value)) {
      sanitized.set(
        key,
        value.map(item =>
          item !== null && typeof item === 'object' && !Array.isArray(item)
            ? redactSensitiveFields(item as Record<string, unknown>, depth + 1)
            : item
        )
      )
    } else if (
      depth < MAX_REDACT_DEPTH &&
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      sanitized.set(key, redactSensitiveFields(value as Record<string, unknown>, depth + 1))
    } else {
      sanitized.set(key, value)
    }
  }
  return Object.fromEntries(sanitized)
}
