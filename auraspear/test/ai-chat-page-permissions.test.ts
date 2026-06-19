import { describe, it, expect } from 'vitest'
import { Permission } from '@/enums'
import { hasPermission } from '@/lib/permissions'

/**
 * Tests the permission-based access logic used by useAiChatPage.
 *
 * useAiChatPage derives:
 *   canAccess = hasPermission(permissions, Permission.AI_CHAT_ACCESS)
 *
 * These tests verify the exact same logic without needing React rendering.
 */

function deriveAiChatPermissions(permissions: string[]) {
  const canAccess = hasPermission(permissions, Permission.AI_CHAT_ACCESS)
  return { canAccess }
}

// ─── Permission enum value ─────────────────────────────────────────

describe('AI Chat — Permission enum', () => {
  it('should have AI_CHAT_ACCESS = "ai.chat.access"', () => {
    expect(Permission.AI_CHAT_ACCESS).toBe('ai.chat.access')
  })

  it('should be a valid Permission enum member', () => {
    const values = Object.values(Permission) as string[]
    expect(values).toContain('ai.chat.access')
  })
})

// ─── canAccess ─────────────────────────────────────────────────────

describe('AI Chat page — canAccess', () => {
  it('is true when user has AI_CHAT_ACCESS permission', () => {
    const result = deriveAiChatPermissions([Permission.AI_CHAT_ACCESS])
    expect(result.canAccess).toBe(true)
  })

  it('is true when user has AI_CHAT_ACCESS among other permissions', () => {
    const result = deriveAiChatPermissions([
      Permission.DASHBOARD_VIEW,
      Permission.AI_CHAT_ACCESS,
      Permission.ALERTS_VIEW,
    ])
    expect(result.canAccess).toBe(true)
  })

  it('is false when user does not have AI_CHAT_ACCESS', () => {
    const result = deriveAiChatPermissions([Permission.DASHBOARD_VIEW, Permission.ALERTS_VIEW])
    expect(result.canAccess).toBe(false)
  })

  it('is false when permissions array is empty', () => {
    const result = deriveAiChatPermissions([])
    expect(result.canAccess).toBe(false)
  })

  it('is false when user has unrelated AI permissions but not AI_CHAT_ACCESS', () => {
    const otherAiPermissions = Object.values(Permission).filter(
      p => p.startsWith('ai.') && p !== Permission.AI_CHAT_ACCESS
    )
    // Only test if there are other ai.* permissions
    if (otherAiPermissions.length > 0) {
      const result = deriveAiChatPermissions(otherAiPermissions)
      expect(result.canAccess).toBe(false)
    }
  })
})

// ─── Full permission set (SOC Analyst with AI access) ──────────────

describe('AI Chat page — full permission set', () => {
  const fullPermissions = [
    Permission.DASHBOARD_VIEW,
    Permission.ALERTS_VIEW,
    Permission.CASES_VIEW,
    Permission.AI_CHAT_ACCESS,
  ]

  it('canAccess is true for a user with AI chat permission', () => {
    const result = deriveAiChatPermissions(fullPermissions)
    expect(result.canAccess).toBe(true)
  })
})

// ─── Read-only user without AI access ──────────────────────────────

describe('AI Chat page — read-only user without AI access', () => {
  const readOnlyPermissions = [Permission.DASHBOARD_VIEW, Permission.ALERTS_VIEW]

  it('canAccess is false for a read-only user', () => {
    const result = deriveAiChatPermissions(readOnlyPermissions)
    expect(result.canAccess).toBe(false)
  })
})
