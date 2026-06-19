jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('hashed-pw'),
}))

import { BusinessException } from '../../src/common/exceptions/business.exception'
import {
  MembershipStatus,
  UserRole,
} from '../../src/common/interfaces/authenticated-request.interface'
import { toDay } from '../../src/common/utils/date-time.utility'
import { PermissionUpdateReason } from '../../src/modules/notifications/notifications.enums'
import { TenantsService } from '../../src/modules/tenants/tenants.service'

const mockAppLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}

const mockNotificationsService = {
  notifyTenantAssigned: jest.fn().mockResolvedValue(undefined),
  notifyRoleChanged: jest.fn().mockResolvedValue(undefined),
  notifyUserBlocked: jest.fn().mockResolvedValue(undefined),
  notifyUserUnblocked: jest.fn().mockResolvedValue(undefined),
  notifyUserRemoved: jest.fn().mockResolvedValue(undefined),
  notifyUserRestored: jest.fn().mockResolvedValue(undefined),
  emitPermissionsUpdated: jest.fn(),
}

const TENANT_ID = 'tenant-001'
const USER_ID = 'user-001'
const CALLER_ID = 'caller-001'
const CALLER_EMAIL = 'admin@acme.com'

const now = toDay('2025-06-01T00:00:00Z').toDate()

function createMockRepository() {
  return {
    findAllTenantsWithCounts: jest.fn(),
    findByIdWithCounts: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deactivateAllMemberships: jest.fn(),
    findMembershipsWithUsers: jest.fn(),
    findActiveMembersWithUsers: jest.fn(),
    findUserByEmail: jest.fn(),
    findMembershipByUserAndTenant: jest.fn(),
    findUserWithTenantMembership: jest.fn(),
    findOrCreateUserWithMembership: jest.fn(),
    findMembershipWithUser: jest.fn(),
    updateMembershipRole: jest.fn(),
    updateUser: jest.fn(),
    updateMembershipStatus: jest.fn(),
    updateMembershipStatusWithUser: jest.fn(),
    findTenantById: jest.fn(),
    findUserById: jest.fn(),
  }
}

const authService = {
  signAccessToken: jest.fn().mockReturnValue('mock-access'),
  signRefreshToken: jest.fn().mockReturnValue('mock-refresh'),
  issueSession: jest.fn().mockResolvedValue({
    accessToken: 'mock-access',
    refreshToken: 'mock-refresh',
  }),
}

function makeTenantRow(overrides: Record<string, unknown> = {}) {
  return {
    id: TENANT_ID,
    name: 'Acme Corp',
    slug: 'acme-corp',
    createdAt: now,
    _count: { memberships: 5, alerts: 10, cases: 3 },
    ...overrides,
  }
}

function makeMembershipRow(overrides: Record<string, unknown> = {}) {
  return {
    userId: USER_ID,
    tenantId: TENANT_ID,
    role: UserRole.SOC_ANALYST_L1,
    status: MembershipStatus.ACTIVE,
    createdAt: now,
    user: {
      id: USER_ID,
      email: 'analyst@acme.com',
      name: 'Jane Doe',
      lastLoginAt: null,
      mfaEnabled: false,
      isProtected: false,
    },
    ...overrides,
  }
}

function makeUserRow(overrides: Record<string, unknown> = {}) {
  return {
    id: USER_ID,
    email: 'analyst@acme.com',
    name: 'Jane Doe',
    lastLoginAt: null,
    mfaEnabled: false,
    isProtected: false,
    passwordHash: 'old-hash',
    ...overrides,
  }
}

