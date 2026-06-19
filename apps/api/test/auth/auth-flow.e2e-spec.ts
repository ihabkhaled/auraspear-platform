import { type INestApplication } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import * as bcrypt from 'bcryptjs'
import cookieParser from 'cookie-parser'
import * as jwt from 'jsonwebtoken'
import request from 'supertest'
import { GlobalExceptionFilter } from '../../src/common/filters/http-exception.filter'
import { AuthGuard } from '../../src/common/guards/auth.guard'
import { CsrfGuard } from '../../src/common/guards/csrf.guard'
import {
  MembershipStatus,
  UserRole,
} from '../../src/common/interfaces/authenticated-request.interface'
import { AppLoggerService } from '../../src/common/services/app-logger.service'
import { nowDate } from '../../src/common/utils/date-time.utility'
import { AuthController } from '../../src/modules/auth/auth.controller'
import { AuthRepository } from '../../src/modules/auth/auth.repository'
import { AuthService } from '../../src/modules/auth/auth.service'
import { TokenBlacklistService } from '../../src/modules/auth/token-blacklist.service'
import { RoleSettingsService } from '../../src/modules/role-settings/role-settings.service'
import { PrismaService } from '../../src/prisma/prisma.service'
import type { JwtPayload } from '../../src/common/interfaces/authenticated-request.interface'
import type { RefreshTokenFamilyStatus, RefreshTokenRotationStatus } from '@prisma/client'

const TEST_JWT_SECRET = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789'
const TEST_PASSWORD = 'P@ssw0rd!Secure'

const PRIMARY_TENANT = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'AuraSpear Demo',
  slug: 'auraspear-demo',
}

const SECONDARY_TENANT = {
  id: '00000000-0000-0000-0000-000000000002',
  name: 'AuraSpear SOC Lab',
  slug: 'auraspear-soc-lab',
}

interface ParsedCookie {
  value: string
  maxAge?: number
  path: string
  httpOnly: boolean
}

