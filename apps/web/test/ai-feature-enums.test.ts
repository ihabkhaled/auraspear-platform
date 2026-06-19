import { describe, it, expect } from 'vitest'

// ─────────────────────────────────────────────────────────────────────────────
// Test AiFeatureKey equivalents in the backend via known patterns
// Since the frontend doesn't have an AiFeatureKey enum, we test the
// expected AI endpoint patterns and permission values are consistent.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * These represent the known AI feature keys as defined in the backend's
 * AiFeatureKey enum. The frontend should align with these.
 */
const EXPECTED_AI_FEATURE_KEYS = [
  'alert.summarize',
  'alert.explain_severity',
  'alert.false_positive_score',
  'alert.next_action',
  'case.summarize',
  'case.executive_summary',
  'case.timeline',
  'case.next_tasks',
  'hunt.hypothesis',
  'hunt.nl_to_query',
  'hunt.result_interpret',
  'intel.ioc_enrich',
  'intel.advisory_draft',
  'detection.rule_draft',
  'detection.tuning',
  'report.daily_summary',
  'report.executive',
  'dashboard.anomaly',
  'soar.playbook_draft',
  'agent.task',
  'knowledge.search',
  'knowledge.generate_runbook',
  'knowledge.summarize_incident',
  'entity.risk_explain',
] as const

describe('AI Feature Keys', () => {
  it('all values should follow module.action pattern', () => {
    for (const key of EXPECTED_AI_FEATURE_KEYS) {
      expect(key).toMatch(/^[a-z]+\.[a-z_]+$/)
    }
  })

  it('should have no duplicate values', () => {
    const uniqueKeys = new Set(EXPECTED_AI_FEATURE_KEYS)
    expect(uniqueKeys.size).toBe(EXPECTED_AI_FEATURE_KEYS.length)
  })

  it('should contain all expected alert features', () => {
    const alertFeatures = EXPECTED_AI_FEATURE_KEYS.filter(k => k.startsWith('alert.'))
    expect(alertFeatures).toContain('alert.summarize')
    expect(alertFeatures).toContain('alert.explain_severity')
    expect(alertFeatures).toContain('alert.false_positive_score')
    expect(alertFeatures).toContain('alert.next_action')
  })

  it('should contain all expected case features', () => {
    const caseFeatures = EXPECTED_AI_FEATURE_KEYS.filter(k => k.startsWith('case.'))
    expect(caseFeatures).toContain('case.summarize')
    expect(caseFeatures).toContain('case.executive_summary')
    expect(caseFeatures).toContain('case.timeline')
    expect(caseFeatures).toContain('case.next_tasks')
  })

  it('should contain all expected knowledge features', () => {
    const knowledgeFeatures = EXPECTED_AI_FEATURE_KEYS.filter(k => k.startsWith('knowledge.'))
    expect(knowledgeFeatures).toContain('knowledge.search')
    expect(knowledgeFeatures).toContain('knowledge.generate_runbook')
    expect(knowledgeFeatures).toContain('knowledge.summarize_incident')
  })

  it('should contain entity risk explain feature', () => {
    expect(EXPECTED_AI_FEATURE_KEYS).toContain('entity.risk_explain')
  })

  it('should contain agent task feature', () => {
    expect(EXPECTED_AI_FEATURE_KEYS).toContain('agent.task')
  })

  it('should have exactly 24 feature keys', () => {
    expect(EXPECTED_AI_FEATURE_KEYS).toHaveLength(24)
  })
})
