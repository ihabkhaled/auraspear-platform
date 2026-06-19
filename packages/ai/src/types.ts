/**
 * Structured AI output contracts shared across the platform. Every AI result is
 * attributable (provider/model), confidence-scored, and source-cited so the UI
 * can show provenance and the audit log can trace it.
 */
import type { AiActionCategory, RiskLevel } from './safety.ts'
import type { AiProviderKind } from './model-router.ts'

export interface AiProvenance {
  readonly provider: AiProviderKind
  readonly model: string
  /** 0..1. Omitted when the provider cannot express calibrated confidence. */
  readonly confidence?: number
  readonly promptVersion?: string
  readonly tokensIn?: number
  readonly tokensOut?: number
  readonly generatedAtIso: string
}

export interface AiCitation {
  readonly label: string
  /** e.g. connector name, alert id, MISP event — where the claim came from. */
  readonly sourceRef: string
}

export interface AiFinding {
  readonly id: string
  readonly title: string
  readonly summary: string
  readonly severity: RiskLevel
  readonly category: AiActionCategory
  readonly recommendation?: string
  readonly mitreTechniqueIds: readonly string[]
  readonly citations: readonly AiCitation[]
  readonly provenance: AiProvenance
}

export interface RiskScore {
  /** 0..100, explainable. */
  readonly score: number
  readonly level: RiskLevel
  readonly factors: readonly {
    readonly name: string
    readonly weight: number
    readonly detail: string
  }[]
  readonly provenance: AiProvenance
}

export enum IocType {
  IP = 'ip',
  DOMAIN = 'domain',
  URL = 'url',
  HASH = 'hash',
  EMAIL = 'email',
}

export interface IocEnrichment {
  readonly ioc: string
  readonly type: IocType
  readonly malicious: boolean
  readonly falsePositiveLikelihood: number // 0..1
  readonly tenantHistoryHits: number
  readonly citations: readonly AiCitation[]
  readonly provenance: AiProvenance
}

export function isHighConfidence(p: AiProvenance, threshold = 0.7): boolean {
  return typeof p.confidence === 'number' && p.confidence >= threshold
}