interface MockRefreshFamily {
  id: string
  userId: string
  tenantId: string
  currentGeneration: number
  status: RefreshTokenFamilyStatus
  revokedAt: Date | null
  revokedReason: string | null
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

interface MockRefreshRotation {
  id: string
  familyId: string
  generation: number
  jtiHash: string
  parentRotationId: string | null
  status: RefreshTokenRotationStatus
  issuedAt: Date
  usedAt: Date | null
  replacedAt: Date | null
  replayedAt: Date | null
  expiresAt: Date
}

function parseCookies(setCookieHeaders: string[] = []): Map<string, ParsedCookie> {
  const cookies = new Map<string, ParsedCookie>()

  for (const header of setCookieHeaders) {
    const parts = header.split(';').map(part => part.trim())
    const [nameValue, ...attributes] = parts
    if (!nameValue) {
      continue
    }

    const separatorIndex = nameValue.indexOf('=')
    if (separatorIndex < 0) {
      continue
    }

    const name = nameValue.slice(0, separatorIndex)
    const value = nameValue.slice(separatorIndex + 1)
    const cookie: ParsedCookie = {
      value,
      path: '/',
      httpOnly: false,
    }

    for (const attribute of attributes) {
      const lower = attribute.toLowerCase()
      if (lower === 'httponly') {
        cookie.httpOnly = true
        continue
      }

      if (lower.startsWith('path=')) {
        cookie.path = attribute.slice(5)
        continue
      }

      if (lower.startsWith('max-age=')) {
        cookie.maxAge = Number(attribute.slice(8))
      }
    }

    cookies.set(name, cookie)
  }

  return cookies
}

function decodeToken(token: string): JwtPayload {
  return jwt.verify(token, TEST_JWT_SECRET, { algorithms: ['HS256'] }) as JwtPayload
}

function buildMockRepository(passwordHash: string): Record<string, jest.Mock> {
  const userId = '00000000-0000-0000-0000-000000000010'
  const baseUser = {
    id: userId,
    email: 'analyst@auraspear.io',
    name: 'SOC Analyst',
    passwordHash,
    oidcSub: null,
    createdAt: nowDate(),
    updatedAt: nowDate(),
    lastLoginAt: null,
    isProtected: false,
  }

  const memberships = [
    {
      id: 'membership-001',
      userId,
      tenantId: PRIMARY_TENANT.id,
      role: UserRole.TENANT_ADMIN,
      status: MembershipStatus.ACTIVE,
      createdAt: nowDate(),
      updatedAt: nowDate(),
      tenant: PRIMARY_TENANT,
    },
    {
      id: 'membership-002',
      userId,
      tenantId: SECONDARY_TENANT.id,
      role: UserRole.THREAT_HUNTER,
      status: MembershipStatus.ACTIVE,
      createdAt: nowDate(),
      updatedAt: nowDate(),
      tenant: SECONDARY_TENANT,
    },
  ]

  const families = new Map<string, MockRefreshFamily>()
  const rotationsById = new Map<string, MockRefreshRotation>()
  const rotationsByHash = new Map<string, MockRefreshRotation>()
  const sessionsByFamily = new Map<
    string,
    {
      familyId: string
      userId: string
      tenantId: string
      status: string
      currentAccessJti: string | null
      currentAccessExpiresAt: Date | null
      lastSeenAt: Date
      lastLoginAt: Date
    }
  >()
  let rotationCounter = 0

  return {
    findUserByEmailWithMemberships: jest.fn(async (email: string) => {
      if (email !== baseUser.email) {
        return null
      }

      return {
        ...baseUser,
        memberships,
      }
    }),
    updateLastLogin: jest.fn(async () => ({
      ...baseUser,
      lastLoginAt: nowDate(),
    })),
    findUserByIdWithActiveMembershipCheck: jest.fn(async (userIdToFind: string) => {
      if (userIdToFind !== userId) {
        return null
      }

      return {
        ...baseUser,
        memberships: [{ id: memberships[0]?.id ?? 'membership-001' }],
      }
    }),
    findMembershipByUserAndTenant: jest.fn(async (userIdToFind: string, tenantId: string) => {
      if (userIdToFind !== userId) {
        return null
      }

      return memberships.find(membership => membership.tenantId === tenantId) ?? null
    }),
    findActiveMembershipsWithTenant: jest.fn(async (userIdToFind: string) => {
      if (userIdToFind !== userId) {
        return []
      }

      return memberships
    }),
    findUserByIdWithAllActiveMemberships: jest.fn(async (userIdToFind: string) => {
      if (userIdToFind !== userId) {
        return null
      }

      return {
        ...baseUser,
        memberships,
      }
    }),
    createRefreshTokenFamily: jest.fn(
      async (data: {
        id: string
        userId: string
        tenantId: string
        currentGeneration: number
        expiresAt: Date
      }) => {
        const family: MockRefreshFamily = {
          id: data.id,
          userId: data.userId,
          tenantId: data.tenantId,
          currentGeneration: data.currentGeneration,
          status: 'active',
          revokedAt: null,
          revokedReason: null,
          expiresAt: data.expiresAt,
          createdAt: nowDate(),
          updatedAt: nowDate(),
        }
        families.set(family.id, family)
        return family
      }
    ),
    createRefreshTokenRotation: jest.fn(
      async (data: {
        familyId: string
        generation: number
        jtiHash: string
        expiresAt: Date
        parentRotationId?: string
      }) => {
        rotationCounter += 1
        const rotation: MockRefreshRotation = {
          id: `rotation-${String(rotationCounter)}`,
          familyId: data.familyId,
          generation: data.generation,
          jtiHash: data.jtiHash,
          parentRotationId: data.parentRotationId ?? null,
          status: 'active',
          issuedAt: nowDate(),
          usedAt: null,
          replacedAt: null,
          replayedAt: null,
          expiresAt: data.expiresAt,
        }
        rotationsById.set(rotation.id, rotation)
        rotationsByHash.set(rotation.jtiHash, rotation)
        return rotation
      }
    ),
    createUserSession: jest.fn(
      async (data: {
        familyId: string
        userId: string
        tenantId: string
        lastLoginAt: Date
        currentAccessJti: string
        currentAccessExpiresAt: Date
      }) => {
        const session = {
          familyId: data.familyId,
          userId: data.userId,
          tenantId: data.tenantId,
          status: 'active',
          currentAccessJti: data.currentAccessJti,
          currentAccessExpiresAt: data.currentAccessExpiresAt,
          lastSeenAt: data.lastLoginAt,
          lastLoginAt: data.lastLoginAt,
        }

        sessionsByFamily.set(data.familyId, session)

        return {
          id: `session-${data.familyId}`,
          ...session,
        }
      }
    ),
    findUserSessionByFamilyId: jest.fn(async (familyId: string) => {
      const session = sessionsByFamily.get(familyId)
      if (!session) {
        return null
      }

      return {
        id: `session-${familyId}`,
        ...session,
      }
    }),
    findRefreshTokenRotationByHash: jest.fn(async (jtiHash: string) => {
      const rotation = rotationsByHash.get(jtiHash)
      if (!rotation) {
        return null
      }

      const family = families.get(rotation.familyId)
      if (!family) {
        return null
      }

      return { ...rotation, family }
    }),
    rotateRefreshTokenFamily: jest.fn(
      async (data: {
        familyId: string
        expectedGeneration: number
        previousRotationId: string
        nextJtiHash: string
        nextExpiresAt: Date
        nextGeneration: number
        rotatedAt: Date
      }) => {
        const family = families.get(data.familyId)
        if (family?.status !== 'active' || family.currentGeneration !== data.expectedGeneration) {
          return { familyAdvanceCount: 0, newRotation: null }
        }

        family.currentGeneration = data.nextGeneration
        family.expiresAt = data.nextExpiresAt
        family.updatedAt = data.rotatedAt
        families.set(family.id, family)

        const previousRotation = rotationsById.get(data.previousRotationId)
        if (previousRotation) {
          previousRotation.status = 'used'
          previousRotation.usedAt = data.rotatedAt
          previousRotation.replacedAt = data.rotatedAt
          rotationsById.set(previousRotation.id, previousRotation)
          rotationsByHash.set(previousRotation.jtiHash, previousRotation)
        }

        rotationCounter += 1
        const newRotation: MockRefreshRotation = {
          id: `rotation-${String(rotationCounter)}`,
          familyId: family.id,
          generation: data.nextGeneration,
          jtiHash: data.nextJtiHash,
          parentRotationId: data.previousRotationId,
          status: 'active',
          issuedAt: data.rotatedAt,
          usedAt: null,
          replacedAt: null,
          replayedAt: null,
          expiresAt: data.nextExpiresAt,
        }

        rotationsById.set(newRotation.id, newRotation)
        rotationsByHash.set(newRotation.jtiHash, newRotation)

        const session = sessionsByFamily.get(data.familyId)
        if (session) {
          session.currentAccessJti = null
          session.currentAccessExpiresAt = null
          session.lastSeenAt = data.rotatedAt
          sessionsByFamily.set(data.familyId, session)
        }

        return { familyAdvanceCount: 1, newRotation }
      }
    ),
    touchUserSession: jest.fn(
      async (data: {
        familyId: string
        touchedAt: Date
        currentAccessJti?: string
        currentAccessExpiresAt?: Date
      }) => {
        const session = sessionsByFamily.get(data.familyId)
        if (session?.status !== 'active') {
          return 0
        }

        session.lastSeenAt = data.touchedAt
        if (data.currentAccessJti !== undefined) {
          session.currentAccessJti = data.currentAccessJti
        }
        if (data.currentAccessExpiresAt !== undefined) {
          session.currentAccessExpiresAt = data.currentAccessExpiresAt
        }
        sessionsByFamily.set(data.familyId, session)

        return 1
      }
    ),
    revokeRefreshTokenFamily: jest.fn(
      async (
        familyId: string,
        revokedReason: string,
        revokedAt: Date,
        replayedRotationId?: string
      ) => {
        const family = families.get(familyId)
        if (family) {
          family.status = 'revoked'
          family.revokedAt = revokedAt
          family.revokedReason = revokedReason
          family.updatedAt = revokedAt
          families.set(family.id, family)
        }

        for (const rotation of rotationsById.values()) {
          if (rotation.familyId !== familyId) {
            continue
          }

          rotation.status = rotation.id === replayedRotationId ? 'replayed' : 'revoked'
          rotation.replayedAt = rotation.id === replayedRotationId ? revokedAt : rotation.replayedAt
          rotationsById.set(rotation.id, rotation)
          rotationsByHash.set(rotation.jtiHash, rotation)
        }

        const session = sessionsByFamily.get(familyId)
        if (session) {
          session.status = 'revoked'
          sessionsByFamily.set(familyId, session)
        }
      }
    ),
    expireRefreshTokenFamily: jest.fn(async (familyId: string) => {
      const family = families.get(familyId)
      if (family) {
        family.status = 'expired'
        family.updatedAt = nowDate()
        families.set(family.id, family)
      }

      const session = sessionsByFamily.get(familyId)
      if (session) {
        session.status = 'expired'
        sessionsByFamily.set(familyId, session)
      }
    }),
    upsertUserByOidcSub: jest.fn(),
    upsertTenantMembership: jest.fn(),
  }
}

function buildBlacklistService(): {
  service: Record<string, jest.Mock>
  revokedJtis: Set<string>
} {
  const revokedJtis = new Set<string>()

  return {
    revokedJtis,
    service: {
      blacklist: jest.fn(async (jti: string) => {
        revokedJtis.add(jti)
      }),
      isBlacklisted: jest.fn(async (jti: string) => revokedJtis.has(jti)),
      isRedisHealthy: jest.fn(async () => true),
      onModuleDestroy: jest.fn(),
    },
  }
}

describe('Auth Flow (E2E)', () => {
  let app: INestApplication
  let mockRepository: Record<string, jest.Mock>
  let revokedJtis: Set<string>

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12)
    mockRepository = buildMockRepository(passwordHash)
    const { revokedJtis: builtRevokedJtis, service: blacklistService } = buildBlacklistService()
    revokedJtis = builtRevokedJtis

    const moduleReference = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }])],
      controllers: [AuthController],
      providers: [
        AuthService,
        { provide: AuthRepository, useValue: mockRepository },
        { provide: TokenBlacklistService, useValue: blacklistService },
        {
          provide: AppLoggerService,
          useValue: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
        },
        {
          provide: RoleSettingsService,
          useValue: {
            getUserPermissions: jest.fn(async (_tenantId: string, role: string) => [
              `${role}.view`,
            ]),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            tenant: {
              findUnique: jest.fn(async ({ where }: { where: { id: string } }) =>
                where.id === SECONDARY_TENANT.id ? SECONDARY_TENANT : null
              ),
            },
            tenantMembership: { findUnique: jest.fn() },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, defaultValue?: unknown) => {
              const config: Record<string, unknown> = {
                JWT_SECRET: TEST_JWT_SECRET,
                JWT_ACCESS_EXPIRY: '15m',
                JWT_REFRESH_EXPIRY: '7d',
                NODE_ENV: 'test',
              }

              return config[key] ?? defaultValue
            },
          },
        },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_GUARD, useClass: AuthGuard },
        { provide: APP_GUARD, useClass: CsrfGuard },
      ],
    }).compile()

    app = moduleReference.createNestApplication()
    app.setGlobalPrefix('api/v1')
    app.useGlobalFilters(new GlobalExceptionFilter())
    app.use(cookieParser())
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    revokedJtis.clear()
    jest.clearAllMocks()
  })

  it('login sets auth cookies, issues csrf token, and omits refresh token from the response body', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'analyst@auraspear.io', password: TEST_PASSWORD })
      .expect(201)

    expect(response.body.accessToken).toEqual(expect.any(String))
    expect(response.body.csrfToken).toEqual(expect.any(String))
    expect(response.body.refreshToken).toBeUndefined()

    const cookies = parseCookies(response.headers['set-cookie'] as string[] | undefined)
    expect(cookies.get('access_token')?.httpOnly).toBe(true)
    expect(cookies.get('refresh_token')?.httpOnly).toBe(true)
    expect(cookies.get('refresh_token')?.path).toBe('/api/v1/auth')
    expect(cookies.get('csrf_token')?.httpOnly).toBe(false)
  })

  it('refresh requires a valid CSRF header when using the refresh cookie', async () => {
    const agent = request.agent(app.getHttpServer())

    await agent
      .post('/api/v1/auth/login')
      .send({ email: 'analyst@auraspear.io', password: TEST_PASSWORD })
      .expect(201)

    const response = await agent.post('/api/v1/auth/refresh').send({}).expect(403)
    expect(response.body.messageKey).toBe('errors.auth.csrfTokenMismatch')
  })

  it('refresh rotates the token family, detects replay, and revokes the full family after replay', async () => {
    const agent = request.agent(app.getHttpServer())

    const loginResponse = await agent
      .post('/api/v1/auth/login')
      .send({ email: 'analyst@auraspear.io', password: TEST_PASSWORD })
      .expect(201)

    const loginCookies = parseCookies(loginResponse.headers['set-cookie'] as string[] | undefined)
    const oldRefreshToken = loginCookies.get('refresh_token')?.value
    const initialCsrfToken = loginCookies.get('csrf_token')?.value

    expect(oldRefreshToken).toBeDefined()
    expect(initialCsrfToken).toBeDefined()

    const refreshResponse = await agent
      .post('/api/v1/auth/refresh')
      .set('X-CSRF-Token', initialCsrfToken ?? '')
      .send({})
      .expect(201)

    const refreshCookies = parseCookies(
      refreshResponse.headers['set-cookie'] as string[] | undefined
    )
    const latestRefreshToken = refreshCookies.get('refresh_token')?.value
    const latestCsrfToken = refreshCookies.get('csrf_token')?.value

    expect(latestRefreshToken).toBeDefined()
    expect(latestRefreshToken).not.toBe(oldRefreshToken)

    const oldRefreshPayload = decodeToken(oldRefreshToken ?? '')
    if (oldRefreshPayload.jti) {
      revokedJtis.delete(oldRefreshPayload.jti)
    }

    const replayResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', [
        `refresh_token=${oldRefreshToken ?? ''}`,
        `csrf_token=${latestCsrfToken ?? ''}`,
      ])
      .set('X-CSRF-Token', latestCsrfToken ?? '')
      .send({})
      .expect(401)

    expect(replayResponse.body.messageKey).toBe('errors.auth.tokenReplayDetected')

    const familyRevokedResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', [
        `refresh_token=${latestRefreshToken ?? ''}`,
        `csrf_token=${latestCsrfToken ?? ''}`,
      ])
      .set('X-CSRF-Token', latestCsrfToken ?? '')
      .send({})
      .expect(401)

    expect(familyRevokedResponse.body.messageKey).toBe('errors.auth.tokenReplayDetected')
  })

  it('refresh preserves tenant continuity and can mint an access token for another active tenant', async () => {
    const agent = request.agent(app.getHttpServer())

    const loginResponse = await agent
      .post('/api/v1/auth/login')
      .send({ email: 'analyst@auraspear.io', password: TEST_PASSWORD })
      .expect(201)

    const cookies = parseCookies(loginResponse.headers['set-cookie'] as string[] | undefined)
    const csrfToken = cookies.get('csrf_token')?.value

    const refreshResponse = await agent
      .post('/api/v1/auth/refresh')
      .set('X-CSRF-Token', csrfToken ?? '')
      .set('X-Tenant-Id', SECONDARY_TENANT.id)
      .send({})
      .expect(201)

    const refreshedPayload = decodeToken(refreshResponse.body.accessToken)
    expect(refreshedPayload.tenantId).toBe(SECONDARY_TENANT.id)
    expect(refreshedPayload.tenantSlug).toBe(SECONDARY_TENANT.slug)
    expect(refreshedPayload.role).toBe(UserRole.THREAT_HUNTER)
  })

  it('logout clears cookies and revokes the active access token', async () => {
    const agent = request.agent(app.getHttpServer())

    const loginResponse = await agent
      .post('/api/v1/auth/login')
      .send({ email: 'analyst@auraspear.io', password: TEST_PASSWORD })
      .expect(201)

    const accessToken = loginResponse.body.accessToken as string
    const cookies = parseCookies(loginResponse.headers['set-cookie'] as string[] | undefined)
    const csrfToken = cookies.get('csrf_token')?.value

    const logoutResponse = await agent
      .post('/api/v1/auth/logout')
      .set('X-CSRF-Token', csrfToken ?? '')
      .send({})
      .expect(201)

    expect(logoutResponse.body.loggedOut).toBe(true)

    const clearedCookies = parseCookies(
      logoutResponse.headers['set-cookie'] as string[] | undefined
    )
    expect(clearedCookies.get('access_token')?.value).toBe('')
    expect(clearedCookies.get('refresh_token')?.value).toBe('')

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(401)
  })

  it('rejects expired access tokens on authenticated routes', async () => {
    const expiredAccessToken = jwt.sign(
      {
        sub: '00000000-0000-0000-0000-000000000010',
        email: 'analyst@auraspear.io',
        tenantId: PRIMARY_TENANT.id,
        tenantSlug: PRIMARY_TENANT.slug,
        role: UserRole.TENANT_ADMIN,
        tokenType: 'access',
      },
      TEST_JWT_SECRET,
      {
        algorithm: 'HS256',
        expiresIn: '-1h',
        jwtid: 'expired-access-token',
      }
    )

    const response = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${expiredAccessToken}`)
      .expect(401)

    expect(response.body.messageKey).toBe('errors.auth.invalidAccessToken')
  })
})
