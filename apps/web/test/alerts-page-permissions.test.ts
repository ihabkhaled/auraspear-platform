import { describe, it, expect } from 'vitest'
import { Permission } from '@/enums'
import { hasPermission } from '@/lib/permissions'

/**
 * Tests the permission-based visibility logic used by useAlertsPage.
 *
 * useAlertsPage derives these booleans:
 *   canInvestigate = hasPermission(permissions, Permission.ALERTS_INVESTIGATE)
 *   canAcknowledge = hasPermission(permissions, Permission.ALERTS_ACKNOWLEDGE)
 *   canClose       = hasPermission(permissions, Permission.ALERTS_CLOSE)
 *   canEscalate    = hasPermission(permissions, Permission.ALERTS_ESCALATE)
 *                    && hasPermission(permissions, Permission.INCIDENTS_CREATE)
 *   canCreateCase  = hasPermission(permissions, Permission.CASES_CREATE)
 *   canSelect      = canAcknowledge || canClose
 *
 * These tests verify the exact same logic without needing React rendering.
 */

function deriveAlertPermissions(permissions: string[]) {
  const canInvestigate = hasPermission(permissions, Permission.ALERTS_INVESTIGATE)
  const canAcknowledge = hasPermission(permissions, Permission.ALERTS_ACKNOWLEDGE)
  const canClose = hasPermission(permissions, Permission.ALERTS_CLOSE)
  const canEscalate =
    hasPermission(permissions, Permission.ALERTS_ESCALATE) &&
    hasPermission(permissions, Permission.INCIDENTS_CREATE)
  const canCreateCase = hasPermission(permissions, Permission.CASES_CREATE)
  const canSelect = canAcknowledge || canClose

  return { canInvestigate, canAcknowledge, canClose, canEscalate, canCreateCase, canSelect }
}

// ─── canSelect ──────────────────────────────────────────────────

describe('alerts page — canSelect', () => {
  it('is true when user has ALERTS_ACKNOWLEDGE', () => {
    const result = deriveAlertPermissions([Permission.ALERTS_ACKNOWLEDGE])
    expect(result.canSelect).toBe(true)
  })

  it('is true when user has ALERTS_CLOSE', () => {
    const result = deriveAlertPermissions([Permission.ALERTS_CLOSE])
    expect(result.canSelect).toBe(true)
  })

  it('is true when user has both ALERTS_ACKNOWLEDGE and ALERTS_CLOSE', () => {
    const result = deriveAlertPermissions([Permission.ALERTS_ACKNOWLEDGE, Permission.ALERTS_CLOSE])
    expect(result.canSelect).toBe(true)
  })

  it('is false when user has neither ALERTS_ACKNOWLEDGE nor ALERTS_CLOSE', () => {
    const result = deriveAlertPermissions([Permission.ALERTS_VIEW, Permission.CASES_VIEW])
    expect(result.canSelect).toBe(false)
  })

  it('is false when permissions array is empty', () => {
    const result = deriveAlertPermissions([])
    expect(result.canSelect).toBe(false)
  })
})

// ─── canEscalate ────────────────────────────────────────────────

describe('alerts page — canEscalate', () => {
  it('is true when user has both ALERTS_ESCALATE and INCIDENTS_CREATE', () => {
    const result = deriveAlertPermissions([Permission.ALERTS_ESCALATE, Permission.INCIDENTS_CREATE])
    expect(result.canEscalate).toBe(true)
  })

  it('is false when user has only ALERTS_ESCALATE (missing INCIDENTS_CREATE)', () => {
    const result = deriveAlertPermissions([Permission.ALERTS_ESCALATE])
    expect(result.canEscalate).toBe(false)
  })

  it('is false when user has only INCIDENTS_CREATE (missing ALERTS_ESCALATE)', () => {
    const result = deriveAlertPermissions([Permission.INCIDENTS_CREATE])
    expect(result.canEscalate).toBe(false)
  })

  it('is false when user has neither permission', () => {
    const result = deriveAlertPermissions([Permission.ALERTS_VIEW])
    expect(result.canEscalate).toBe(false)
  })

  it('is false when permissions array is empty', () => {
    const result = deriveAlertPermissions([])
    expect(result.canEscalate).toBe(false)
  })
})