describe('TenantsService', () => {
  let service: TenantsService
  let repository: ReturnType<typeof createMockRepository>

  beforeEach(() => {
    jest.clearAllMocks()
    repository = createMockRepository()
    service = new TenantsService(
      repository as never,
      authService as never,
      mockAppLogger as never,
      mockNotificationsService as never
    )
  })

  /* ------------------------------------------------------------------ */
  /* findAll                                                             */
  /* ------------------------------------------------------------------ */
  describe('findAll', () => {
    it('should return paginated tenants with counts', async () => {
      const tenantRow = makeTenantRow()
      repository.findAllTenantsWithCounts.mockResolvedValue([[tenantRow], 1])

      const result = await service.findAll(1, 20)

      expect(result.data).toHaveLength(1)
      expect(result.data[0]).toEqual({
        id: TENANT_ID,
        name: 'Acme Corp',
        slug: 'acme-corp',
        createdAt: now,
        userCount: 5,
        alertCount: 10,
        caseCount: 3,
      })
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      })
    })

    it('should handle search filter', async () => {
      repository.findAllTenantsWithCounts.mockResolvedValue([[], 0])

      const result = await service.findAll(1, 10, 'search-term')

      expect(result.data).toHaveLength(0)
      expect(result.pagination.total).toBe(0)
      expect(result.pagination.totalPages).toBe(1)
    })

    it('should handle empty results', async () => {
      repository.findAllTenantsWithCounts.mockResolvedValue([[], 0])

      const result = await service.findAll(1, 20)

      expect(result.data).toEqual([])
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1,
      })
    })
  })

  /* ------------------------------------------------------------------ */
  /* findById                                                            */
  /* ------------------------------------------------------------------ */
  describe('findById', () => {
    it('should return tenant with counts', async () => {
      repository.findByIdWithCounts.mockResolvedValue(makeTenantRow())

      const result = await service.findById(TENANT_ID)

      expect(result).toEqual({
        id: TENANT_ID,
        name: 'Acme Corp',
        slug: 'acme-corp',
        createdAt: now,
        userCount: 5,
        alertCount: 10,
        caseCount: 3,
      })
    })

    it('should throw 404 when tenant not found', async () => {
      repository.findByIdWithCounts.mockResolvedValue(null)

      await expect(service.findById('nonexistent')).rejects.toThrow(BusinessException)
      await expect(service.findById('nonexistent')).rejects.toMatchObject({
        messageKey: 'errors.tenants.notFound',
      })
    })
  })

  /* ------------------------------------------------------------------ */
  /* create                                                              */
  /* ------------------------------------------------------------------ */
  describe('create', () => {
    it('should create tenant and return it', async () => {
      const created = { id: 'new-tenant', name: 'New Co', slug: 'new-co', createdAt: now }
      repository.create.mockResolvedValue(created)

      const result = await service.create({ name: 'New Co', slug: 'new-co' })

      expect(result).toEqual(created)
      expect(repository.create).toHaveBeenCalledWith({ name: 'New Co', slug: 'new-co' })
    })

    it('should throw 409 when slug already exists', async () => {
      repository.create.mockRejectedValue(new Error('Unique constraint failed on the fields'))

      await expect(service.create({ name: 'Dup', slug: 'existing-slug' })).rejects.toThrow(
        BusinessException
      )
      await expect(service.create({ name: 'Dup', slug: 'existing-slug' })).rejects.toMatchObject({
        messageKey: 'errors.tenants.slugConflict',
      })
    })
  })

  /* ------------------------------------------------------------------ */
  /* update                                                              */
  /* ------------------------------------------------------------------ */
  describe('update', () => {
    it('should update and return tenant', async () => {
      const updated = { id: TENANT_ID, name: 'Updated Name', slug: 'acme-corp', createdAt: now }
      repository.update.mockResolvedValue(updated)

      const result = await service.update(TENANT_ID, { name: 'Updated Name' })

      expect(result).toEqual(updated)
      expect(repository.update).toHaveBeenCalledWith(TENANT_ID, { name: 'Updated Name' })
    })
  })

  /* ------------------------------------------------------------------ */
  /* remove                                                              */
  /* ------------------------------------------------------------------ */
  describe('remove', () => {
    it('should deactivate all memberships and return { deleted: true }', async () => {
      repository.deactivateAllMemberships.mockResolvedValue(undefined)

      const result = await service.remove(TENANT_ID)

      expect(result).toEqual({ deleted: true })
      expect(repository.deactivateAllMemberships).toHaveBeenCalledWith(
        TENANT_ID,
        MembershipStatus.INACTIVE
      )
    })
  })

  /* ------------------------------------------------------------------ */
  /* findUsers                                                           */
  /* ------------------------------------------------------------------ */
  describe('findUsers', () => {
    it('should return paginated users with role/status filtering', async () => {
      const membership = makeMembershipRow()
      repository.findMembershipsWithUsers.mockResolvedValue([[membership], 1])

      const result = await service.findUsers(
        TENANT_ID,
        1,
        20,
        undefined,
        undefined,
        undefined,
        UserRole.SOC_ANALYST_L1,
        MembershipStatus.ACTIVE
      )

      expect(result.data).toHaveLength(1)
      expect(result.data[0]).toMatchObject({
        id: USER_ID,
        email: 'analyst@acme.com',
        name: 'Jane Doe',
        role: UserRole.SOC_ANALYST_L1,
        status: MembershipStatus.ACTIVE,
      })
      expect(result.pagination.total).toBe(1)
    })

    it('should handle search by name/email', async () => {
      repository.findMembershipsWithUsers.mockResolvedValue([[], 0])

      const result = await service.findUsers(TENANT_ID, 1, 20, 'jane')

      expect(result.data).toEqual([])
      expect(result.pagination.total).toBe(0)
    })
  })

  /* ------------------------------------------------------------------ */
  /* findMembers                                                         */
  /* ------------------------------------------------------------------ */
  describe('findMembers', () => {
    it('should return lightweight member list (id, name, email)', async () => {
      repository.findActiveMembersWithUsers.mockResolvedValue([
        { user: { id: 'u1', name: 'Alice', email: 'alice@acme.com' } },
        { user: { id: 'u2', name: 'Bob', email: 'bob@acme.com' } },
      ])

      const result = await service.findMembers(TENANT_ID)

      expect(result).toEqual([
        { id: 'u1', name: 'Alice', email: 'alice@acme.com' },
        { id: 'u2', name: 'Bob', email: 'bob@acme.com' },
      ])
    })
  })

  /* ------------------------------------------------------------------ */
  /* checkEmail                                                          */
  /* ------------------------------------------------------------------ */
  describe('checkEmail', () => {
    it('should return { exists: false, alreadyInTenant: false } for new email', async () => {
      repository.findUserByEmail.mockResolvedValue(null)

      const result = await service.checkEmail(TENANT_ID, 'new@acme.com')

      expect(result).toEqual({ exists: false, user: null, alreadyInTenant: false })
    })

    it('should return { exists: true, alreadyInTenant: true } for existing tenant member', async () => {
      repository.findUserByEmail.mockResolvedValue({
        id: USER_ID,
        name: 'Jane',
        email: 'jane@acme.com',
      })
      repository.findMembershipByUserAndTenant.mockResolvedValue({
        userId: USER_ID,
        tenantId: TENANT_ID,
      })

      const result = await service.checkEmail(TENANT_ID, 'jane@acme.com')

      expect(result).toEqual({
        exists: true,
        user: { id: USER_ID, name: 'Jane', email: 'jane@acme.com' },
        alreadyInTenant: true,
      })
    })

    it('should normalize email (lowercase + trim)', async () => {
      repository.findUserByEmail.mockResolvedValue(null)

      await service.checkEmail(TENANT_ID, '  Test@Acme.COM  ')

      expect(repository.findUserByEmail).toHaveBeenCalledWith('test@acme.com')
    })
  })

  /* ------------------------------------------------------------------ */
  /* assignUser                                                          */
  /* ------------------------------------------------------------------ */
  describe('assignUser', () => {
    it('should assign existing user to tenant', async () => {
      const existingUser = makeUserRow()
      const membership = {
        userId: USER_ID,
        tenantId: TENANT_ID,
        role: UserRole.SOC_ANALYST_L1,
        status: MembershipStatus.ACTIVE,
        createdAt: now,
      }

      repository.findUserWithTenantMembership.mockResolvedValue({
        user: existingUser,
        membership: null,
      })
      repository.findOrCreateUserWithMembership.mockResolvedValue({
        user: existingUser,
        membership,
        isExisting: true,
      })
      repository.findTenantById.mockResolvedValue({
        id: TENANT_ID,
        name: 'Acme Corp',
        slug: 'acme-corp',
      })

      const result = await service.assignUser(
        TENANT_ID,
        { email: 'analyst@acme.com', role: UserRole.SOC_ANALYST_L1 },
        UserRole.TENANT_ADMIN,
        CALLER_ID,
        CALLER_EMAIL
      )

      expect(result).toMatchObject({
        id: USER_ID,
        email: 'analyst@acme.com',
        role: UserRole.SOC_ANALYST_L1,
      })

      expect(mockNotificationsService.notifyTenantAssigned).toHaveBeenCalledWith(
        TENANT_ID,
        USER_ID,
        'Acme Corp',
        UserRole.SOC_ANALYST_L1,
        CALLER_ID,
        CALLER_EMAIL
      )
    })

    it('should create new user with hashed password when user does not exist', async () => {
      const createdUser = makeUserRow({
        id: 'new-user-id',
        email: 'new@acme.com',
        name: 'New User',
      })
      const membership = {
        userId: 'new-user-id',
        tenantId: TENANT_ID,
        role: UserRole.SOC_ANALYST_L1,
        status: MembershipStatus.ACTIVE,
        createdAt: now,
      }

      repository.findUserWithTenantMembership.mockResolvedValue({
        user: null,
        membership: null,
      })
      repository.findOrCreateUserWithMembership.mockResolvedValue({
        user: createdUser,
        membership,
        isExisting: false,
      })
      repository.findTenantById.mockResolvedValue({
        id: TENANT_ID,
        name: 'Acme Corp',
        slug: 'acme-corp',
      })

      const result = await service.assignUser(
        TENANT_ID,
        {
          email: 'new@acme.com',
          name: 'New User',
          password: 'StrongP@ss1',
          role: UserRole.SOC_ANALYST_L1,
        },
        UserRole.TENANT_ADMIN,
        CALLER_ID,
        CALLER_EMAIL
      )

      expect(result).toMatchObject({
        id: 'new-user-id',
        email: 'new@acme.com',
        name: 'New User',
      })
    })

    it('should throw 403 when non-GLOBAL_ADMIN tries to assign GLOBAL_ADMIN role', async () => {
      await expect(
        service.assignUser(
          TENANT_ID,
          { email: 'test@acme.com', role: UserRole.GLOBAL_ADMIN },
          UserRole.TENANT_ADMIN,
          CALLER_ID,
          CALLER_EMAIL
        )
      ).rejects.toThrow(BusinessException)

      await expect(
        service.assignUser(
          TENANT_ID,
          { email: 'test@acme.com', role: UserRole.GLOBAL_ADMIN },
          UserRole.TENANT_ADMIN,
          CALLER_ID,
          CALLER_EMAIL
        )
      ).rejects.toMatchObject({
        messageKey: 'errors.tenants.cannotAssignGlobalAdmin',
      })
    })

    it('should throw 403 when trying to reassign protected user', async () => {
      const protectedUser = makeUserRow({ isProtected: true })

      repository.findUserWithTenantMembership.mockResolvedValue({
        user: protectedUser,
        membership: null,
      })

      await expect(
        service.assignUser(
          TENANT_ID,
          { email: 'analyst@acme.com', role: UserRole.SOC_ANALYST_L1 },
          UserRole.TENANT_ADMIN,
          CALLER_ID,
          CALLER_EMAIL
        )
      ).rejects.toThrow(BusinessException)

      repository.findUserWithTenantMembership.mockResolvedValue({
        user: protectedUser,
        membership: null,
      })

      await expect(
        service.assignUser(
          TENANT_ID,
          { email: 'analyst@acme.com', role: UserRole.SOC_ANALYST_L1 },
          UserRole.TENANT_ADMIN,
          CALLER_ID,
          CALLER_EMAIL
        )
      ).rejects.toMatchObject({
        messageKey: 'errors.tenants.userProtected',
      })
    })

    it('should throw 409 when user already in tenant', async () => {
      const existingUser = makeUserRow()

      repository.findUserWithTenantMembership.mockResolvedValue({
        user: existingUser,
        membership: { role: UserRole.SOC_ANALYST_L1, status: MembershipStatus.ACTIVE },
      })

      await expect(
        service.assignUser(
          TENANT_ID,
          { email: 'analyst@acme.com', role: UserRole.SOC_ANALYST_L1 },
          UserRole.TENANT_ADMIN,
          CALLER_ID,
          CALLER_EMAIL
        )
      ).rejects.toThrow(BusinessException)

      repository.findUserWithTenantMembership.mockResolvedValue({
        user: existingUser,
        membership: { role: UserRole.SOC_ANALYST_L1, status: MembershipStatus.ACTIVE },
      })

      await expect(
        service.assignUser(
          TENANT_ID,
          { email: 'analyst@acme.com', role: UserRole.SOC_ANALYST_L1 },
          UserRole.TENANT_ADMIN,
          CALLER_ID,
          CALLER_EMAIL
        )
      ).rejects.toMatchObject({
        messageKey: 'errors.tenants.userAlreadyInTenant',
      })
    })

    it('should throw 400 when name missing for new user', async () => {
      repository.findUserWithTenantMembership.mockResolvedValue({
        user: null,
        membership: null,
      })

      await expect(
        service.assignUser(
          TENANT_ID,
          { email: 'new@acme.com', role: UserRole.SOC_ANALYST_L1 },
          UserRole.TENANT_ADMIN,
          CALLER_ID,
          CALLER_EMAIL
        )
      ).rejects.toThrow(BusinessException)

      repository.findUserWithTenantMembership.mockResolvedValue({
        user: null,
        membership: null,
      })

      await expect(
        service.assignUser(
          TENANT_ID,
          { email: 'new@acme.com', role: UserRole.SOC_ANALYST_L1 },
          UserRole.TENANT_ADMIN,
          CALLER_ID,
          CALLER_EMAIL
        )
      ).rejects.toMatchObject({
        messageKey: 'errors.validation.name.required',
      })
    })

    it('should throw 400 when password missing for new user', async () => {
      repository.findUserWithTenantMembership.mockResolvedValue({
        user: null,
        membership: null,
      })

      await expect(
        service.assignUser(
          TENANT_ID,
          { email: 'new@acme.com', name: 'New User', role: UserRole.SOC_ANALYST_L1 },
          UserRole.TENANT_ADMIN,
          CALLER_ID,
          CALLER_EMAIL
        )
      ).rejects.toThrow(BusinessException)

      repository.findUserWithTenantMembership.mockResolvedValue({
        user: null,
        membership: null,
      })

      await expect(
        service.assignUser(
          TENANT_ID,
          { email: 'new@acme.com', name: 'New User', role: UserRole.SOC_ANALYST_L1 },
          UserRole.TENANT_ADMIN,
          CALLER_ID,
          CALLER_EMAIL
        )
      ).rejects.toMatchObject({
        messageKey: 'errors.validation.password.required',
      })
    })
  })

  /* ------------------------------------------------------------------ */
  /* updateUser                                                          */
  /* ------------------------------------------------------------------ */
  describe('updateUser', () => {
    it('should update user name and role', async () => {
      const membership = makeMembershipRow()
      repository.findMembershipWithUser
        .mockResolvedValueOnce(membership) // first lookup
        .mockResolvedValueOnce({
          ...membership,
          role: UserRole.SOC_ANALYST_L2,
          user: { ...membership.user, name: 'Jane Updated' },
        }) // after update lookup
      repository.updateMembershipRole.mockResolvedValue({})
      repository.updateUser.mockResolvedValue({})

      const result = await service.updateUser(
        TENANT_ID,
        USER_ID,
        { name: 'Jane Updated', role: UserRole.SOC_ANALYST_L2 },
        UserRole.TENANT_ADMIN,
        CALLER_ID,
        CALLER_EMAIL
      )

      expect(result).toMatchObject({
        id: USER_ID,
        name: 'Jane Updated',
        role: UserRole.SOC_ANALYST_L2,
      })

      expect(mockNotificationsService.notifyRoleChanged).toHaveBeenCalledWith(
        TENANT_ID,
        USER_ID,
        UserRole.SOC_ANALYST_L1,
        UserRole.SOC_ANALYST_L2,
        CALLER_ID,
        CALLER_EMAIL
      )
      expect(mockNotificationsService.emitPermissionsUpdated).toHaveBeenCalledWith(
        TENANT_ID,
        USER_ID,
        PermissionUpdateReason.ROLE_UPDATED
      )
    })

    it('should throw 403 when trying to change own role', async () => {
      await expect(
        service.updateUser(
          TENANT_ID,
          CALLER_ID,
          { role: UserRole.GLOBAL_ADMIN },
          UserRole.TENANT_ADMIN,
          CALLER_ID,
          CALLER_EMAIL
        )
      ).rejects.toThrow(BusinessException)

      await expect(
        service.updateUser(
          TENANT_ID,
          CALLER_ID,
          { role: UserRole.GLOBAL_ADMIN },
          UserRole.TENANT_ADMIN,
          CALLER_ID,
          CALLER_EMAIL
        )
      ).rejects.toMatchObject({
        messageKey: 'errors.tenants.cannotModifySelf',
      })
    })

    it('should throw 403 when modifying protected user role', async () => {
      const protectedMembership = makeMembershipRow({
        user: { ...makeMembershipRow().user, isProtected: true },
      })
      repository.findMembershipWithUser.mockResolvedValue(protectedMembership)

      await expect(
        service.updateUser(
          TENANT_ID,
          USER_ID,
          { role: UserRole.SOC_ANALYST_L2 },
          UserRole.GLOBAL_ADMIN,
          CALLER_ID,
          CALLER_EMAIL
        )
      ).rejects.toThrow(BusinessException)

      repository.findMembershipWithUser.mockResolvedValue(protectedMembership)

      await expect(
        service.updateUser(
          TENANT_ID,
          USER_ID,
          { role: UserRole.SOC_ANALYST_L2 },
          UserRole.GLOBAL_ADMIN,
          CALLER_ID,
          CALLER_EMAIL
        )
      ).rejects.toMatchObject({
        messageKey: 'errors.tenants.userProtected',
      })
    })

    it('should throw 403 when modifying any protected user fields', async () => {
      const protectedMembership = makeMembershipRow({
        user: { ...makeMembershipRow().user, isProtected: true },
      })
      repository.findMembershipWithUser.mockResolvedValue(protectedMembership)

      await expect(
        service.updateUser(
          TENANT_ID,
          USER_ID,
          { name: 'Changed Name' },
          UserRole.GLOBAL_ADMIN,
          CALLER_ID,
          CALLER_EMAIL
        )
      ).rejects.toMatchObject({
        messageKey: 'errors.tenants.userProtected',
      })
    })

    it('should throw 403 when non-GLOBAL_ADMIN modifies GLOBAL_ADMIN user', async () => {
      const globalAdminMembership = makeMembershipRow({ role: UserRole.GLOBAL_ADMIN })
      repository.findMembershipWithUser.mockResolvedValue(globalAdminMembership)

      await expect(
        service.updateUser(
          TENANT_ID,
          USER_ID,
          { name: 'Changed' },
          UserRole.TENANT_ADMIN,
          CALLER_ID,
          CALLER_EMAIL
        )
      ).rejects.toThrow(BusinessException)

      repository.findMembershipWithUser.mockResolvedValue(globalAdminMembership)

      await expect(
        service.updateUser(
          TENANT_ID,
          USER_ID,
          { name: 'Changed' },
          UserRole.TENANT_ADMIN,
          CALLER_ID,
          CALLER_EMAIL
        )
      ).rejects.toMatchObject({
        messageKey: 'errors.tenants.cannotModifyGlobalAdmin',
      })
    })

    it('should throw 404 when user not found', async () => {
      repository.findMembershipWithUser.mockResolvedValue(null)

      await expect(
        service.updateUser(
          TENANT_ID,
          'nonexistent',
          { name: 'Test' },
          UserRole.TENANT_ADMIN,
          CALLER_ID,
          CALLER_EMAIL
        )
      ).rejects.toThrow(BusinessException)

      repository.findMembershipWithUser.mockResolvedValue(null)

      await expect(
        service.updateUser(
          TENANT_ID,
          'nonexistent',
          { name: 'Test' },
          UserRole.TENANT_ADMIN,
          CALLER_ID,
          CALLER_EMAIL
        )
      ).rejects.toMatchObject({
        messageKey: 'errors.tenants.userNotFound',
      })
    })
  })

  /* ------------------------------------------------------------------ */
  /* removeUser                                                          */
  /* ------------------------------------------------------------------ */
  describe('removeUser', () => {
    it('should set membership status to INACTIVE', async () => {
      const membership = makeMembershipRow()
      repository.findMembershipWithUser.mockResolvedValue(membership)
      repository.updateMembershipStatus.mockResolvedValue({})

      const result = await service.removeUser(
        TENANT_ID,
        USER_ID,
        UserRole.TENANT_ADMIN,
        CALLER_ID,
        CALLER_EMAIL
      )

      expect(result).toEqual({ deleted: true })
      expect(repository.updateMembershipStatus).toHaveBeenCalledWith(
        USER_ID,
        TENANT_ID,
        MembershipStatus.INACTIVE
      )
      expect(mockNotificationsService.notifyUserRemoved).toHaveBeenCalledWith(
        TENANT_ID,
        USER_ID,
        CALLER_ID,
        CALLER_EMAIL
      )
      expect(mockNotificationsService.emitPermissionsUpdated).toHaveBeenCalledWith(
        TENANT_ID,
        USER_ID,
        PermissionUpdateReason.MEMBERSHIP_STATUS_UPDATED
      )
    })

    it('should throw 403 when trying to delete self', async () => {
      await expect(
        service.removeUser(TENANT_ID, CALLER_ID, UserRole.TENANT_ADMIN, CALLER_ID, CALLER_EMAIL)
      ).rejects.toThrow(BusinessException)

      await expect(
        service.removeUser(TENANT_ID, CALLER_ID, UserRole.TENANT_ADMIN, CALLER_ID, CALLER_EMAIL)
      ).rejects.toMatchObject({
        messageKey: 'errors.tenants.cannotDeleteSelf',
      })
    })

    it('should throw 403 for protected user', async () => {
      const protectedMembership = makeMembershipRow({
        user: { ...makeMembershipRow().user, isProtected: true },
      })
      repository.findMembershipWithUser.mockResolvedValue(protectedMembership)

      await expect(
        service.removeUser(TENANT_ID, USER_ID, UserRole.TENANT_ADMIN, CALLER_ID, CALLER_EMAIL)
      ).rejects.toThrow(BusinessException)

      repository.findMembershipWithUser.mockResolvedValue(protectedMembership)

      await expect(
        service.removeUser(TENANT_ID, USER_ID, UserRole.TENANT_ADMIN, CALLER_ID, CALLER_EMAIL)
      ).rejects.toMatchObject({
        messageKey: 'errors.tenants.userProtected',
      })
    })

    it('should throw 404 when user not found', async () => {
      repository.findMembershipWithUser.mockResolvedValue(null)

      await expect(
        service.removeUser(TENANT_ID, 'nonexistent', UserRole.TENANT_ADMIN, CALLER_ID, CALLER_EMAIL)
      ).rejects.toThrow(BusinessException)

      repository.findMembershipWithUser.mockResolvedValue(null)

      await expect(
        service.removeUser(TENANT_ID, 'nonexistent', UserRole.TENANT_ADMIN, CALLER_ID, CALLER_EMAIL)
      ).rejects.toMatchObject({
        messageKey: 'errors.tenants.userNotFound',
      })
    })
  })

  /* ------------------------------------------------------------------ */
  /* restoreUser                                                         */
  /* ------------------------------------------------------------------ */
  describe('restoreUser', () => {
    it('should restore INACTIVE membership to ACTIVE', async () => {
      const inactiveMembership = makeMembershipRow({ status: MembershipStatus.INACTIVE })
      repository.findMembershipWithUser.mockResolvedValue(inactiveMembership)

      const restoredMembership = makeMembershipRow({ status: MembershipStatus.ACTIVE })
      repository.updateMembershipStatusWithUser.mockResolvedValue(restoredMembership)

      const result = await service.restoreUser(
        TENANT_ID,
        USER_ID,
        UserRole.TENANT_ADMIN,
        CALLER_ID,
        CALLER_EMAIL
      )

      expect(result).toMatchObject({
        id: USER_ID,
        status: MembershipStatus.ACTIVE,
      })
      expect(repository.updateMembershipStatusWithUser).toHaveBeenCalledWith(
        USER_ID,
        TENANT_ID,
        MembershipStatus.ACTIVE
      )
      expect(mockNotificationsService.notifyUserRestored).toHaveBeenCalledWith(
        TENANT_ID,
        USER_ID,
        CALLER_ID,
        CALLER_EMAIL
      )
      expect(mockNotificationsService.emitPermissionsUpdated).toHaveBeenCalledWith(
        TENANT_ID,
        USER_ID,
        PermissionUpdateReason.MEMBERSHIP_STATUS_UPDATED
      )
    })

    it('should throw 404 when not found', async () => {
      repository.findMembershipWithUser.mockResolvedValue(null)

      await expect(
        service.restoreUser(
          TENANT_ID,
          'nonexistent',
          UserRole.TENANT_ADMIN,
          CALLER_ID,
          CALLER_EMAIL
        )
      ).rejects.toThrow(BusinessException)

      repository.findMembershipWithUser.mockResolvedValue(null)

      await expect(
        service.restoreUser(
          TENANT_ID,
          'nonexistent',
          UserRole.TENANT_ADMIN,
          CALLER_ID,
          CALLER_EMAIL
        )
      ).rejects.toMatchObject({
        messageKey: 'errors.tenants.userNotFound',
      })
    })

    it('should throw 400 when user not deleted (status !== INACTIVE)', async () => {
      const activeMembership = makeMembershipRow({ status: MembershipStatus.ACTIVE })
      repository.findMembershipWithUser.mockResolvedValue(activeMembership)

      await expect(
        service.restoreUser(TENANT_ID, USER_ID, UserRole.TENANT_ADMIN, CALLER_ID, CALLER_EMAIL)
      ).rejects.toThrow(BusinessException)

      repository.findMembershipWithUser.mockResolvedValue(activeMembership)

      await expect(
        service.restoreUser(TENANT_ID, USER_ID, UserRole.TENANT_ADMIN, CALLER_ID, CALLER_EMAIL)
      ).rejects.toMatchObject({
        messageKey: 'errors.tenants.userNotDeleted',
      })
    })

    it('should throw 403 when non-GLOBAL_ADMIN restores GLOBAL_ADMIN', async () => {
      const inactiveGlobalAdmin = makeMembershipRow({
        status: MembershipStatus.INACTIVE,
        role: UserRole.GLOBAL_ADMIN,
      })
      repository.findMembershipWithUser.mockResolvedValue(inactiveGlobalAdmin)

      await expect(
        service.restoreUser(TENANT_ID, USER_ID, UserRole.TENANT_ADMIN, CALLER_ID, CALLER_EMAIL)
      ).rejects.toThrow(BusinessException)

      repository.findMembershipWithUser.mockResolvedValue(inactiveGlobalAdmin)

      await expect(
        service.restoreUser(TENANT_ID, USER_ID, UserRole.TENANT_ADMIN, CALLER_ID, CALLER_EMAIL)
      ).rejects.toMatchObject({
        messageKey: 'errors.tenants.cannotModifyGlobalAdmin',
      })
    })
  })

  /* ------------------------------------------------------------------ */
  /* blockUser                                                           */
  /* ------------------------------------------------------------------ */
  describe('blockUser', () => {
    it('should set status to SUSPENDED', async () => {
      const activeMembership = makeMembershipRow({ status: MembershipStatus.ACTIVE })
      repository.findMembershipWithUser.mockResolvedValue(activeMembership)

      const suspendedMembership = makeMembershipRow({ status: MembershipStatus.SUSPENDED })
      repository.updateMembershipStatusWithUser.mockResolvedValue(suspendedMembership)

      const result = await service.blockUser(
        TENANT_ID,
        USER_ID,
        UserRole.TENANT_ADMIN,
        CALLER_ID,
        CALLER_EMAIL
      )

      expect(result).toMatchObject({
        id: USER_ID,
        status: MembershipStatus.SUSPENDED,
      })
      expect(mockNotificationsService.notifyUserBlocked).toHaveBeenCalledWith(
        TENANT_ID,
        USER_ID,
        CALLER_ID,
        CALLER_EMAIL
      )
      expect(mockNotificationsService.emitPermissionsUpdated).toHaveBeenCalledWith(
        TENANT_ID,
        USER_ID,
        PermissionUpdateReason.MEMBERSHIP_STATUS_UPDATED
      )
    })

    it('should throw 403 when blocking self', async () => {
      await expect(
        service.blockUser(TENANT_ID, CALLER_ID, UserRole.TENANT_ADMIN, CALLER_ID, CALLER_EMAIL)
      ).rejects.toThrow(BusinessException)

      await expect(
        service.blockUser(TENANT_ID, CALLER_ID, UserRole.TENANT_ADMIN, CALLER_ID, CALLER_EMAIL)
      ).rejects.toMatchObject({
        messageKey: 'errors.tenants.cannotBlockSelf',
      })
    })

    it('should throw 403 for protected user', async () => {
      const protectedMembership = makeMembershipRow({
        user: { ...makeMembershipRow().user, isProtected: true },
      })
      repository.findMembershipWithUser.mockResolvedValue(protectedMembership)

      await expect(
        service.blockUser(TENANT_ID, USER_ID, UserRole.TENANT_ADMIN, CALLER_ID, CALLER_EMAIL)
      ).rejects.toThrow(BusinessException)

      repository.findMembershipWithUser.mockResolvedValue(protectedMembership)

      await expect(
        service.blockUser(TENANT_ID, USER_ID, UserRole.TENANT_ADMIN, CALLER_ID, CALLER_EMAIL)
      ).rejects.toMatchObject({
        messageKey: 'errors.tenants.userProtected',
      })
    })

    it('should throw 400 when already blocked', async () => {
      const suspendedMembership = makeMembershipRow({ status: MembershipStatus.SUSPENDED })
      repository.findMembershipWithUser.mockResolvedValue(suspendedMembership)

      await expect(
        service.blockUser(TENANT_ID, USER_ID, UserRole.TENANT_ADMIN, CALLER_ID, CALLER_EMAIL)
      ).rejects.toThrow(BusinessException)

      repository.findMembershipWithUser.mockResolvedValue(suspendedMembership)

      await expect(
        service.blockUser(TENANT_ID, USER_ID, UserRole.TENANT_ADMIN, CALLER_ID, CALLER_EMAIL)
      ).rejects.toMatchObject({
        messageKey: 'errors.tenants.userAlreadyBlocked',
      })
    })

    it('should throw 404 when not found', async () => {
      repository.findMembershipWithUser.mockResolvedValue(null)

      await expect(
        service.blockUser(TENANT_ID, 'nonexistent', UserRole.TENANT_ADMIN, CALLER_ID, CALLER_EMAIL)
      ).rejects.toThrow(BusinessException)

      repository.findMembershipWithUser.mockResolvedValue(null)

      await expect(
        service.blockUser(TENANT_ID, 'nonexistent', UserRole.TENANT_ADMIN, CALLER_ID, CALLER_EMAIL)
      ).rejects.toMatchObject({
        messageKey: 'errors.tenants.userNotFound',
      })
    })
  })

  /* ------------------------------------------------------------------ */
  /* unblockUser                                                         */
  /* ------------------------------------------------------------------ */
  describe('unblockUser', () => {
    it('should set status from SUSPENDED to ACTIVE', async () => {
      const suspendedMembership = makeMembershipRow({ status: MembershipStatus.SUSPENDED })
      repository.findMembershipWithUser.mockResolvedValue(suspendedMembership)

      const activeMembership = makeMembershipRow({ status: MembershipStatus.ACTIVE })
      repository.updateMembershipStatusWithUser.mockResolvedValue(activeMembership)

      const result = await service.unblockUser(
        TENANT_ID,
        USER_ID,
        UserRole.TENANT_ADMIN,
        CALLER_ID,
        CALLER_EMAIL
      )

      expect(result).toMatchObject({
        id: USER_ID,
        status: MembershipStatus.ACTIVE,
      })
      expect(mockNotificationsService.notifyUserUnblocked).toHaveBeenCalledWith(
        TENANT_ID,
        USER_ID,
        CALLER_ID,
        CALLER_EMAIL
      )
      expect(mockNotificationsService.emitPermissionsUpdated).toHaveBeenCalledWith(
        TENANT_ID,
        USER_ID,
        PermissionUpdateReason.MEMBERSHIP_STATUS_UPDATED
      )
    })

    it('should throw 400 when not blocked', async () => {
      const activeMembership = makeMembershipRow({ status: MembershipStatus.ACTIVE })
      repository.findMembershipWithUser.mockResolvedValue(activeMembership)

      await expect(
        service.unblockUser(TENANT_ID, USER_ID, UserRole.TENANT_ADMIN, CALLER_ID, CALLER_EMAIL)
      ).rejects.toThrow(BusinessException)

      repository.findMembershipWithUser.mockResolvedValue(activeMembership)

      await expect(
        service.unblockUser(TENANT_ID, USER_ID, UserRole.TENANT_ADMIN, CALLER_ID, CALLER_EMAIL)
      ).rejects.toMatchObject({
        messageKey: 'errors.tenants.userNotBlocked',
      })
    })

    it('should throw 403 for non-admin unblocking GLOBAL_ADMIN', async () => {
      const suspendedGlobalAdmin = makeMembershipRow({
        status: MembershipStatus.SUSPENDED,
        role: UserRole.GLOBAL_ADMIN,
      })
      repository.findMembershipWithUser.mockResolvedValue(suspendedGlobalAdmin)

      await expect(
        service.unblockUser(TENANT_ID, USER_ID, UserRole.TENANT_ADMIN, CALLER_ID, CALLER_EMAIL)
      ).rejects.toThrow(BusinessException)

      repository.findMembershipWithUser.mockResolvedValue(suspendedGlobalAdmin)

      await expect(
        service.unblockUser(TENANT_ID, USER_ID, UserRole.TENANT_ADMIN, CALLER_ID, CALLER_EMAIL)
      ).rejects.toMatchObject({
        messageKey: 'errors.tenants.cannotModifyGlobalAdmin',
      })
    })

    it('should throw 404 when not found', async () => {
      repository.findMembershipWithUser.mockResolvedValue(null)

      await expect(
        service.unblockUser(
          TENANT_ID,
          'nonexistent',
          UserRole.TENANT_ADMIN,
          CALLER_ID,
          CALLER_EMAIL
        )
      ).rejects.toThrow(BusinessException)

      repository.findMembershipWithUser.mockResolvedValue(null)

      await expect(
        service.unblockUser(
          TENANT_ID,
          'nonexistent',
          UserRole.TENANT_ADMIN,
          CALLER_ID,
          CALLER_EMAIL
        )
      ).rejects.toMatchObject({
        messageKey: 'errors.tenants.userNotFound',
      })
    })
  })

  /* ------------------------------------------------------------------ */
  /* impersonateUser                                                     */
  /* ------------------------------------------------------------------ */
  describe('impersonateUser', () => {
    const callerPayload = {
      sub: CALLER_ID,
      email: 'admin@acme.com',
      tenantId: TENANT_ID,
      tenantSlug: 'acme-corp',
      role: UserRole.GLOBAL_ADMIN,
    }

    it('should return impersonation tokens', async () => {
      repository.findTenantById.mockResolvedValue({
        id: TENANT_ID,
        slug: 'acme-corp',
        name: 'Acme Corp',
      })
      repository.findUserById.mockResolvedValue({
        id: USER_ID,
        email: 'analyst@acme.com',
        name: 'Jane Doe',
        isProtected: false,
      })
      repository.findMembershipByUserAndTenant.mockResolvedValue({
        userId: USER_ID,
        tenantId: TENANT_ID,
        role: UserRole.SOC_ANALYST_L1,
        status: MembershipStatus.ACTIVE,
      })

      const result = await service.impersonateUser(TENANT_ID, USER_ID, callerPayload)

      expect(result.accessToken).toBe('mock-access')
      expect(result.refreshToken).toBe('mock-refresh')
      expect(result.user).toMatchObject({
        sub: USER_ID,
        email: 'analyst@acme.com',
        tenantId: TENANT_ID,
        tenantSlug: 'acme-corp',
        role: UserRole.SOC_ANALYST_L1,
      })
      expect(result.impersonator).toMatchObject({
        sub: CALLER_ID,
        email: 'admin@acme.com',
        role: UserRole.GLOBAL_ADMIN,
      })
    })

    it('should throw 403 for nested impersonation', async () => {
      const impersonatedCaller = { ...callerPayload, isImpersonated: true }

      await expect(service.impersonateUser(TENANT_ID, USER_ID, impersonatedCaller)).rejects.toThrow(
        BusinessException
      )

      await expect(
        service.impersonateUser(TENANT_ID, USER_ID, impersonatedCaller)
      ).rejects.toMatchObject({
        messageKey: 'errors.impersonation.nestedNotAllowed',
      })
    })

    it('should throw 400 for self-impersonation', async () => {
      const selfCaller = { ...callerPayload, sub: USER_ID }

      await expect(service.impersonateUser(TENANT_ID, USER_ID, selfCaller)).rejects.toThrow(
        BusinessException
      )

      await expect(service.impersonateUser(TENANT_ID, USER_ID, selfCaller)).rejects.toMatchObject({
        messageKey: 'errors.impersonation.cannotImpersonateSelf',
      })
    })

    it('should throw 403 for protected user', async () => {
      repository.findTenantById.mockResolvedValue({
        id: TENANT_ID,
        slug: 'acme-corp',
        name: 'Acme Corp',
      })
      repository.findUserById.mockResolvedValue({
        id: USER_ID,
        email: 'analyst@acme.com',
        name: 'Jane Doe',
        isProtected: true,
      })

      await expect(service.impersonateUser(TENANT_ID, USER_ID, callerPayload)).rejects.toThrow(
        BusinessException
      )

      repository.findTenantById.mockResolvedValue({
        id: TENANT_ID,
        slug: 'acme-corp',
        name: 'Acme Corp',
      })
      repository.findUserById.mockResolvedValue({
        id: USER_ID,
        email: 'analyst@acme.com',
        name: 'Jane Doe',
        isProtected: true,
      })

      await expect(
        service.impersonateUser(TENANT_ID, USER_ID, callerPayload)
      ).rejects.toMatchObject({
        messageKey: 'errors.impersonation.protectedUser',
      })
    })

    it('should throw 403 when caller does not have higher role than target', async () => {
      const tenantAdminCaller = { ...callerPayload, role: UserRole.TENANT_ADMIN }

      repository.findTenantById.mockResolvedValue({
        id: TENANT_ID,
        slug: 'acme-corp',
        name: 'Acme Corp',
      })
      repository.findUserById.mockResolvedValue({
        id: USER_ID,
        email: 'other-admin@acme.com',
        name: 'Other Admin',
        isProtected: false,
      })
      repository.findMembershipByUserAndTenant.mockResolvedValue({
        userId: USER_ID,
        tenantId: TENANT_ID,
        role: UserRole.TENANT_ADMIN,
        status: MembershipStatus.ACTIVE,
      })

      await expect(service.impersonateUser(TENANT_ID, USER_ID, tenantAdminCaller)).rejects.toThrow(
        BusinessException
      )

      repository.findTenantById.mockResolvedValue({
        id: TENANT_ID,
        slug: 'acme-corp',
        name: 'Acme Corp',
      })
      repository.findUserById.mockResolvedValue({
        id: USER_ID,
        email: 'other-admin@acme.com',
        name: 'Other Admin',
        isProtected: false,
      })
      repository.findMembershipByUserAndTenant.mockResolvedValue({
        userId: USER_ID,
        tenantId: TENANT_ID,
        role: UserRole.TENANT_ADMIN,
        status: MembershipStatus.ACTIVE,
      })

      await expect(
        service.impersonateUser(TENANT_ID, USER_ID, tenantAdminCaller)
      ).rejects.toMatchObject({
        messageKey: 'errors.impersonation.insufficientPrivilege',
      })
    })
  })
})
