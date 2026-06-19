jest.mock('bcryptjs', () => ({ compare: jest.fn(), hash: jest.fn() }))
jest.mock('jsonwebtoken', () => ({ sign: jest.fn(), verify: jest.fn() }))

import * as bcrypt from 'bcryptjs'
import * as jwt from 'jsonwebtoken'
import { BusinessException } from '../../src/common/exceptions/business.exception'
import { UserRole } from '../../src/common/interfaces/authenticated-request.interface'
import { toDay, nowDate, nowMs } from '../../src/common/utils/date-time.utility'
import { AuthService } from '../../src/modules/auth/auth.service'
import type { JwtPayload } from '../../src/common/interfaces/authenticated-request.interface'

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>
const mockedJwt = jwt as jest.Mocked<typeof jwt>

const mockAppLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}

const mockRoleSettingsService = {
  getUserPermissions: jest.fn().mockResolvedValue([]),
  hasPermission: jest.fn().mockResolvedValue(true),
}

const mockTokenBlacklist = {
  blacklist: jest.fn(),
  isBlacklisted: jest.fn().mockResolvedValue(false),
}

const mockConfigService = {
  get: jest.fn((key: string, defaultValue?: string) => {
    const config: Record<string, string> = {
      JWT_SECRET: '0123456789abcdef'.repeat(4),
      JWT_ACCESS_EXPIRY: '15m',
      JWT_REFRESH_EXPIRY: '7d',
    }
    return config[key] ?? defaultValue
  }),
}

function createMockRepository() {
  return {
    findUserByEmailWithMemberships: jest.fn(),
    updateLastLogin: jest.fn(),
    findUserByIdWithTenantMemberships: jest.fn(),
    findUserByIdWithActiveMembershipCheck: jest.fn(),
    findMembershipByUserAndTenant: jest.fn(),
    findActiveMembershipsWithTenant: jest.fn(),
    findTenantById: jest.fn(),
    findUserByIdWithAllActiveMemberships: jest.fn(),
    createRefreshTokenFamily: jest.fn(),
    createRefreshTokenRotation: jest.fn(),
    createUserSession: jest.fn(),
    findUserSessionByFamilyId: jest.fn(),
    findRefreshTokenRotationByHash: jest.fn(),
    rotateRefreshTokenFamily: jest.fn(),
    touchUserSession: jest.fn(),
    revokeRefreshTokenFamily: jest.fn(),
    expireRefreshTokenFamily: jest.fn(),
    upsertUserByOidcSub: jest.fn(),
    upsertTenantMembership: jest.fn(),
  }
}

const TENANT_ID = 'tenant-001'
const USER_ID = 'user-001'

const mockTenant = {
  id: TENANT_ID,
  name: 'AuraSpear',
  slug: 'auraspear',
}

const mockMembership = {
  tenantId: TENANT_ID,
  tenant: mockTenant,
  role: UserRole.SOC_ANALYST_L1,
  status: 'active',
}

const mockUserRecord = {
  id: USER_ID,
  email: 'analyst@auraspear.com',
  name: 'Test Analyst',
  passwordHash: '$2a$12$realHashForTesting',
  memberships: [mockMembership],
}

const mockRefreshFamily = {
  id: 'family-001',
  userId: USER_ID,
  tenantId: TENANT_ID,
  currentGeneration: 0,
  status: 'active',
  revokedAt: null,
  revokedReason: null,
  expiresAt: toDay(nowMs() + 60 * 60 * 1000).toDate(),
  createdAt: nowDate(),
  updatedAt: nowDate(),
}

const mockRefreshRotation = {
  id: 'rotation-001',
  familyId: mockRefreshFamily.id,
  generation: 0,
  jtiHash: 'hashed-jti',
  parentRotationId: null,
  status: 'active',
  issuedAt: nowDate(),
  usedAt: null,
  replacedAt: null,
  replayedAt: null,
  expiresAt: toDay(nowMs() + 60 * 60 * 1000).toDate(),
}

