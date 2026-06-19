import { BusinessException } from '../../src/common/exceptions/business.exception'
import {
  MembershipStatus,
  ROLE_HIERARCHY,
  UserRole,
} from '../../src/common/interfaces/authenticated-request.interface'
import type { JwtPayload } from '../../src/common/interfaces/authenticated-request.interface'

/**
 * Unit tests for impersonation business logic.
 *
 * These tests validate the core impersonation rules without requiring
 * a running database or NestJS DI container. They mirror the validation
 * steps in TenantsService.impersonateUser and AuthService.endImpersonation.
 */

// ─── Helpers ─────────────────────────────────────────────────────

function makeCaller(overrides: Partial<JwtPayload> = {}): JwtPayload {
  return {
    sub: 'admin-id',
    email: 'admin@example.com',
    tenantId: 'tenant-1',
    tenantSlug: 'acme',
    role: UserRole.GLOBAL_ADMIN,
    ...overrides,
  }
}

/**
 * Validates impersonation preconditions — extracted from TenantsService logic.
 * Throws BusinessException when a rule is violated.
 */
function validateImpersonation(
  caller: JwtPayload,
  targetUserId: string,
  targetUser: { id: string; isProtected: boolean } | null,
  targetMembership: { status: string; role: string } | null
): void {
  // 1. Reject nested impersonation
  if (caller.isImpersonated === true) {
    throw new BusinessException(
      403,
      'Cannot impersonate while already impersonating',
      'errors.impersonation.nestedNotAllowed'
    )
  }

  // 2. Cannot impersonate self
  if (caller.sub === targetUserId) {
    throw new BusinessException(
      400,
      'Cannot impersonate yourself',
      'errors.impersonation.cannotImpersonateSelf'
    )
  }

  // 3. Target user must exist
  if (!targetUser) {
    throw new BusinessException(404, 'Target user not found', 'errors.impersonation.userNotFound')
  }

  // 4. Cannot impersonate protected users
  if (targetUser.isProtected) {
    throw new BusinessException(
      403,
      'Protected users cannot be impersonated',
      'errors.impersonation.protectedUser'
    )
  }

  // 5. Target must have active membership
  if (targetMembership?.status !== MembershipStatus.ACTIVE) {
    throw new BusinessException(
      403,
      'Target user is not active in this tenant',
      'errors.impersonation.userNotActive'
    )
  }

  // 6. Role hierarchy — caller must be strictly more privileged
  const callerIndex = ROLE_HIERARCHY.indexOf(caller.role)
  const targetIndex = ROLE_HIERARCHY.indexOf(targetMembership.role as UserRole)

  if (callerIndex === -1 || targetIndex === -1) {
    throw new BusinessException(
      403,
      'Invalid role hierarchy',
      'errors.impersonation.insufficientPrivilege'
    )
  }

  if (callerIndex >= targetIndex) {
    throw new BusinessException(
      403,
      'Cannot impersonate a user with equal or higher privileges',
      'errors.impersonation.insufficientPrivilege'
    )
  }
}

/**
 * Validates end-impersonation preconditions — extracted from AuthService logic.
 */
function validateEndImpersonation(caller: JwtPayload): void {
  if (caller.isImpersonated !== true || !caller.impersonatorSub) {
    throw new BusinessException(
      400,
      'Not currently impersonating',
      'errors.impersonation.notImpersonating'
    )
  }
}

// ─── Tests: Impersonation Validation ─────────────────────────────

