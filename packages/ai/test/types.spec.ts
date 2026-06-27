import { describe, it, expect } from 'vitest'
import { IocType, isHighConfidence, type AiProvenance } from '../src/types.ts'
import { AiProviderKind } from '../src/model-router.ts'

function provenance(confidence?: number): AiProvenance {
  return {
    provider: AiProviderKind.BEDROCK,
    model: 'claude-3',
    generatedAtIso: '2026-06-22T00:00:00.000Z',
    ...(confidence === undefined ? {} : { confidence }),
  }
}

describe('isHighConfidence', () => {
  it('is true at or above the default 0.7 threshold', () => {
    expect(isHighConfidence(provenance(0.7))).toBe(true)
    expect(isHighConfidence(provenance(0.95))).toBe(true)
  })

  it('is false below the default threshold', () => {
    expect(isHighConfidence(provenance(0.5))).toBe(false)
  })

  it('is false when confidence is omitted', () => {
    expect(isHighConfidence(provenance())).toBe(false)
  })

  it('respects a custom threshold', () => {
    expect(isHighConfidence(provenance(0.8), 0.9)).toBe(false)
    expect(isHighConfidence(provenance(0.95), 0.9)).toBe(true)
  })
})

describe('IocType enum', () => {
  it('exposes the expected IOC kinds', () => {
    expect(IocType.IP).toBe('ip')
    expect(IocType.DOMAIN).toBe('domain')
    expect(IocType.URL).toBe('url')
    expect(IocType.HASH).toBe('hash')
    expect(IocType.EMAIL).toBe('email')
  })
})
