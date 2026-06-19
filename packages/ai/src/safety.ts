/**
 * AI action safety + approval policy.
 *
 * Every AI-proposed action is classified so the UI and orchestrator can decide
 * whether it may run automatically, needs a human approval, or is analysis-only.
 * Mirrors the platform rule: "AI must not silently execute destructive actions."
 */

export enum AiActionCategory {
  /** Read-only reasoning/summarization. No side effects. */
  ANALYSIS_ONLY = 'analysis-only',
  /** A recommendation the analyst may act on manually. */
  SUGGESTED = 'suggested',
  /** A side-effecting action that requires explicit human approval first. */
  APPROVAL_REQUIRED = 'approval-required',
  /** Pre-authorized low-risk automation (must be allow-listed per tenant). */
  AUTO_ALLOWED = 'auto-allowed',
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface AiAction {
  readonly id: string
  readonly category: AiActionCategory
  readonly risk: RiskLevel
  /** Whether the action mutates state outside AuraSpear (e.g. runs a playbook). */
  readonly destructive: boolean
}

export interface ApprovalDecision {
  readonly requiresApproval: boolean
  readonly reason: string
}

const HIGH_RISK = new Set<RiskLevel>([RiskLevel.HIGH, RiskLevel.CRITICAL])

/**
 * Decide whether a human must approve an action before it executes.
 * Conservative by design: anything destructive or high-risk needs approval,
 * and AUTO_ALLOWED only bypasses approval for non-destructive, low/medium risk.
 */
export function evaluateApproval(action: AiAction): ApprovalDecision {
  if (action.category === AiActionCategory.ANALYSIS_ONLY) {
    return { requiresApproval: false, reason: 'Analysis-only action has no side effects.' }
  }
  if (action.category === AiActionCategory.APPROVAL_REQUIRED) {
    return { requiresApproval: true, reason: 'Action is explicitly marked approval-required.' }
  }
  if (action.destructive) {
    return { requiresApproval: true, reason: 'Destructive actions always require approval.' }
  }
  if (HIGH_RISK.has(action.risk)) {
    return { requiresApproval: true, reason: `Risk level "${action.risk}" requires approval.` }
  }
  if (action.category === AiActionCategory.AUTO_ALLOWED) {
    return { requiresApproval: false, reason: 'Non-destructive, allow-listed automation.' }
  }
  return { requiresApproval: true, reason: 'Suggested actions require a human to act.' }
}