describe('Impersonation Validation', () => {
  const activeTarget = { id: 'target-id', isProtected: false }
  const activeMembership = { status: MembershipStatus.ACTIVE, role: UserRole.SOC_ANALYST_L1 }

  describe('nested impersonation prevention', () => {
    it('should reject when caller is already impersonating', () => {
      const caller = makeCaller({ isImpersonated: true, impersonatorSub: 'other' })
      expect(() =>
        validateImpersonation(caller, 'target-id', activeTarget, activeMembership)
      ).toThrow(BusinessException)

      try {
        validateImpersonation(caller, 'target-id', activeTarget, activeMembership)
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).messageKey).toBe(
          'errors.impersonation.nestedNotAllowed'
        )
      }
    })
  })

  describe('self-impersonation prevention', () => {
    it('should reject when caller tries to impersonate themselves', () => {
      const caller = makeCaller({ sub: 'same-user-id' })
      expect(() =>
        validateImpersonation(caller, 'same-user-id', activeTarget, activeMembership)
      ).toThrow(BusinessException)

      try {
        validateImpersonation(caller, 'same-user-id', activeTarget, activeMembership)
      } catch (error) {
        expect((error as BusinessException).messageKey).toBe(
          'errors.impersonation.cannotImpersonateSelf'
        )
      }
    })
  })

  describe('target user existence', () => {
    it('should reject when target user does not exist', () => {
      const caller = makeCaller()
      expect(() => validateImpersonation(caller, 'nonexistent', null, activeMembership)).toThrow(
        BusinessException
      )

      try {
        validateImpersonation(caller, 'nonexistent', null, activeMembership)
      } catch (error) {
        expect((error as BusinessException).messageKey).toBe('errors.impersonation.userNotFound')
      }
    })
  })

  describe('protected user prevention', () => {
    it('should reject when target user is protected', () => {
      const caller = makeCaller()
      const protectedTarget = { id: 'target-id', isProtected: true }
      expect(() =>
        validateImpersonation(caller, 'target-id', protectedTarget, activeMembership)
      ).toThrow(BusinessException)

      try {
        validateImpersonation(caller, 'target-id', protectedTarget, activeMembership)
      } catch (error) {
        expect((error as BusinessException).messageKey).toBe('errors.impersonation.protectedUser')
      }
    })
  })

  describe('membership status check', () => {
    it('should reject when target has no membership', () => {
      const caller = makeCaller()
      expect(() => validateImpersonation(caller, 'target-id', activeTarget, null)).toThrow(
        BusinessException
      )

      try {
        validateImpersonation(caller, 'target-id', activeTarget, null)
      } catch (error) {
        expect((error as BusinessException).messageKey).toBe('errors.impersonation.userNotActive')
      }
    })

    it('should reject when target membership is inactive', () => {
      const caller = makeCaller()
      const inactiveMembership = {
        status: MembershipStatus.INACTIVE,
        role: UserRole.SOC_ANALYST_L1,
      }
      expect(() =>
        validateImpersonation(caller, 'target-id', activeTarget, inactiveMembership)
      ).toThrow(BusinessException)
    })

    it('should reject when target membership is suspended', () => {
      const caller = makeCaller()
      const suspendedMembership = {
        status: MembershipStatus.SUSPENDED,
        role: UserRole.SOC_ANALYST_L1,
      }
      expect(() =>
        validateImpersonation(caller, 'target-id', activeTarget, suspendedMembership)
      ).toThrow(BusinessException)
    })
  })

  describe('role hierarchy enforcement', () => {
    it('should allow GLOBAL_ADMIN to impersonate TENANT_ADMIN', () => {
      const caller = makeCaller({ role: UserRole.GLOBAL_ADMIN })
      const membership = { status: MembershipStatus.ACTIVE, role: UserRole.TENANT_ADMIN }
      expect(() =>
        validateImpersonation(caller, 'target-id', activeTarget, membership)
      ).not.toThrow()
    })

    it('should allow GLOBAL_ADMIN to impersonate SOC_ANALYST_L1', () => {
      const caller = makeCaller({ role: UserRole.GLOBAL_ADMIN })
      const membership = { status: MembershipStatus.ACTIVE, role: UserRole.SOC_ANALYST_L1 }
      expect(() =>
        validateImpersonation(caller, 'target-id', activeTarget, membership)
      ).not.toThrow()
    })

    it('should allow GLOBAL_ADMIN to impersonate EXECUTIVE_READONLY', () => {
      const caller = makeCaller({ role: UserRole.GLOBAL_ADMIN })
      const membership = { status: MembershipStatus.ACTIVE, role: UserRole.EXECUTIVE_READONLY }
      expect(() =>
        validateImpersonation(caller, 'target-id', activeTarget, membership)
      ).not.toThrow()
    })

    it('should allow TENANT_ADMIN to impersonate SOC_ANALYST_L2', () => {
      const caller = makeCaller({ role: UserRole.TENANT_ADMIN })
      const membership = { status: MembershipStatus.ACTIVE, role: UserRole.SOC_ANALYST_L2 }
      expect(() =>
        validateImpersonation(caller, 'target-id', activeTarget, membership)
      ).not.toThrow()
    })

    it('should reject TENANT_ADMIN impersonating GLOBAL_ADMIN', () => {
      const caller = makeCaller({ role: UserRole.TENANT_ADMIN })
      const membership = { status: MembershipStatus.ACTIVE, role: UserRole.GLOBAL_ADMIN }
      expect(() => validateImpersonation(caller, 'target-id', activeTarget, membership)).toThrow(
        BusinessException
      )
    })

    it('should reject TENANT_ADMIN impersonating another TENANT_ADMIN (same level)', () => {
      const caller = makeCaller({ role: UserRole.TENANT_ADMIN })
      const membership = { status: MembershipStatus.ACTIVE, role: UserRole.TENANT_ADMIN }
      expect(() => validateImpersonation(caller, 'target-id', activeTarget, membership)).toThrow(
        BusinessException
      )
    })

    it('should reject SOC_ANALYST_L1 impersonating TENANT_ADMIN', () => {
      const caller = makeCaller({ role: UserRole.SOC_ANALYST_L1 })
      const membership = { status: MembershipStatus.ACTIVE, role: UserRole.TENANT_ADMIN }
      expect(() => validateImpersonation(caller, 'target-id', activeTarget, membership)).toThrow(
        BusinessException
      )
    })

    it('should reject SOC_ANALYST_L1 impersonating SOC_ANALYST_L1 (same level)', () => {
      const caller = makeCaller({ role: UserRole.SOC_ANALYST_L1 })
      const membership = { status: MembershipStatus.ACTIVE, role: UserRole.SOC_ANALYST_L1 }
      expect(() => validateImpersonation(caller, 'target-id', activeTarget, membership)).toThrow(
        BusinessException
      )
    })

    it('should allow SOC_ANALYST_L2 to impersonate SOC_ANALYST_L1', () => {
      const caller = makeCaller({ role: UserRole.SOC_ANALYST_L2 })
      const membership = { status: MembershipStatus.ACTIVE, role: UserRole.SOC_ANALYST_L1 }
      expect(() =>
        validateImpersonation(caller, 'target-id', activeTarget, membership)
      ).not.toThrow()
    })
  })

  describe('successful validation', () => {
    it('should pass all checks for a valid impersonation', () => {
      const caller = makeCaller({ sub: 'admin-id', role: UserRole.GLOBAL_ADMIN })
      expect(() =>
        validateImpersonation(caller, 'target-id', activeTarget, activeMembership)
      ).not.toThrow()
    })
  })
})

