import { describe, it, expect } from 'vitest'
import { AiActionCategory, RiskLevel, evaluateApproval, type AiAction } from '../src/safety.ts'

function action(overrides: Partial<AiAction>): AiAction {
  return {
    id: 'a1',
    category: AiActionCategory.SUGGESTED,
    risk: RiskLevel.LOW,
    destructive: false,
    ...overrides,
  }
}

describe('AiActionCategory enum values', () => {
  it('uses hyphenated string values (the @auraspear/ai contract)', () => {
    expect(AiActionCategory.ANALYSIS_ONLY).toBe('analysis-only')
    expect(AiActionCategory.APPROVAL_REQUIRED).toBe('approval-required')
    expect(AiActionCategory.AUTO_ALLOWED).toBe('auto-allowed')
    expect(AiActionCategory.SUGGESTED).toBe('suggested')
  })
})

describe('evaluateApproval', () => {
  it('analysis-only never requires approval', () => {
    const d = evaluateApproval(
      action({
        category: AiActionCategory.ANALYSIS_ONLY,
        destructive: true,
        risk: RiskLevel.CRITICAL,
      })
    )
    expect(d.requiresApproval).toBe(false)
    expect(d.reason).toMatch(/no side effects/i)
  })

  it('approval-required always requires approval', () => {
    const d = evaluateApproval(action({ category: AiActionCategory.APPROVAL_REQUIRED }))
    expect(d.requiresApproval).toBe(true)
    expect(d.reason).toMatch(/approval-required/i)
  })

  it('destructive actions always require approval (even auto-allowed)', () => {
    const d = evaluateApproval(
      action({ category: AiActionCategory.AUTO_ALLOWED, destructive: true })
    )
    expect(d.requiresApproval).toBe(true)
    expect(d.reason).toMatch(/destructive/i)
  })

  it('high-risk non-destructive auto-allowed still requires approval', () => {
    const d = evaluateApproval(
      action({ category: AiActionCategory.AUTO_ALLOWED, risk: RiskLevel.HIGH })
    )
    expect(d.requiresApproval).toBe(true)
    expect(d.reason).toMatch(/risk/i)
  })

  it('critical-risk suggested requires approval', () => {
    const d = evaluateApproval(
      action({ category: AiActionCategory.SUGGESTED, risk: RiskLevel.CRITICAL })
    )
    expect(d.requiresApproval).toBe(true)
  })

  it('auto-allowed non-destructive low/medium risk bypasses approval', () => {
    expect(
      evaluateApproval(action({ category: AiActionCategory.AUTO_ALLOWED, risk: RiskLevel.LOW }))
        .requiresApproval
    ).toBe(false)
    const med = evaluateApproval(
      action({ category: AiActionCategory.AUTO_ALLOWED, risk: RiskLevel.MEDIUM })
    )
    expect(med.requiresApproval).toBe(false)
    expect(med.reason).toMatch(/allow-listed/i)
  })

  it('suggested non-destructive low risk falls through to requiring a human', () => {
    const d = evaluateApproval(action({ category: AiActionCategory.SUGGESTED }))
    expect(d.requiresApproval).toBe(true)
    expect(d.reason).toMatch(/human/i)
  })
})
