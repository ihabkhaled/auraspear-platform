import { PlatformAdminBootstrapService } from '../../src/modules/auth/platform-admin-bootstrap.service'

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}))

const bcrypt = jest.requireMock('bcryptjs') as {
  compare: jest.Mock
  hash: jest.Mock
}

const mockAppLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}

function createMockRepository() {
  return {
    findPlatformAdminByEmail: jest.fn(),
    upsertPlatformAdmin: jest.fn(),
    upsertUserPreference: jest.fn(),
    findAllTenantIds: jest.fn(),
    upsertGlobalAdminMembership: jest.fn(),
  }
}

describe('PlatformAdminBootstrapService', () => {
  let service: PlatformAdminBootstrapService
  let repository: ReturnType<typeof createMockRepository>

  beforeEach(() => {
    repository = createMockRepository()
    bcrypt.compare.mockReset()
    bcrypt.hash.mockReset()
    jest.clearAllMocks()

    service = new PlatformAdminBootstrapService(
      repository as never,
      {
        get: jest.fn().mockReturnValue('Admin@123!Secure'),
      } as never,
      mockAppLogger as never
    )
  })

  it('creates the platform admin and global admin memberships when missing', async () => {
    repository.findPlatformAdminByEmail.mockResolvedValue(null)
    bcrypt.hash.mockResolvedValue('hashed-password')
    repository.upsertPlatformAdmin.mockResolvedValue({ id: 'platform-admin-id' })
    repository.findAllTenantIds.mockResolvedValue(['tenant-1', 'tenant-2'])
    repository.upsertUserPreference.mockResolvedValue(undefined)
    repository.upsertGlobalAdminMembership.mockResolvedValue(undefined)

    await service.ensurePlatformAdmin()

    expect(repository.upsertPlatformAdmin).toHaveBeenCalledWith({
      email: 'platform-admin@auraspear.io',
      name: 'Platform Administrator',
      passwordHash: 'hashed-password',
    })
    expect(repository.upsertUserPreference).toHaveBeenCalledWith('platform-admin-id')
    expect(repository.upsertGlobalAdminMembership).toHaveBeenCalledWith(
      'platform-admin-id',
      'tenant-1'
    )
    expect(repository.upsertGlobalAdminMembership).toHaveBeenCalledWith(
      'platform-admin-id',
      'tenant-2'
    )
  })

  it('re-syncs the password hash when the configured password no longer matches', async () => {
    repository.findPlatformAdminByEmail.mockResolvedValue({
      id: 'platform-admin-id',
      passwordHash: 'old-hash',
    })
    bcrypt.compare.mockResolvedValue(false)
    bcrypt.hash.mockResolvedValue('new-hash')
    repository.upsertPlatformAdmin.mockResolvedValue({ id: 'platform-admin-id' })
    repository.findAllTenantIds.mockResolvedValue([])
    repository.upsertUserPreference.mockResolvedValue(undefined)

    await service.ensurePlatformAdmin()

    expect(bcrypt.compare).toHaveBeenCalledWith('Admin@123!Secure', 'old-hash')
    expect(repository.upsertPlatformAdmin).toHaveBeenCalledWith({
      email: 'platform-admin@auraspear.io',
      name: 'Platform Administrator',
      passwordHash: 'new-hash',
    })
  })

  it('keeps the existing hash when it already matches the configured password', async () => {
    repository.findPlatformAdminByEmail.mockResolvedValue({
      id: 'platform-admin-id',
      passwordHash: 'current-hash',
    })
    bcrypt.compare.mockResolvedValue(true)
    repository.upsertPlatformAdmin.mockResolvedValue({ id: 'platform-admin-id' })
    repository.findAllTenantIds.mockResolvedValue([])
    repository.upsertUserPreference.mockResolvedValue(undefined)

    await service.ensurePlatformAdmin()

    expect(bcrypt.hash).not.toHaveBeenCalled()
    expect(repository.upsertPlatformAdmin).toHaveBeenCalledWith({
      email: 'platform-admin@auraspear.io',
      name: 'Platform Administrator',
      passwordHash: 'current-hash',
    })
  })
})