// ─── Tests: End Impersonation Validation ─────────────────────────

describe('End Impersonation Validation', () => {
  it('should reject when caller is not impersonating (no flag)', () => {
    const caller = makeCaller()
    expect(() => validateEndImpersonation(caller)).toThrow(BusinessException)

    try {
      validateEndImpersonation(caller)
    } catch (error) {
      expect((error as BusinessException).messageKey).toBe('errors.impersonation.notImpersonating')
    }
  })

  it('should reject when isImpersonated is true but impersonatorSub is missing', () => {
    const caller = makeCaller({ isImpersonated: true })
    expect(() => validateEndImpersonation(caller)).toThrow(BusinessException)
  })

  it('should accept when caller has valid impersonation claims', () => {
    const caller = makeCaller({
      isImpersonated: true,
      impersonatorSub: 'original-admin',
      impersonatorEmail: 'admin@example.com',
    })
    expect(() => validateEndImpersonation(caller)).not.toThrow()
  })
})

// ─── Tests: Role Hierarchy ───────────────────────────────────────

describe('ROLE_HIERARCHY', () => {
  it('should have GLOBAL_ADMIN as most privileged (index 0)', () => {
    expect(ROLE_HIERARCHY[0]).toBe(UserRole.GLOBAL_ADMIN)
  })

  it('should have AUDITOR_READONLY as least privileged (last)', () => {
    expect(ROLE_HIERARCHY[ROLE_HIERARCHY.length - 1]).toBe(UserRole.AUDITOR_READONLY)
  })

  it('should contain all UserRole values', () => {
    const allRoles = Object.values(UserRole)
    for (const role of allRoles) {
      expect(ROLE_HIERARCHY).toContain(role)
    }
  })

  it('should have no duplicate roles', () => {
    const uniqueRoles = new Set(ROLE_HIERARCHY)
    expect(uniqueRoles.size).toBe(ROLE_HIERARCHY.length)
  })
})

