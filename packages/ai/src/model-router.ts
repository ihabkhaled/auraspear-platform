/**
 * Provider routing abstraction.
 *
 * Mirrors the platform's connector cascade: try every configured AI provider in
 * priority order (bedrock → llm_apis → openclaw_gateway) and use the first
 * healthy one; fall back to rule-based only when none are available. This module
 * is the provider-agnostic decision logic — actual SDK calls live in apps/api.
 */

export enum AiProviderKind {
  BEDROCK = 'bedrock',
  LLM_APIS = 'llm_apis',
  OPENCLAW_GATEWAY = 'openclaw_gateway',
  RULE_BASED = 'rule-based',
}

/** Default cascade order. Lower index = higher priority. */
export const DEFAULT_PROVIDER_ORDER: readonly AiProviderKind[] = [
  AiProviderKind.BEDROCK,
  AiProviderKind.LLM_APIS,
  AiProviderKind.OPENCLAW_GATEWAY,
]

export interface AiProvider {
  readonly kind: AiProviderKind
  readonly enabled: boolean
  readonly healthy: boolean
  /** Optional explicit priority override (lower wins). */
  readonly priority?: number
}

export interface RoutingResult {
  /** Providers to try, best-first. Empty → caller must use a rule-based fallback. */
  readonly order: readonly AiProvider[]
  readonly fallbackToRuleBased: boolean
}

function rank(kind: AiProviderKind, order: readonly AiProviderKind[]): number {
  const index = order.indexOf(kind)
  return index === -1 ? Number.MAX_SAFE_INTEGER : index
}

/**
 * Build the ordered list of usable providers. A provider is usable when it is
 * both `enabled` and `healthy`. Explicit `priority` overrides the cascade order.
 */
export function routeProviders(
  providers: readonly AiProvider[],
  order: readonly AiProviderKind[] = DEFAULT_PROVIDER_ORDER
): RoutingResult {
  const usable = providers
    .filter(p => p.enabled && p.healthy && p.kind !== AiProviderKind.RULE_BASED)
    .slice()
    .sort((a, b) => (a.priority ?? rank(a.kind, order)) - (b.priority ?? rank(b.kind, order)))
  return { order: usable, fallbackToRuleBased: usable.length === 0 }
}

/** Convenience: the single best provider, or null when only rule-based remains. */
export function selectProvider(
  providers: readonly AiProvider[],
  order: readonly AiProviderKind[] = DEFAULT_PROVIDER_ORDER
): AiProvider | null {
  return routeProviders(providers, order).order[0] ?? null
}
