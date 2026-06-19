import { SortOrder } from '../../src/common/enums'
import { UserRole } from '../../src/common/interfaces/authenticated-request.interface'
import { toDay, nowDate } from '../../src/common/utils/date-time.utility'
import { RefreshTokenFamilyRevocationReason } from '../../src/modules/auth/auth.enums'
import {
  UsersControlSessionSortField,
  UsersControlUserSortField,
} from '../../src/modules/users-control/users-control.enums'
import { UsersControlService } from '../../src/modules/users-control/users-control.service'
import type { JwtPayload } from '../../src/common/interfaces/authenticated-request.interface'
import type { ListControlledUsersQueryDto } from '../../src/modules/users-control/dto/list-controlled-users-query.dto'
import type { ListUserSessionsQueryDto } from '../../src/modules/users-control/dto/list-user-sessions-query.dto'

function createMockRepository() {
  return {
    countScopedUsers: jest.fn(),
    countScopedOnlineUsers: jest.fn(),
    countScopedActiveSessions: jest.fn(),
    findAllScopedUsers: jest.fn(),
    findScopedUser: jest.fn(),
    findUserSessions: jest.fn(),
    findSessionRevocationTargetsByUser: jest.fn(),
    findSessionRevocationTargetsBySession: jest.fn(),
    findSessionRevocationTargetsByScope: jest.fn(),
  }
}

const mockAuthService = {
  revokeSessionTargets: jest.fn(),
}

const mockAppLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}

const TENANT_ADMIN_ACTOR: JwtPayload = {
  sub: 'tenant-admin-001',
  email: 'tenant-admin@auraspear.com',
  tenantId: 'tenant-001',
  tenantSlug: 'auraspear',
  role: UserRole.TENANT_ADMIN,
}

const GLOBAL_ADMIN_ACTOR: JwtPayload = {
  sub: 'global-admin-001',
  email: 'global-admin@auraspear.com',
  tenantId: 'tenant-001',
  tenantSlug: 'auraspear',
  role: UserRole.GLOBAL_ADMIN,
}

const LIST_USERS_QUERY: ListControlledUsersQueryDto = {
  page: 1,
  limit: 20,
  sortBy: UsersControlUserSortField.LAST_LOGIN_AT,
  sortOrder: SortOrder.DESC,
}

const LIST_SESSIONS_QUERY: ListUserSessionsQueryDto = {
  page: 1,
  limit: 10,
  sortBy: UsersControlSessionSortField.LAST_SEEN_AT,
  sortOrder: SortOrder.DESC,
}

