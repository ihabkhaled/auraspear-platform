/**
 * PII / secret redaction for AI inputs and transcripts.
 *
 * Use BEFORE sending context to a model and BEFORE persisting transcripts, so
 * credentials and obvious PII never leave the tenant boundary or land in logs.
 * Pattern-based (no network); conservative and side-effect free.
 */

export enum RedactionKind {
  EMAIL = 'email',
  IPV4 = 'ipv4',
  JWT = 'jwt',
  AWS_ACCESS_KEY = 'aws-access-key',
  BEARER = 'bearer-token',
  PRIVATE_KEY = 'private-key',
  GENERIC_SECRET = 'generic-secret',
}

export interface RedactionRule {
  readonly kind: RedactionKind
  readonly pattern: RegExp
  readonly replacement: string
}

// Order matters: more specific patterns first.
const RULES: readonly RedactionRule[] = [
  {
    kind: RedactionKind.PRIVATE_KEY,
    pattern:
      /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/g,
    replacement: '[REDACTED:private-key]',
  },
  {
    kind: RedactionKind.JWT,
    pattern: /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    replacement: '[REDACTED:jwt]',
  },
  {
    kind: RedactionKind.AWS_ACCESS_KEY,
    pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g,
    replacement: '[REDACTED:aws-access-key]',
  },
  {
    kind: RedactionKind.BEARER,
    pattern: /\bBearer\s+[A-Za-z0-9._-]{12,}\b/g,
    replacement: 'Bearer [REDACTED:token]',
  },
  {
    kind: RedactionKind.GENERIC_SECRET,
    // key/secret/password/token = <value>
    pattern:
      /\b([A-Za-z0-9_]*(?:secret|password|passwd|api[_-]?key|token|auth)[A-Za-z0-9_]*)\s*[:=]\s*["']?[^\s"']{6,}["']?/gi,
    replacement: '$1=[REDACTED:secret]',
  },
  {
    kind: RedactionKind.EMAIL,
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    replacement: '[REDACTED:email]',
  },
  {
    kind: RedactionKind.IPV4,
    pattern: /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g,
    replacement: '[REDACTED:ipv4]',
  },
]

export interface RedactionResult {
  readonly text: string
  readonly counts: Readonly<Record<RedactionKind, number>>
  readonly redactedAny: boolean
}

/**
 * Redact secrets/PII from `input`. Pass `keep` to disable specific kinds (e.g.
 * keep IPs when they are the very thing under investigation).
 */
export function redact(input: string, keep: readonly RedactionKind[] = []): RedactionResult {
  const skip = new Set(keep)
  const counts = Object.fromEntries(Object.values(RedactionKind).map(k => [k, 0])) as Record<
    RedactionKind,
    number
  >
  let text = input
  for (const rule of RULES) {
    if (skip.has(rule.kind)) continue
    text = text.replace(rule.pattern, (...args) => {
      counts[rule.kind] += 1
      // Preserve capture group 1 for the GENERIC_SECRET rule.
      const groups = args.slice(1, -2)
      return rule.replacement.replace('$1', typeof groups[0] === 'string' ? groups[0] : '')
    })
  }
  const redactedAny = Object.values(counts).some(n => n > 0)
  return { text, counts, redactedAny }
}
