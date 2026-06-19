import { Injectable } from '@nestjs/common'
import { RefreshTokenFamilyStatus, RefreshTokenRotationStatus } from '@prisma/client'
import { RefreshTokenFamilyRevocationReason } from './auth.enums'
import { UserSessionStatus } from '../../common/enums'
import { nowDate } from '../../common/utils/date-time.utility'
import { PrismaService } from '../../prisma/prisma.service'
import type {
  CreateRefreshTokenFamilyInput,
  CreateRefreshTokenRotationInput,
  CreateUserSessionInput,
  RefreshTokenFamilyWithSession,
  RotateRefreshTokenFamilyInput,
  TouchUserSessionInput,
} from './auth.types'
import type { MembershipStatus } from '../../common/interfaces/authenticated-request.interface'
import type {
  Prisma,
  RefreshTokenFamily,
  RefreshTokenRotation,
  TenantMembership,
  User,
  UserSession,
  UserRole as PrismaUserRole,
} from '@prisma/client'

@Injectable()
export class AuthRepository {
  private static readonly TENANT_SELECT = {
    select: { id: true, name: true, slug: true },
  } as const

  constructor(private readonly prisma: PrismaService) {}

  async findUserByEmailWithMemberships(
    email: string,
    membershipStatus: MembershipStatus
  ): Promise<
    | (User & {
        memberships: (TenantMembership & { tenant: { id: string; name: string; slug: string } })[]
      })
    | null
  > {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          where: { status: membershipStatus },
          include: { tenant: AuthRepository.TENANT_SELECT },
        },
      },
    })
  }

  async updateLastLogin(userId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: nowDate() },
    })
  }

  async findUserByIdWithTenantMemberships(
    userId: string,
    tenantId: string,
    membershipStatus: MembershipStatus
  ): Promise<
    | (User & {
        memberships: (TenantMembership & { tenant: { id: string; name: string; slug: string } })[]
      })
    | null
  > {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          where: { tenantId, status: membershipStatus },
          include: { tenant: AuthRepository.TENANT_SELECT },
        },
      },
    })
  }

  async findUserByIdWithActiveMembershipCheck(
    userId: string,
    membershipStatus: MembershipStatus
  ): Promise<(User & { memberships: { id: string }[] }) | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          where: { status: membershipStatus },
          select: { id: true },
          take: 1,
        },
      },
    })
  }

  async findMembershipByUserAndTenant(
    userId: string,
    tenantId: string
  ): Promise<TenantMembership | null> {
    return this.prisma.tenantMembership.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    })
  }

  async findActiveMembershipsWithTenant(
    userId: string,
    membershipStatus: MembershipStatus
  ): Promise<(TenantMembership & { tenant: { id: string; name: string; slug: string } })[]> {
    return this.prisma.tenantMembership.findMany({
      where: { userId, status: membershipStatus },
      include: { tenant: AuthRepository.TENANT_SELECT },
    })
  }

  async findTenantById(
    tenantId: string
  ): Promise<{ id: string; name: string; slug: string } | null> {
    return this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, slug: true },
    })
  }

  async findUserByIdWithAllActiveMemberships(
    userId: string,
    membershipStatus: MembershipStatus
  ): Promise<
    | (User & {
        memberships: (TenantMembership & { tenant: { id: string; name: string; slug: string } })[]
      })
    | null
  > {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          where: { status: membershipStatus },
          include: { tenant: AuthRepository.TENANT_SELECT },
        },
      },
    })
  }

  async upsertUserByOidcSub(oidcSub: string, email: string, name: string): Promise<User> {
    return this.prisma.user.upsert({
      where: { oidcSub },
      update: { email, name },
      create: { oidcSub, email, name },
    })
  }

  async upsertTenantMembership(
    userId: string,
    tenantId: string,
    defaultRole: PrismaUserRole
  ): Promise<TenantMembership> {
    return this.prisma.tenantMembership.upsert({
      where: { userId_tenantId: { userId, tenantId } },
      update: {},
      create: { userId, tenantId, role: defaultRole },
    })
  }

  async createRefreshTokenFamily(data: CreateRefreshTokenFamilyInput): Promise<RefreshTokenFamily> {
    return this.prisma.refreshTokenFamily.create({
      data: {
        id: data.id,
        userId: data.userId,
        tenantId: data.tenantId,
        currentGeneration: data.currentGeneration,
        expiresAt: data.expiresAt,
      },
    })
  }

  async createRefreshTokenRotation(
    data: CreateRefreshTokenRotationInput
  ): Promise<RefreshTokenRotation> {
    return this.prisma.refreshTokenRotation.create({
      data: {
        familyId: data.familyId,
        generation: data.generation,
        jtiHash: data.jtiHash,
        expiresAt: data.expiresAt,
        parentRotationId: data.parentRotationId,
      },
    })
  }

  async findRefreshTokenRotationByHash(
    jtiHash: string
  ): Promise<(RefreshTokenRotation & { family: RefreshTokenFamily }) | null> {
    return this.prisma.refreshTokenRotation.findUnique({
      where: { jtiHash },
      include: { family: true },
    })
  }

  async findRefreshTokenFamilyById(id: string): Promise<RefreshTokenFamily | null> {
    return this.prisma.refreshTokenFamily.findUnique({
      where: { id },
    })
  }

  async findRefreshTokenFamilyWithSessionById(
    id: string
  ): Promise<RefreshTokenFamilyWithSession | null> {
    return this.prisma.refreshTokenFamily.findUnique({
      where: { id },
      include: { session: true },
    }) as Promise<RefreshTokenFamilyWithSession | null>
  }

  async createUserSession(data: CreateUserSessionInput): Promise<UserSession> {
    return this.prisma.userSession.create({
      data: {
        familyId: data.familyId,
        userId: data.userId,
        tenantId: data.tenantId,
        osFamily: data.context.osFamily,
        clientType: data.context.clientType,
        ipAddress: data.context.ipAddress,
        userAgent: data.context.userAgent,
        currentAccessJti: data.currentAccessJti,
        currentAccessExpiresAt: data.currentAccessExpiresAt,
        lastSeenAt: data.lastLoginAt,
        lastLoginAt: data.lastLoginAt,
      },
    })
  }

  async findUserSessionByFamilyId(familyId: string): Promise<UserSession | null> {
    return this.prisma.userSession.findUnique({
      where: { familyId },
    })
  }

  async touchUserSession(data: TouchUserSessionInput): Promise<number> {
    const updateData: Prisma.UserSessionUpdateManyMutationInput = {
      lastSeenAt: data.touchedAt,
      osFamily: data.context.osFamily,
      clientType: data.context.clientType,
    }

    if (data.context.ipAddress !== null) {
      updateData.ipAddress = data.context.ipAddress
    }

    if (data.context.userAgent !== null) {
      updateData.userAgent = data.context.userAgent
    }

    if (data.currentAccessJti !== undefined) {
      updateData.currentAccessJti = data.currentAccessJti
    }

    if (data.currentAccessExpiresAt !== undefined) {
      updateData.currentAccessExpiresAt = data.currentAccessExpiresAt
    }

    const result = await this.prisma.userSession.updateMany({
      where: {
        familyId: data.familyId,
        status: UserSessionStatus.ACTIVE,
      },
      data: updateData,
    })

    return result.count
  }

  async rotateRefreshTokenFamily(data: RotateRefreshTokenFamilyInput): Promise<{
    familyAdvanceCount: number
    newRotation: RefreshTokenRotation | null
  }> {
    return this.prisma.$transaction(async tx => {
      const familyAdvance = await tx.refreshTokenFamily.updateMany({
        where: {
          id: data.familyId,
          status: RefreshTokenFamilyStatus.active,
          currentGeneration: data.expectedGeneration,
        },
        data: {
          currentGeneration: data.nextGeneration,
          expiresAt: data.nextExpiresAt,
          tenantId: data.tenantId,
        },
      })

      if (familyAdvance.count > 0) {
        await tx.refreshTokenRotation.update({
          where: { id: data.previousRotationId },
          data: {
            status: RefreshTokenRotationStatus.used,
            usedAt: data.rotatedAt,
            replacedAt: data.rotatedAt,
          },
        })

        const newRotation = await tx.refreshTokenRotation.create({
          data: {
            familyId: data.familyId,
            generation: data.nextGeneration,
            jtiHash: data.nextJtiHash,
            expiresAt: data.nextExpiresAt,
            parentRotationId: data.previousRotationId,
          },
        })

        await tx.userSession.updateMany({
          where: {
            familyId: data.familyId,
            status: UserSessionStatus.ACTIVE,
          },
          data: {
            lastSeenAt: data.rotatedAt,
            osFamily: data.context.osFamily,
            clientType: data.context.clientType,
            ipAddress: data.context.ipAddress,
            userAgent: data.context.userAgent,
            currentAccessJti: data.currentAccessJti,
            currentAccessExpiresAt: data.currentAccessExpiresAt,
          },
        })

        return {
          familyAdvanceCount: familyAdvance.count,
          newRotation,
        }
      }

      return {
        familyAdvanceCount: familyAdvance.count,
        newRotation: null,
      }
    })
  }

  async revokeRefreshTokenFamily(
    familyId: string,
    revokedReason: string,
    revokedAt: Date,
    replayedRotationId?: string,
    revokedByUserId?: string
  ): Promise<void> {
    await this.prisma.$transaction(async tx => {
      await tx.refreshTokenFamily.updateMany({
        where: {
          id: familyId,
          status: RefreshTokenFamilyStatus.active,
        },
        data: {
          status: RefreshTokenFamilyStatus.revoked,
          revokedAt,
          revokedReason,
        },
      })

      await tx.refreshTokenRotation.updateMany({
        where: {
          familyId,
          status: {
            in: [RefreshTokenRotationStatus.active, RefreshTokenRotationStatus.used],
          },
        },
        data: {
          status: RefreshTokenRotationStatus.revoked,
        },
      })

      if (replayedRotationId !== undefined) {
        await tx.refreshTokenRotation.update({
          where: { id: replayedRotationId },
          data: {
            status: RefreshTokenRotationStatus.replayed,
            replayedAt: revokedAt,
          },
        })
      }

      const sessionData: Prisma.UserSessionUpdateManyMutationInput = {
        status: UserSessionStatus.REVOKED,
        revokedAt,
        revokeReason: revokedReason,
      }

      if (revokedByUserId !== undefined) {
        sessionData.revokedByUserId = revokedByUserId
      }

      await tx.userSession.updateMany({
        where: {
          familyId,
          status: UserSessionStatus.ACTIVE,
        },
        data: sessionData,
      })
    })
  }

  async expireRefreshTokenFamily(familyId: string): Promise<void> {
    await this.prisma.$transaction(async tx => {
      await tx.refreshTokenFamily.updateMany({
        where: {
          id: familyId,
          status: RefreshTokenFamilyStatus.active,
        },
        data: {
          status: RefreshTokenFamilyStatus.expired,
          revokedReason: RefreshTokenFamilyRevocationReason.EXPIRED,
        },
      })

      await tx.userSession.updateMany({
        where: {
          familyId,
          status: UserSessionStatus.ACTIVE,
        },
        data: {
          status: UserSessionStatus.EXPIRED,
          revokeReason: RefreshTokenFamilyRevocationReason.EXPIRED,
        },
      })
    })
  }
}
