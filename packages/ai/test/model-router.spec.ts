import { describe, it, expect } from 'vitest'
import {
  AiProviderKind,
  DEFAULT_PROVIDER_ORDER,
  routeProviders,
  selectProvider,
  type AiProvider,
} from '../src/model-router.ts'

function provider(kind: AiProviderKind, overrides: Partial<AiProvider> = {}): AiProvider {
  return { kind, enabled: true, healthy: true, ...overrides }
}

describe('DEFAULT_PROVIDER_ORDER', () => {
  it('is bedrock → llm_apis → openclaw_gateway', () => {
    expect(DEFAULT_PROVIDER_ORDER).toEqual([
      AiProviderKind.BEDROCK,
      AiProviderKind.LLM_APIS,
      AiProviderKind.OPENCLAW_GATEWAY,
    ])
  })
})

describe('routeProviders', () => {
  it('orders usable providers by the default cascade regardless of input order', () => {
    const result = routeProviders([
      provider(AiProviderKind.OPENCLAW_GATEWAY),
      provider(AiProviderKind.BEDROCK),
      provider(AiProviderKind.LLM_APIS),
    ])
    expect(result.order.map(p => p.kind)).toEqual([
      AiProviderKind.BEDROCK,
      AiProviderKind.LLM_APIS,
      AiProviderKind.OPENCLAW_GATEWAY,
    ])
    expect(result.fallbackToRuleBased).toBe(false)
  })

  it('filters out disabled and unhealthy providers', () => {
    const result = routeProviders([
      provider(AiProviderKind.BEDROCK, { enabled: false }),
      provider(AiProviderKind.LLM_APIS, { healthy: false }),
      provider(AiProviderKind.OPENCLAW_GATEWAY),
    ])
    expect(result.order.map(p => p.kind)).toEqual([AiProviderKind.OPENCLAW_GATEWAY])
  })

  it('never routes to the rule-based pseudo-provider', () => {
    const result = routeProviders([
      provider(AiProviderKind.RULE_BASED),
      provider(AiProviderKind.BEDROCK),
    ])
    expect(result.order.map(p => p.kind)).toEqual([AiProviderKind.BEDROCK])
  })

  it('explicit priority overrides the cascade order (lower wins)', () => {
    const result = routeProviders([
      provider(AiProviderKind.BEDROCK, { priority: 5 }),
      provider(AiProviderKind.LLM_APIS),
    ])
    // BEDROCK's natural rank is 0, but priority 5 demotes it below LLM_APIS (rank 1).
    expect(result.order[0]?.kind).toBe(AiProviderKind.LLM_APIS)
  })

  it('falls back to rule-based when nothing is usable', () => {
    const result = routeProviders([provider(AiProviderKind.BEDROCK, { enabled: false })])
    expect(result.order).toEqual([])
    expect(result.fallbackToRuleBased).toBe(true)
  })

  it('ranks kinds absent from a custom order array last', () => {
    const customOrder = [AiProviderKind.LLM_APIS]
    const result = routeProviders(
      [provider(AiProviderKind.BEDROCK), provider(AiProviderKind.LLM_APIS)],
      customOrder
    )
    // LLM_APIS is in the custom order (rank 0); BEDROCK is absent (MAX) → last.
    expect(result.order.map(p => p.kind)).toEqual([AiProviderKind.LLM_APIS, AiProviderKind.BEDROCK])
  })
})

describe('selectProvider', () => {
  it('returns the single best provider', () => {
    const best = selectProvider([
      provider(AiProviderKind.LLM_APIS),
      provider(AiProviderKind.BEDROCK),
    ])
    expect(best?.kind).toBe(AiProviderKind.BEDROCK)
  })

  it('returns null when only rule-based remains', () => {
    expect(selectProvider([provider(AiProviderKind.BEDROCK, { healthy: false })])).toBeNull()
  })
})