describe('UsersControlService', () => {
  let service: UsersControlService
  let repository: ReturnType<typeof createMockRepository>

  beforeEach(() => {
    repository = createMockRepository()
    mockAuthService.revokeSessionTargets.mockReset()
    mockAppLogger.info.mockReset()

    service = new UsersControlService(
      repository as never,
      mockAuthService as never,
      mockAppLogger as never
    )
  })

  describe('getSummary', () => {
    it('should scope summary queries to the tenant for tenant admins', async () => {
      repository.countScopedUsers.mockResolvedValue(12)
      repository.countScopedOnlineUsers.mockResolvedValue(4)
      repository.countScopedActiveSessions.mockResolvedValue(9)

      const result = await service.getSummary(TENANT_ADMIN_ACTOR, TENANT_ADMIN_ACTOR.tenantId)

      expect(result).toEqual({
        totalUsers: 12,
        onlineUsers: 4,
        activeSessions: 9,
      })
      expect(repository.countScopedUsers).toHaveBeenCalledWith({
        memberships: {
          some: {
            tenantId: TENANT_ADMIN_ACTOR.tenantId,
          },
        },
      })
      expect(repository.countScopedOnlineUsers).toHaveBeenCalledWith(
        expect.any(Date),
        TENANT_ADMIN_ACTOR.tenantId
      )
      expect(repository.countScopedActiveSessions).toHaveBeenCalledWith(TENANT_ADMIN_ACTOR.tenantId)
    })

    it('should query global scope for global admins', async () => {
      repository.countScopedUsers.mockResolvedValue(25)
      repository.countScopedOnlineUsers.mockResolvedValue(8)
      repository.countScopedActiveSessions.mockResolvedValue(15)

      await service.getSummary(GLOBAL_ADMIN_ACTOR, GLOBAL_ADMIN_ACTOR.tenantId)

      expect(repository.countScopedUsers).toHaveBeenCalledWith({
        memberships: {
          some: {},
        },
      })
      expect(repository.countScopedOnlineUsers).toHaveBeenCalledWith(expect.any(Date), undefined)
      expect(repository.countScopedActiveSessions).toHaveBeenCalledWith(undefined)
    })
  })

  describe('listUserSessions', () => {
    it('should throw a localized not-found error for out-of-scope users', async () => {
      repository.findScopedUser.mockResolvedValue(null)

      await expect(
        service.listUserSessions(
          'missing-user',
          TENANT_ADMIN_ACTOR,
          TENANT_ADMIN_ACTOR.tenantId,
          LIST_SESSIONS_QUERY
        )
      ).rejects.toMatchObject({
        messageKey: 'errors.userControl.userNotFound',
      })
    })
  })

  describe('forceLogoutUser', () => {
    it('should block tenant admins from force-logging out protected users', async () => {
      repository.findScopedUser.mockResolvedValue({
        id: 'protected-user',
        isProtected: true,
        memberships: [
          {
            role: UserRole.TENANT_ADMIN,
            tenantId: TENANT_ADMIN_ACTOR.tenantId,
            tenant: { id: TENANT_ADMIN_ACTOR.tenantId, name: 'AuraSpear', slug: 'auraspear' },
          },
        ],
        sessions: [],
      })

      await expect(
        service.forceLogoutUser('protected-user', TENANT_ADMIN_ACTOR, TENANT_ADMIN_ACTOR.tenantId)
      ).rejects.toMatchObject({
        messageKey: 'errors.tenants.userProtected',
      })
    })

    it('should block tenant admins from force-logging out global admins', async () => {
      repository.findScopedUser.mockResolvedValue({
        id: 'global-admin-user',
        isProtected: false,
        memberships: [
          {
            role: UserRole.GLOBAL_ADMIN,
            tenantId: TENANT_ADMIN_ACTOR.tenantId,
            tenant: { id: TENANT_ADMIN_ACTOR.tenantId, name: 'AuraSpear', slug: 'auraspear' },
          },
        ],
        sessions: [],
      })

      await expect(
        service.forceLogoutUser(
          'global-admin-user',
          TENANT_ADMIN_ACTOR,
          TENANT_ADMIN_ACTOR.tenantId
        )
      ).rejects.toMatchObject({
        messageKey: 'errors.tenants.cannotModifyGlobalAdmin',
      })
    })

    it('should revoke scoped sessions for manageable tenant users', async () => {
      repository.findScopedUser.mockResolvedValue({
        id: 'user-002',
        isProtected: false,
        memberships: [
          {
            role: UserRole.SOC_ANALYST_L1,
            tenantId: TENANT_ADMIN_ACTOR.tenantId,
            tenant: { id: TENANT_ADMIN_ACTOR.tenantId, name: 'AuraSpear', slug: 'auraspear' },
          },
        ],
        sessions: [],
      })
      repository.findSessionRevocationTargetsByUser.mockResolvedValue([
        {
          familyId: 'family-001',
          currentAccessJti: 'access-jti-001',
          currentAccessExpiresAt: nowDate(),
        },
        {
          familyId: 'family-002',
          currentAccessJti: 'access-jti-002',
          currentAccessExpiresAt: nowDate(),
        },
      ])
      mockAuthService.revokeSessionTargets.mockResolvedValue(2)

      const result = await service.forceLogoutUser(
        'user-002',
        TENANT_ADMIN_ACTOR,
        TENANT_ADMIN_ACTOR.tenantId
      )

      expect(result).toEqual({ revokedSessions: 2 })
      expect(repository.findSessionRevocationTargetsByUser).toHaveBeenCalledWith(
        'user-002',
        TENANT_ADMIN_ACTOR.tenantId
      )
      expect(mockAuthService.revokeSessionTargets).toHaveBeenCalledWith(
        expect.any(Array),
        RefreshTokenFamilyRevocationReason.FORCE_LOGOUT_USER,
        TENANT_ADMIN_ACTOR.sub
      )
    })
  })

  describe('listUsers', () => {
    it('should return paginated mapped users after sorting the visible data set', async () => {
      repository.findAllScopedUsers.mockResolvedValue([
        {
          id: 'user-010',
          name: 'Analyst One',
          email: 'analyst.one@auraspear.com',
          createdAt: toDay('2026-03-15T10:00:00.000Z').toDate(),
          lastLoginAt: toDay('2026-03-18T10:00:00.000Z').toDate(),
          isProtected: false,
          mfaEnabled: true,
          memberships: [
            {
              role: UserRole.SOC_ANALYST_L1,
              status: 'active',
              tenantId: TENANT_ADMIN_ACTOR.tenantId,
              tenant: {
                id: TENANT_ADMIN_ACTOR.tenantId,
                name: 'AuraSpear',
                slug: 'auraspear',
              },
            },
          ],
          sessions: [],
        },
        {
          id: 'user-011',
          name: 'Analyst Two',
          email: 'analyst.two@auraspear.com',
          createdAt: toDay('2026-03-16T10:00:00.000Z').toDate(),
          lastLoginAt: toDay('2026-03-19T10:00:00.000Z').toDate(),
          isProtected: false,
          mfaEnabled: true,
          memberships: [
            {
              role: UserRole.SOC_ANALYST_L2,
              status: 'active',
              tenantId: TENANT_ADMIN_ACTOR.tenantId,
              tenant: {
                id: TENANT_ADMIN_ACTOR.tenantId,
                name: 'AuraSpear',
                slug: 'auraspear',
              },
            },
          ],
          sessions: [
            {
              id: 'session-011',
              familyId: 'family-011',
              tenantId: TENANT_ADMIN_ACTOR.tenantId,
              tenant: {
                id: TENANT_ADMIN_ACTOR.tenantId,
                name: 'AuraSpear',
                slug: 'auraspear',
              },
              status: 'active',
              osFamily: 'windows',
              clientType: 'desktop',
              ipAddress: '10.0.0.11',
              userAgent: 'Mozilla/5.0',
              currentAccessJti: 'access-011',
              currentAccessExpiresAt: toDay('2026-03-19T10:15:00.000Z').toDate(),
              lastLoginAt: toDay('2026-03-19T10:00:00.000Z').toDate(),
              lastSeenAt: toDay('2026-03-19T10:05:00.000Z').toDate(),
              revokedAt: null,
              revokedByUserId: null,
              revokeReason: null,
            },
          ],
        },
      ])

      const result = await service.listUsers(TENANT_ADMIN_ACTOR, TENANT_ADMIN_ACTOR.tenantId, {
        ...LIST_USERS_QUERY,
        page: 2,
        limit: 1,
        sortBy: UsersControlUserSortField.NAME,
        sortOrder: SortOrder.ASC,
      })

      expect(result.pagination).toEqual({
        page: 2,
        limit: 1,
        total: 2,
        totalPages: 2,
      })
      expect(result.data[0]).toMatchObject({
        id: 'user-011',
        email: 'analyst.two@auraspear.com',
        hasGlobalAdminMembership: false,
      })
    })
  })

  describe('forceLogoutAll', () => {
    it('should pass nonAdminExclusions when tenant admin calls force logout all', async () => {
      repository.findSessionRevocationTargetsByScope.mockResolvedValue([
        {
          familyId: 'family-010',
          currentAccessJti: 'access-jti-010',
          currentAccessExpiresAt: nowDate(),
        },
      ])
      mockAuthService.revokeSessionTargets.mockResolvedValue(1)

      const result = await service.forceLogoutAll(TENANT_ADMIN_ACTOR, TENANT_ADMIN_ACTOR.tenantId)

      expect(result).toEqual({ revokedSessions: 1 })
      expect(repository.findSessionRevocationTargetsByScope).toHaveBeenCalledWith(
        TENANT_ADMIN_ACTOR.tenantId,
        { actorUserId: TENANT_ADMIN_ACTOR.sub, excludeGlobalAdmins: true }
      )
      expect(mockAuthService.revokeSessionTargets).toHaveBeenCalledWith(
        expect.any(Array),
        RefreshTokenFamilyRevocationReason.FORCE_LOGOUT_ALL,
        TENANT_ADMIN_ACTOR.sub
      )
    })

    it('should NOT pass nonAdminExclusions when global admin calls force logout all', async () => {
      repository.findSessionRevocationTargetsByScope.mockResolvedValue([
        {
          familyId: 'family-020',
          currentAccessJti: 'access-jti-020',
          currentAccessExpiresAt: nowDate(),
        },
        {
          familyId: 'family-021',
          currentAccessJti: 'access-jti-021',
          currentAccessExpiresAt: nowDate(),
        },
      ])
      mockAuthService.revokeSessionTargets.mockResolvedValue(2)

      const result = await service.forceLogoutAll(GLOBAL_ADMIN_ACTOR, GLOBAL_ADMIN_ACTOR.tenantId)

      expect(result).toEqual({ revokedSessions: 2 })
      expect(repository.findSessionRevocationTargetsByScope).toHaveBeenCalledWith(undefined, {
        actorUserId: GLOBAL_ADMIN_ACTOR.sub,
        excludeGlobalAdmins: false,
      })
    })
  })

  describe('terminateSession', () => {
    it('should revoke a specific active session for a manageable user', async () => {
      repository.findScopedUser.mockResolvedValue({
        id: 'user-002',
        isProtected: false,
        memberships: [
          {
            role: UserRole.SOC_ANALYST_L1,
            tenantId: TENANT_ADMIN_ACTOR.tenantId,
            tenant: { id: TENANT_ADMIN_ACTOR.tenantId, name: 'AuraSpear', slug: 'auraspear' },
          },
        ],
        sessions: [],
      })
      repository.findSessionRevocationTargetsBySession.mockResolvedValue([
        {
          familyId: 'family-001',
          currentAccessJti: 'access-jti-001',
          currentAccessExpiresAt: nowDate(),
        },
      ])
      mockAuthService.revokeSessionTargets.mockResolvedValue(1)

      const result = await service.terminateSession(
        'user-002',
        'session-001',
        TENANT_ADMIN_ACTOR,
        TENANT_ADMIN_ACTOR.tenantId
      )

      expect(result).toEqual({ revokedSessions: 1 })
      expect(repository.findSessionRevocationTargetsBySession).toHaveBeenCalledWith(
        'user-002',
        'session-001',
        TENANT_ADMIN_ACTOR.tenantId
      )
      expect(mockAuthService.revokeSessionTargets).toHaveBeenCalledWith(
        expect.any(Array),
        RefreshTokenFamilyRevocationReason.FORCE_LOGOUT_SESSION,
        TENANT_ADMIN_ACTOR.sub
      )
    })

    it('should throw a localized error when the target session is not found', async () => {
      repository.findScopedUser.mockResolvedValue({
        id: 'user-002',
        isProtected: false,
        memberships: [
          {
            role: UserRole.SOC_ANALYST_L1,
            tenantId: TENANT_ADMIN_ACTOR.tenantId,
            tenant: { id: TENANT_ADMIN_ACTOR.tenantId, name: 'AuraSpear', slug: 'auraspear' },
          },
        ],
        sessions: [],
      })
      repository.findSessionRevocationTargetsBySession.mockResolvedValue([])

      await expect(
        service.terminateSession(
          'user-002',
          'session-missing',
          TENANT_ADMIN_ACTOR,
          TENANT_ADMIN_ACTOR.tenantId
        )
      ).rejects.toMatchObject({
        messageKey: 'errors.userControl.sessionNotFound',
      })
    })
  })
})