// ─── Tests: JWT Impersonation Claims Preservation ────────────────

describe('JWT Impersonation Claims', () => {
  it('should define JwtPayload with optional impersonation fields', () => {
    const payload: JwtPayload = {
      sub: 'user-1',
      email: 'user@example.com',
      tenantId: 'tenant-1',
      tenantSlug: 'acme',
      role: UserRole.SOC_ANALYST_L1,
    }

    // Default: no impersonation fields
    expect(payload.isImpersonated).toBeUndefined()
    expect(payload.impersonatorSub).toBeUndefined()
    expect(payload.impersonatorEmail).toBeUndefined()
  })

  it('should support impersonation claims in JwtPayload', () => {
    const payload: JwtPayload = {
      sub: 'target-user',
      email: 'target@example.com',
      tenantId: 'tenant-1',
      tenantSlug: 'acme',
      role: UserRole.SOC_ANALYST_L1,
      isImpersonated: true,
      impersonatorSub: 'admin-id',
      impersonatorEmail: 'admin@example.com',
    }

    expect(payload.isImpersonated).toBe(true)
    expect(payload.impersonatorSub).toBe('admin-id')
    expect(payload.impersonatorEmail).toBe('admin@example.com')
  })

  it('should preserve impersonation claims during refresh simulation', () => {
    const originalPayload: JwtPayload = {
      sub: 'target-user',
      email: 'target@example.com',
      tenantId: 'tenant-1',
      tenantSlug: 'acme',
      role: UserRole.SOC_ANALYST_L1,
      isImpersonated: true,
      impersonatorSub: 'admin-id',
      impersonatorEmail: 'admin@example.com',
    }

    // Simulate what refreshTokens does
    const newPayload: JwtPayload = {
      sub: originalPayload.sub,
      email: originalPayload.email,
      tenantId: originalPayload.tenantId,
      tenantSlug: originalPayload.tenantSlug,
      role: originalPayload.role,
    }

    if (originalPayload.isImpersonated === true) {
      newPayload.isImpersonated = true
      newPayload.impersonatorSub = originalPayload.impersonatorSub
      newPayload.impersonatorEmail = originalPayload.impersonatorEmail
    }

    expect(newPayload.isImpersonated).toBe(true)
    expect(newPayload.impersonatorSub).toBe('admin-id')
    expect(newPayload.impersonatorEmail).toBe('admin@example.com')
  })

  it('should NOT add impersonation claims during refresh of normal tokens', () => {
    const normalPayload: JwtPayload = {
      sub: 'user-1',
      email: 'user@example.com',
      tenantId: 'tenant-1',
      tenantSlug: 'acme',
      role: UserRole.SOC_ANALYST_L1,
    }

    const newPayload: JwtPayload = {
      sub: normalPayload.sub,
      email: normalPayload.email,
      tenantId: normalPayload.tenantId,
      tenantSlug: normalPayload.tenantSlug,
      role: normalPayload.role,
    }

    if (normalPayload.isImpersonated === true) {
      newPayload.isImpersonated = true
      newPayload.impersonatorSub = normalPayload.impersonatorSub
      newPayload.impersonatorEmail = normalPayload.impersonatorEmail
    }

    expect(newPayload.isImpersonated).toBeUndefined()
    expect(newPayload.impersonatorSub).toBeUndefined()
    expect(newPayload.impersonatorEmail).toBeUndefined()
  })
})

// ─── Tests: Impersonate DTO ──────────────────────────────────────

describe('ImpersonateUserSchema', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ImpersonateUserSchema } = require('../../src/modules/tenants/dto/impersonate-user.dto')

  it('should accept empty body', () => {
    const result = ImpersonateUserSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('should accept body with reason', () => {
    const result = ImpersonateUserSchema.safeParse({ reason: 'Investigating ticket #123' })
    expect(result.success).toBe(true)
    expect(result.data.reason).toBe('Investigating ticket #123')
  })

  it('should reject reason exceeding max length', () => {
    const result = ImpersonateUserSchema.safeParse({ reason: 'x'.repeat(501) })
    expect(result.success).toBe(false)
  })

  it('should reject empty string reason', () => {
    const result = ImpersonateUserSchema.safeParse({ reason: '' })
    expect(result.success).toBe(false)
  })
})