// ─── canInvestigate ─────────────────────────────────────────────

describe('alerts page — canInvestigate', () => {
  it('is true when user has ALERTS_INVESTIGATE', () => {
    const result = deriveAlertPermissions([Permission.ALERTS_INVESTIGATE])
    expect(result.canInvestigate).toBe(true)
  })

  it('is false when user does not have ALERTS_INVESTIGATE', () => {
    const result = deriveAlertPermissions([Permission.ALERTS_VIEW, Permission.ALERTS_ACKNOWLEDGE])
    expect(result.canInvestigate).toBe(false)
  })

  it('is false when permissions array is empty', () => {
    const result = deriveAlertPermissions([])
    expect(result.canInvestigate).toBe(false)
  })
})

// ─── canAcknowledge ─────────────────────────────────────────────

describe('alerts page — canAcknowledge', () => {
  it('is true when user has ALERTS_ACKNOWLEDGE', () => {
    const result = deriveAlertPermissions([Permission.ALERTS_ACKNOWLEDGE])
    expect(result.canAcknowledge).toBe(true)
  })

  it('is false when user does not have ALERTS_ACKNOWLEDGE', () => {
    const result = deriveAlertPermissions([Permission.ALERTS_VIEW])
    expect(result.canAcknowledge).toBe(false)
  })
})

// ─── canClose ───────────────────────────────────────────────────

describe('alerts page — canClose', () => {
  it('is true when user has ALERTS_CLOSE', () => {
    const result = deriveAlertPermissions([Permission.ALERTS_CLOSE])
    expect(result.canClose).toBe(true)
  })

  it('is false when user does not have ALERTS_CLOSE', () => {
    const result = deriveAlertPermissions([Permission.ALERTS_VIEW])
    expect(result.canClose).toBe(false)
  })
})

// ─── canCreateCase ──────────────────────────────────────────────

describe('alerts page — canCreateCase', () => {
  it('is true when user has CASES_CREATE', () => {
    const result = deriveAlertPermissions([Permission.CASES_CREATE])
    expect(result.canCreateCase).toBe(true)
  })

  it('is false when user does not have CASES_CREATE', () => {
    const result = deriveAlertPermissions([Permission.ALERTS_VIEW])
    expect(result.canCreateCase).toBe(false)
  })
})

// ─── Full permission set (SOC Analyst L2 scenario) ──────────────

describe('alerts page — full permission set (SOC Analyst L2)', () => {
  const socL2Permissions = [
    Permission.ALERTS_VIEW,
    Permission.ALERTS_INVESTIGATE,
    Permission.ALERTS_ACKNOWLEDGE,
    Permission.ALERTS_CLOSE,
    Permission.ALERTS_ESCALATE,
    Permission.INCIDENTS_CREATE,
    Permission.CASES_VIEW,
    Permission.CASES_CREATE,
  ]

  it('all alert capabilities are true for a fully permissioned user', () => {
    const result = deriveAlertPermissions(socL2Permissions)
    expect(result.canInvestigate).toBe(true)
    expect(result.canAcknowledge).toBe(true)
    expect(result.canClose).toBe(true)
    expect(result.canEscalate).toBe(true)
    expect(result.canCreateCase).toBe(true)
    expect(result.canSelect).toBe(true)
  })
})

// ─── Minimal read-only user ─────────────────────────────────────

describe('alerts page — read-only user', () => {
  const readOnlyPermissions = [Permission.ALERTS_VIEW, Permission.DASHBOARD_VIEW]

  it('all action capabilities are false for a read-only user', () => {
    const result = deriveAlertPermissions(readOnlyPermissions)
    expect(result.canInvestigate).toBe(false)
    expect(result.canAcknowledge).toBe(false)
    expect(result.canClose).toBe(false)
    expect(result.canEscalate).toBe(false)
    expect(result.canCreateCase).toBe(false)
    expect(result.canSelect).toBe(false)
  })
})