describe('AuthService', () => {
  let service: AuthService
  let repository: ReturnType<typeof createMockRepository>

  beforeEach(() => {
    jest.clearAllMocks()
    repository = createMockRepository()
    mockTokenBlacklist.isBlacklisted.mockResolvedValue(false)
    repository.createRefreshTokenFamily.mockResolvedValue(mockRefreshFamily)
    repository.createRefreshTokenRotation.mockResolvedValue(mockRefreshRotation)
    repository.createUserSession.mockResolvedValue({
      id: 'session-001',
      familyId: mockRefreshFamily.id,
      userId: USER_ID,
      tenantId: TENANT_ID,
    })
    repository.findUserSessionByFamilyId.mockResolvedValue(null)
    repository.findRefreshTokenRotationByHash.mockResolvedValue({
      ...mockRefreshRotation,
      family: mockRefreshFamily,
    })
    repository.rotateRefreshTokenFamily.mockResolvedValue({
      familyAdvanceCount: 1,
      newRotation: {
        ...mockRefreshRotation,
        id: 'rotation-002',
        generation: 1,
        parentRotationId: mockRefreshRotation.id,
      },
    })
    repository.touchUserSession.mockResolvedValue(1)
    repository.revokeRefreshTokenFamily.mockResolvedValue(undefined)
    repository.expireRefreshTokenFamily.mockResolvedValue(undefined)
    service = new AuthService(
      repository as never,
      mockConfigService as never,
      mockTokenBlacklist as never,
      mockAppLogger as never,
      mockRoleSettingsService as never
    )
  })

  /* ------------------------------------------------------------------ */
  /* login                                                               */
  /* ------------------------------------------------------------------ */

  describe('login', () => {
    it('should return tokens, user payload, and tenants on valid credentials', async () => {
      repository.findUserByEmailWithMemberships.mockResolvedValue(mockUserRecord)
      mockedBcrypt.compare.mockResolvedValue(true as never)
      mockedJwt.sign.mockReturnValue('mock-token' as never)
      repository.updateLastLogin.mockResolvedValue(mockUserRecord)

      const result = await service.login('analyst@auraspear.com', 'password123')

      expect(result.accessToken).toBe('mock-token')
      expect(result.refreshToken).toBe('mock-token')
      expect(result.user.sub).toBe(USER_ID)
      expect(result.user.email).toBe('analyst@auraspear.com')
      expect(result.user.tenantId).toBe(TENANT_ID)
      expect(result.user.role).toBe(UserRole.SOC_ANALYST_L1)
      expect(result.tenants).toHaveLength(1)
      expect(result.tenants[0]).toEqual({
        id: TENANT_ID,
        name: 'AuraSpear',
        slug: 'auraspear',
        role: UserRole.SOC_ANALYST_L1,
      })
    })

    it('should throw 401 for non-existent user (with timing attack prevention)', async () => {
      repository.findUserByEmailWithMemberships.mockResolvedValue(null)
      mockedBcrypt.compare.mockResolvedValue(false as never)

      await expect(service.login('nobody@test.com', 'password123')).rejects.toThrow(
        BusinessException
      )

      // bcrypt.compare should still be called with the dummy hash for timing attack prevention
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        'password123',
        expect.stringContaining('$2b$12$')
      )
    })

    it('should throw 401 for wrong password', async () => {
      repository.findUserByEmailWithMemberships.mockResolvedValue(mockUserRecord)
      mockedBcrypt.compare.mockResolvedValue(false as never)

      await expect(service.login('analyst@auraspear.com', 'wrong-password')).rejects.toThrow(
        BusinessException
      )

      try {
        await service.login('analyst@auraspear.com', 'wrong-password')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(401)
      }
    })

    it('should throw 401 for user with no active memberships', async () => {
      const userNoMemberships = { ...mockUserRecord, memberships: [] }
      repository.findUserByEmailWithMemberships.mockResolvedValue(userNoMemberships)
      mockedBcrypt.compare.mockResolvedValue(true as never)

      await expect(service.login('analyst@auraspear.com', 'password123')).rejects.toThrow(
        BusinessException
      )

      try {
        await service.login('analyst@auraspear.com', 'password123')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(401)
      }
    })

    it('should update lastLoginAt on successful login', async () => {
      repository.findUserByEmailWithMemberships.mockResolvedValue(mockUserRecord)
      mockedBcrypt.compare.mockResolvedValue(true as never)
      mockedJwt.sign.mockReturnValue('mock-token' as never)
      repository.updateLastLogin.mockResolvedValue(mockUserRecord)

      await service.login('analyst@auraspear.com', 'password123')

      expect(repository.updateLastLogin).toHaveBeenCalledWith(USER_ID)
    })
  })

  /* ------------------------------------------------------------------ */
  /* signAccessToken                                                     */
  /* ------------------------------------------------------------------ */

  describe('signAccessToken', () => {
    it('should call jwt.sign with correct options', () => {
      mockedJwt.sign.mockReturnValue('mock-access-token' as never)

      const payload: JwtPayload = {
        sub: USER_ID,
        email: 'analyst@auraspear.com',
        tenantId: TENANT_ID,
        tenantSlug: 'auraspear',
        role: UserRole.SOC_ANALYST_L1,
      }

      const result = service.signAccessToken(payload)

      expect(result).toBe('mock-access-token')
      expect(mockedJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: USER_ID,
          email: 'analyst@auraspear.com',
          tenantId: TENANT_ID,
          tenantSlug: 'auraspear',
          role: UserRole.SOC_ANALYST_L1,
          tokenType: 'access',
          jti: expect.stringMatching(/^[\da-f-]+$/),
        }),
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        { algorithm: 'HS256', expiresIn: '15m' }
      )
    })

    it('should strip iat, exp, and jti from incoming payload before signing', () => {
      mockedJwt.sign.mockReturnValue('mock-token' as never)

      const payload: JwtPayload = {
        sub: USER_ID,
        email: 'analyst@auraspear.com',
        tenantId: TENANT_ID,
        tenantSlug: 'auraspear',
        role: UserRole.SOC_ANALYST_L1,
        iat: 1000,
        exp: 2000,
        jti: 'old-jti',
      }

      service.signAccessToken(payload)

      const signedPayload = mockedJwt.sign.mock.calls[0]?.[0] as Record<string, unknown>
      expect(signedPayload['iat']).toBeUndefined()
      expect(signedPayload['exp']).toBeUndefined()
      // jti should be a new UUID, not the old one
      expect(signedPayload['jti']).not.toBe('old-jti')
    })
  })

  /* ------------------------------------------------------------------ */
  /* signRefreshToken                                                    */
  /* ------------------------------------------------------------------ */

  describe('signRefreshToken', () => {
    it('should add tokenType refresh to payload', () => {
      mockedJwt.sign.mockReturnValue('mock-refresh-token' as never)

      const payload: JwtPayload = {
        sub: USER_ID,
        email: 'analyst@auraspear.com',
        tenantId: TENANT_ID,
        tenantSlug: 'auraspear',
        role: UserRole.SOC_ANALYST_L1,
      }

      const result = service.signRefreshToken(payload)

      expect(result).toBe('mock-refresh-token')
      expect(mockedJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          tokenType: 'refresh',
          jti: expect.stringMatching(/^[\da-f-]+$/),
        }),
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        { algorithm: 'HS256', expiresIn: '7d' }
      )
    })
  })

  /* ------------------------------------------------------------------ */
  /* verifyAccessToken                                                   */
  /* ------------------------------------------------------------------ */

  describe('verifyAccessToken', () => {
    const validPayload = {
      sub: USER_ID,
      email: 'analyst@auraspear.com',
      tenantId: TENANT_ID,
      tenantSlug: 'auraspear',
      role: UserRole.SOC_ANALYST_L1,
      jti: 'access-jti-001',
      tokenType: 'access',
    }

    it('should return payload when token is valid', async () => {
      mockedJwt.verify.mockReturnValue(validPayload as never)

      const result = await service.verifyAccessToken('valid-token')

      expect(result.sub).toBe(USER_ID)
      expect(result.email).toBe('analyst@auraspear.com')
      expect(mockTokenBlacklist.isBlacklisted).toHaveBeenCalledWith('access-jti-001')
    })

    it('should throw 401 when token is blacklisted', async () => {
      mockedJwt.verify.mockReturnValue(validPayload as never)
      mockTokenBlacklist.isBlacklisted.mockResolvedValue(true)

      await expect(service.verifyAccessToken('blacklisted-token')).rejects.toThrow(
        BusinessException
      )

      try {
        await service.verifyAccessToken('blacklisted-token')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(401)
        expect((error as BusinessException).messageKey).toBe('errors.auth.tokenRevoked')
      }
    })

    it('should throw 401 when token type is not access', async () => {
      mockedJwt.verify.mockReturnValue({ ...validPayload, tokenType: 'refresh' } as never)

      await expect(service.verifyAccessToken('refresh-as-access')).rejects.toThrow(
        BusinessException
      )

      try {
        await service.verifyAccessToken('refresh-as-access')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(401)
        expect((error as BusinessException).messageKey).toBe('errors.auth.invalidAccessToken')
      }
    })

    it('should throw 401 when jwt.verify throws', async () => {
      mockedJwt.verify.mockImplementation(() => {
        throw new Error('jwt malformed')
      })

      await expect(service.verifyAccessToken('malformed-token')).rejects.toThrow(BusinessException)

      try {
        await service.verifyAccessToken('malformed-token')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(401)
      }
    })
  })

  /* ------------------------------------------------------------------ */
  /* verifyRefreshToken                                                  */
  /* ------------------------------------------------------------------ */

  describe('verifyRefreshToken', () => {
    const validRefreshPayload = {
      sub: USER_ID,
      email: 'analyst@auraspear.com',
      tenantId: TENANT_ID,
      tenantSlug: 'auraspear',
      role: UserRole.SOC_ANALYST_L1,
      jti: 'refresh-jti-001',
      tokenType: 'refresh',
    }

    it('should return payload when token is valid', async () => {
      mockedJwt.verify.mockReturnValue(validRefreshPayload as never)

      const result = await service.verifyRefreshToken('valid-refresh-token')

      expect(result.sub).toBe(USER_ID)
      expect(result.email).toBe('analyst@auraspear.com')
    })

    it('should throw 401 when token type is not refresh', async () => {
      mockedJwt.verify.mockReturnValue({ ...validRefreshPayload, tokenType: 'access' } as never)

      await expect(service.verifyRefreshToken('access-as-refresh')).rejects.toThrow(
        BusinessException
      )

      try {
        await service.verifyRefreshToken('access-as-refresh')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(401)
        expect((error as BusinessException).messageKey).toBe('errors.auth.invalidRefreshToken')
      }
    })

    it('should throw 401 when token is blacklisted', async () => {
      mockedJwt.verify.mockReturnValue(validRefreshPayload as never)
      mockTokenBlacklist.isBlacklisted.mockResolvedValue(true)

      await expect(service.verifyRefreshToken('blacklisted-refresh')).rejects.toThrow(
        BusinessException
      )

      try {
        await service.verifyRefreshToken('blacklisted-refresh')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(401)
        expect((error as BusinessException).messageKey).toBe('errors.auth.tokenRevoked')
      }
    })

    it('should throw 401 when jwt.verify throws', async () => {
      mockedJwt.verify.mockImplementation(() => {
        throw new Error('jwt expired')
      })

      await expect(service.verifyRefreshToken('expired-token')).rejects.toThrow(BusinessException)

      try {
        await service.verifyRefreshToken('expired-token')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(401)
        expect((error as BusinessException).messageKey).toBe('errors.auth.invalidRefreshToken')
      }
    })
  })

  /* ------------------------------------------------------------------ */
  /* refreshTokens                                                       */
  /* ------------------------------------------------------------------ */

  describe('refreshTokens', () => {
    const refreshPayload = {
      sub: USER_ID,
      email: 'analyst@auraspear.com',
      tenantId: TENANT_ID,
      tenantSlug: 'auraspear',
      role: UserRole.SOC_ANALYST_L1,
      jti: 'old-refresh-jti',
      family: mockRefreshFamily.id,
      generation: 0,
      exp: Math.floor(nowMs() / 1000) + 3600,
      tokenType: 'refresh',
    }

    beforeEach(() => {
      mockedJwt.verify.mockReturnValue(refreshPayload as never)
      mockedJwt.sign.mockReturnValue('new-mock-token' as never)
    })

    it('should return new token pair', async () => {
      repository.findUserByIdWithAllActiveMemberships.mockResolvedValue(mockUserRecord)

      const result = await service.refreshTokens('old-refresh-token')

      expect(result.accessToken).toBe('new-mock-token')
      expect(result.refreshToken).toBe('new-mock-token')
    })

    it('should blacklist old refresh token JTI', async () => {
      repository.findUserByIdWithAllActiveMemberships.mockResolvedValue(mockUserRecord)

      await service.refreshTokens('old-refresh-token')

      expect(mockTokenBlacklist.blacklist).toHaveBeenCalledWith(
        'old-refresh-jti',
        expect.any(Number)
      )
    })

    it('should throw 401 when user no longer exists', async () => {
      repository.findUserByIdWithAllActiveMemberships.mockResolvedValue(null)

      await expect(service.refreshTokens('old-refresh-token')).rejects.toThrow(BusinessException)

      try {
        await service.refreshTokens('old-refresh-token')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(401)
        expect((error as BusinessException).messageKey).toBe('errors.auth.userNotFound')
      }
    })

    it('should throw 401 when user has no active memberships', async () => {
      repository.findUserByIdWithAllActiveMemberships.mockResolvedValue({
        ...mockUserRecord,
        memberships: [],
      })

      await expect(service.refreshTokens('old-refresh-token')).rejects.toThrow(BusinessException)

      try {
        await service.refreshTokens('old-refresh-token')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(401)
        expect((error as BusinessException).messageKey).toBe('errors.auth.accountInactive')
      }
    })

    it('should preserve impersonation claims if present', async () => {
      const impersonationPayload = {
        ...refreshPayload,
        isImpersonated: true,
        impersonatorSub: 'admin-001',
        impersonatorEmail: 'admin@auraspear.com',
      }
      mockedJwt.verify.mockReturnValue(impersonationPayload as never)
      repository.findUserByIdWithAllActiveMemberships.mockResolvedValue(mockUserRecord)

      await service.refreshTokens('impersonation-refresh-token')

      // The sign calls should include impersonation claims
      const signCalls = mockedJwt.sign.mock.calls
      // Two calls: one for access, one for refresh
      expect(signCalls).toHaveLength(2)

      const accessPayload = signCalls[0]?.[0] as Record<string, unknown>
      expect(accessPayload['isImpersonated']).toBe(true)
      expect(accessPayload['impersonatorSub']).toBe('admin-001')
      expect(accessPayload['impersonatorEmail']).toBe('admin@auraspear.com')
    })
  })

  /* ------------------------------------------------------------------ */
  /* logout                                                              */
  /* ------------------------------------------------------------------ */

  describe('logout', () => {
    it('should blacklist both tokens with correct TTLs', async () => {
      const now = Math.floor(nowMs() / 1000)
      const accessExp = now + 900 // 15 minutes
      const refreshExp = now + 604800 // 7 days

      await service.logout('access-jti', 'refresh-jti', accessExp, refreshExp)

      expect(mockTokenBlacklist.blacklist).toHaveBeenCalledTimes(2)
      expect(mockTokenBlacklist.blacklist).toHaveBeenCalledWith('access-jti', expect.any(Number))
      expect(mockTokenBlacklist.blacklist).toHaveBeenCalledWith('refresh-jti', expect.any(Number))

      // Verify TTLs are positive and reasonable
      const accessTtlCall = mockTokenBlacklist.blacklist.mock.calls.find(
        (call: [string, number]) => call[0] === 'access-jti'
      )
      const refreshTtlCall = mockTokenBlacklist.blacklist.mock.calls.find(
        (call: [string, number]) => call[0] === 'refresh-jti'
      )
      expect(accessTtlCall?.[1]).toBeGreaterThan(0)
      expect(accessTtlCall?.[1]).toBeLessThanOrEqual(900)
      expect(refreshTtlCall?.[1]).toBeGreaterThan(0)
      expect(refreshTtlCall?.[1]).toBeLessThanOrEqual(604800)
    })
  })

  /* ------------------------------------------------------------------ */
  /* validateUserActive                                                  */
  /* ------------------------------------------------------------------ */

  describe('validateUserActive', () => {
    it('should succeed for active user with active memberships', async () => {
      repository.findUserByIdWithActiveMembershipCheck.mockResolvedValue({
        id: USER_ID,
        memberships: [{ id: 'membership-001' }],
      })

      await expect(service.validateUserActive(USER_ID)).resolves.toBeUndefined()
    })

    it('should throw 401 for non-existent user', async () => {
      repository.findUserByIdWithActiveMembershipCheck.mockResolvedValue(null)

      await expect(service.validateUserActive('non-existent')).rejects.toThrow(BusinessException)

      try {
        await service.validateUserActive('non-existent')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(401)
        expect((error as BusinessException).messageKey).toBe('errors.auth.userNotFound')
      }
    })

    it('should throw 401 for user with no active memberships', async () => {
      repository.findUserByIdWithActiveMembershipCheck.mockResolvedValue({
        id: USER_ID,
        memberships: [],
      })

      await expect(service.validateUserActive(USER_ID)).rejects.toThrow(BusinessException)

      try {
        await service.validateUserActive(USER_ID)
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(401)
        expect((error as BusinessException).messageKey).toBe('errors.auth.accountInactive')
      }
    })
  })

  /* ------------------------------------------------------------------ */
  /* validateMembershipActive                                            */
  /* ------------------------------------------------------------------ */

  describe('validateMembershipActive', () => {
    it('should succeed for active membership', async () => {
      repository.findMembershipByUserAndTenant.mockResolvedValue({
        userId: USER_ID,
        tenantId: TENANT_ID,
        status: 'active',
      })

      await expect(service.validateMembershipActive(USER_ID, TENANT_ID)).resolves.toBeUndefined()
    })

    it('should throw 401 for inactive membership', async () => {
      repository.findMembershipByUserAndTenant.mockResolvedValue({
        userId: USER_ID,
        tenantId: TENANT_ID,
        status: 'inactive',
      })

      await expect(service.validateMembershipActive(USER_ID, TENANT_ID)).rejects.toThrow(
        BusinessException
      )

      try {
        await service.validateMembershipActive(USER_ID, TENANT_ID)
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(401)
        expect((error as BusinessException).messageKey).toBe('errors.auth.accountInactive')
      }
    })

    it('should throw 401 when membership does not exist', async () => {
      repository.findMembershipByUserAndTenant.mockResolvedValue(null)

      await expect(service.validateMembershipActive(USER_ID, TENANT_ID)).rejects.toThrow(
        BusinessException
      )

      try {
        await service.validateMembershipActive(USER_ID, TENANT_ID)
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(401)
      }
    })
  })

  /* ------------------------------------------------------------------ */
  /* getUserTenants                                                      */
  /* ------------------------------------------------------------------ */

  describe('getUserTenants', () => {
    it('should return list of tenant memberships', async () => {
      repository.findActiveMembershipsWithTenant.mockResolvedValue([
        {
          tenantId: TENANT_ID,
          tenant: mockTenant,
          role: UserRole.SOC_ANALYST_L1,
          status: 'active',
        },
        {
          tenantId: 'tenant-002',
          tenant: { id: 'tenant-002', name: 'SecondOrg', slug: 'second-org' },
          role: UserRole.TENANT_ADMIN,
          status: 'active',
        },
      ])

      const result = await service.getUserTenants(USER_ID)

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        id: TENANT_ID,
        name: 'AuraSpear',
        slug: 'auraspear',
        role: UserRole.SOC_ANALYST_L1,
      })
      expect(result[1]).toEqual({
        id: 'tenant-002',
        name: 'SecondOrg',
        slug: 'second-org',
        role: UserRole.TENANT_ADMIN,
      })
    })

    it('should return empty array for no memberships', async () => {
      repository.findActiveMembershipsWithTenant.mockResolvedValue([])

      const result = await service.getUserTenants(USER_ID)

      expect(result).toEqual([])
    })
  })

  /* ------------------------------------------------------------------ */
  /* resolveAuthorizedTenantContext                                      */
  /* ------------------------------------------------------------------ */

  describe('resolveAuthorizedTenantContext', () => {
    const decodedPayload: JwtPayload = {
      sub: USER_ID,
      email: 'analyst@auraspear.com',
      tenantId: TENANT_ID,
      tenantSlug: 'auraspear',
      role: UserRole.SOC_ANALYST_L1,
    }

    it('should return the current DB role for the active tenant membership', async () => {
      repository.findActiveMembershipsWithTenant.mockResolvedValue([
        {
          tenantId: TENANT_ID,
          tenant: mockTenant,
          role: UserRole.TENANT_ADMIN,
          status: 'active',
        },
      ])

      const result = await service.resolveAuthorizedTenantContext(decodedPayload)

      expect(result).toEqual({
        tenantId: TENANT_ID,
        tenantSlug: 'auraspear',
        role: UserRole.TENANT_ADMIN,
      })
    })

    it('should allow a current global admin to resolve a switched tenant', async () => {
      repository.findActiveMembershipsWithTenant.mockResolvedValue([
        {
          tenantId: TENANT_ID,
          tenant: mockTenant,
          role: UserRole.GLOBAL_ADMIN,
          status: 'active',
        },
      ])
      repository.findTenantById.mockResolvedValue({
        id: 'tenant-002',
        name: 'SecondOrg',
        slug: 'second-org',
      })

      const result = await service.resolveAuthorizedTenantContext(decodedPayload, 'tenant-002')

      expect(result).toEqual({
        tenantId: 'tenant-002',
        tenantSlug: 'second-org',
        role: UserRole.GLOBAL_ADMIN,
      })
    })

    it('should reject switched-tenant access for non-global-admin users', async () => {
      repository.findActiveMembershipsWithTenant.mockResolvedValue([
        {
          tenantId: TENANT_ID,
          tenant: mockTenant,
          role: UserRole.SOC_ANALYST_L1,
          status: 'active',
        },
      ])

      await expect(
        service.resolveAuthorizedTenantContext(decodedPayload, 'tenant-002')
      ).rejects.toMatchObject({
        messageKey: 'errors.auth.noTenantAccess',
      })
    })
  })

  /* ------------------------------------------------------------------ */
  /* endImpersonation                                                    */
  /* ------------------------------------------------------------------ */

  describe('endImpersonation', () => {
    const adminUser = {
      id: 'admin-001',
      email: 'admin@auraspear.com',
      name: 'Admin User',
      memberships: [
        {
          tenantId: TENANT_ID,
          tenant: mockTenant,
          role: UserRole.GLOBAL_ADMIN,
          status: 'active',
        },
      ],
    }

    const impersonationCaller: JwtPayload = {
      sub: USER_ID,
      email: 'analyst@auraspear.com',
      tenantId: TENANT_ID,
      tenantSlug: 'auraspear',
      role: UserRole.SOC_ANALYST_L1,
      isImpersonated: true,
      impersonatorSub: 'admin-001',
      impersonatorEmail: 'admin@auraspear.com',
      jti: 'impersonation-jti',
      exp: Math.floor(nowMs() / 1000) + 900,
    }

    it('should return admin tokens when ending valid impersonation', async () => {
      repository.findUserByIdWithAllActiveMemberships.mockResolvedValue(adminUser)
      mockedJwt.sign.mockReturnValue('admin-token' as never)

      const result = await service.endImpersonation(impersonationCaller)

      expect(result.accessToken).toBe('admin-token')
      expect(result.refreshToken).toBe('admin-token')
      expect(result.user.sub).toBe('admin-001')
      expect(result.user.email).toBe('admin@auraspear.com')
      expect(result.user.role).toBe(UserRole.GLOBAL_ADMIN)

      // Should blacklist the impersonation token
      expect(mockTokenBlacklist.blacklist).toHaveBeenCalledWith(
        'impersonation-jti',
        expect.any(Number)
      )
    })

    it('should throw 400 when caller is not impersonating', async () => {
      const normalCaller: JwtPayload = {
        sub: USER_ID,
        email: 'analyst@auraspear.com',
        tenantId: TENANT_ID,
        tenantSlug: 'auraspear',
        role: UserRole.SOC_ANALYST_L1,
      }

      await expect(service.endImpersonation(normalCaller)).rejects.toThrow(BusinessException)

      try {
        await service.endImpersonation(normalCaller)
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(400)
        expect((error as BusinessException).messageKey).toBe(
          'errors.impersonation.notImpersonating'
        )
      }
    })

    it('should throw 401 when original admin not found', async () => {
      repository.findUserByIdWithAllActiveMemberships.mockResolvedValue(null)

      await expect(service.endImpersonation(impersonationCaller)).rejects.toThrow(BusinessException)

      try {
        await service.endImpersonation(impersonationCaller)
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(401)
        expect((error as BusinessException).messageKey).toBe('errors.auth.userNotFound')
      }
    })

    it('should throw 401 when admin has no active memberships', async () => {
      repository.findUserByIdWithAllActiveMemberships.mockResolvedValue({
        ...adminUser,
        memberships: [],
      })

      await expect(service.endImpersonation(impersonationCaller)).rejects.toThrow(BusinessException)

      try {
        await service.endImpersonation(impersonationCaller)
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(401)
        expect((error as BusinessException).messageKey).toBe('errors.auth.accountInactive')
      }
    })
  })

  /* ------------------------------------------------------------------ */
  /* findOrCreateUser                                                    */
  /* ------------------------------------------------------------------ */

  describe('findOrCreateUser', () => {
    it('should create new user with SOC_ANALYST_L1 role', async () => {
      repository.upsertUserByOidcSub.mockResolvedValue({
        id: 'new-user-001',
        oidcSub: 'oidc-sub-123',
        email: 'newuser@auraspear.com',
        name: 'New User',
      })
      repository.upsertTenantMembership.mockResolvedValue({
        userId: 'new-user-001',
        tenantId: TENANT_ID,
        role: UserRole.SOC_ANALYST_L1,
      })

      const result = await service.findOrCreateUser(
        TENANT_ID,
        'oidc-sub-123',
        'newuser@auraspear.com',
        'New User'
      )

      expect(result.id).toBe('new-user-001')
      expect(result.role).toBe(UserRole.SOC_ANALYST_L1)

      expect(repository.upsertUserByOidcSub).toHaveBeenCalledWith(
        'oidc-sub-123',
        'newuser@auraspear.com',
        'New User'
      )

      expect(repository.upsertTenantMembership).toHaveBeenCalledWith(
        'new-user-001',
        TENANT_ID,
        UserRole.SOC_ANALYST_L1
      )
    })

    it('should return existing user', async () => {
      repository.upsertUserByOidcSub.mockResolvedValue({
        id: USER_ID,
        oidcSub: 'oidc-existing',
        email: 'analyst@auraspear.com',
        name: 'Test Analyst',
      })
      repository.upsertTenantMembership.mockResolvedValue({
        userId: USER_ID,
        tenantId: TENANT_ID,
        role: UserRole.SOC_ANALYST_L2,
      })

      const result = await service.findOrCreateUser(
        TENANT_ID,
        'oidc-existing',
        'analyst@auraspear.com',
        'Test Analyst'
      )

      expect(result.id).toBe(USER_ID)
      expect(result.role).toBe(UserRole.SOC_ANALYST_L2)
    })

    it('should throw 401 on provisioning failure', async () => {
      repository.upsertUserByOidcSub.mockRejectedValue(new Error('Database connection failed'))

      await expect(
        service.findOrCreateUser(TENANT_ID, 'oidc-fail', 'fail@test.com', 'Fail User')
      ).rejects.toThrow(BusinessException)

      try {
        await service.findOrCreateUser(TENANT_ID, 'oidc-fail', 'fail@test.com', 'Fail User')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(401)
        expect((error as BusinessException).messageKey).toBe('errors.auth.provisionFailed')
      }
    })
  })
})
