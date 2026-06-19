import { REDACTED_PLACEHOLDER, SENSITIVE_KEYS } from './mask.constants'

export { REDACTED_PLACEHOLDER } from './mask.constants'

export function maskSecrets(data: Record<string, unknown>): Record<string, unknown> {
  const masked = new Map<string, unknown>()

  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.has(key) || SENSITIVE_KEYS.has(key.toLowerCase())) {
      masked.set(key, typeof value === 'string' && value.length > 0 ? REDACTED_PLACEHOLDER : value)
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      masked.set(key, maskSecrets(value as Record<string, unknown>))
    } else {
      masked.set(key, value)
    }
  }

  return Object.fromEntries(masked)
}
