import { describe, it, expect } from 'vitest'
import { redact, RedactionKind } from '../src/redaction.ts'

describe('redact', () => {
  it('redacts an RSA private key block', () => {
    const input =
      'key:\n-----BEGIN RSA PRIVATE KEY-----\nMIIBccccc\n-----END RSA PRIVATE KEY-----\n'
    const result = redact(input)
    expect(result.text).toContain('[REDACTED:private-key]')
    expect(result.text).not.toContain('MIIBccccc')
    expect(result.counts[RedactionKind.PRIVATE_KEY]).toBe(1)
    expect(result.redactedAny).toBe(true)
  })

  it('redacts a JWT', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NSJ9.abcDEF_-123'
    const result = redact(`token ${jwt} end`)
    expect(result.text).toBe('token [REDACTED:jwt] end')
    expect(result.counts[RedactionKind.JWT]).toBe(1)
  })

  it('redacts an AWS access key id', () => {
    const result = redact('aws AKIAIOSFODNN7EXAMPLE here')
    expect(result.text).toBe('aws [REDACTED:aws-access-key] here')
    expect(result.counts[RedactionKind.AWS_ACCESS_KEY]).toBe(1)
  })

  it('redacts a Bearer token but preserves the scheme word', () => {
    const result = redact('use Bearer abcdef0123456789xyz now')
    expect(result.text).toBe('use Bearer [REDACTED:token] now')
    expect(result.counts[RedactionKind.BEARER]).toBe(1)
  })

  it('double-redacts an Authorization header (generic-secret + bearer, defense in depth)', () => {
    const result = redact('Authorization: Bearer abcdef0123456789xyz')
    // "Authorization" contains "auth" so the generic-secret rule also fires.
    expect(result.text).not.toContain('abcdef0123456789xyz')
    expect(result.redactedAny).toBe(true)
  })

  it('does NOT redact a too-short Bearer token', () => {
    const result = redact('Bearer short')
    expect(result.text).toBe('Bearer short')
    expect(result.counts[RedactionKind.BEARER]).toBe(0)
    expect(result.redactedAny).toBe(false)
  })

  it('redacts a generic key=value secret and preserves the key name (capture group)', () => {
    const result = redact('api_key=supersecret123')
    expect(result.text).toBe('api_key=[REDACTED:secret]')
    expect(result.counts[RedactionKind.GENERIC_SECRET]).toBe(1)
  })

  it('redacts a quoted secret with a colon separator', () => {
    const result = redact('password: "hunter2pass"')
    expect(result.text).toContain('[REDACTED:secret]')
    expect(result.counts[RedactionKind.GENERIC_SECRET]).toBe(1)
  })

  it('redacts email addresses and counts each one', () => {
    const result = redact('mail alice@example.com and bob@corp.io')
    expect(result.text).toBe('mail [REDACTED:email] and [REDACTED:email]')
    expect(result.counts[RedactionKind.EMAIL]).toBe(2)
  })

  it('redacts IPv4 addresses', () => {
    const result = redact('host 10.0.0.5 and 192.168.1.254')
    expect(result.text).toBe('host [REDACTED:ipv4] and [REDACTED:ipv4]')
    expect(result.counts[RedactionKind.IPV4]).toBe(2)
  })

  it('honors the keep allow-list (e.g. keep IPs under investigation)', () => {
    const result = redact('attacker 203.0.113.7', [RedactionKind.IPV4])
    expect(result.text).toBe('attacker 203.0.113.7')
    expect(result.counts[RedactionKind.IPV4]).toBe(0)
    expect(result.redactedAny).toBe(false)
  })

  it('returns redactedAny=false and zero counts for clean text', () => {
    const result = redact('The quick brown fox jumped over the lazy dog.')
    expect(result.redactedAny).toBe(false)
    for (const kind of Object.values(RedactionKind)) {
      expect(result.counts[kind]).toBe(0)
    }
  })

  it('is idempotent across calls (global regex lastIndex is reset)', () => {
    const input = 'a@b.com and 1.2.3.4'
    const first = redact(input)
    const second = redact(input)
    expect(second.text).toEqual(first.text)
    expect(second.counts).toEqual(first.counts)
  })

  it('redacts multiple kinds in one pass and reports redactedAny', () => {
    const input = 'user a@b.com from 8.8.8.8 with token=abcdef123456'
    const result = redact(input)
    expect(result.text).toContain('[REDACTED:email]')
    expect(result.text).toContain('[REDACTED:ipv4]')
    expect(result.text).toContain('[REDACTED:secret]')
    expect(result.redactedAny).toBe(true)
  })
})
