import { Injectable } from '@nestjs/common'
import { USERS_CONTROL_TENANT_SELECT } from './users-control.constants'
import { UserSessionStatus } from '../../common/enums'
import { UserRole } from '../../common/interfaces/authenticated-request.interface'
import { PrismaService } from '../../prisma/prisma.service'
import type {
  UsersControlSessionListParameters,
  UsersControlSessionRecord,
  UsersControlUserListParameters,
  UsersControlUserRecord,
} from './users-control.types'
import type { SessionRevocationTarget } from '../auth/auth.types'
import type { Prisma } from '@prisma/client'

@Injectable()
export class UsersControlRepository {
  constructor(private readonly prisma: PrismaService) {}

  async countScopedUsers(where: Prisma.UserWhereInput): Promise<number> {
    return this.prisma.user.count({ where })
  }

  async countScopedActiveSessions(tenantId?: string): Promise<number> {
    return this.prisma.userSession.count({
      where: {
        status: UserSessionStatus.ACTIVE,
        ...(tenantId ? { tenantId } : {}),
      },
    })
  }

  async countScopedOnlineUsers(onlineThreshold: Date, tenantId?: string): Promise<number> {
    const users = await this.prisma.userSession.findMany({
      where: {
        status: UserSessionStatus.ACTIVE,
        lastSeenAt: { gte: onlineThreshold },
        ...(tenantId ? { tenantId } : {}),
      },
      distinct: ['userId'],
      select: { userId: true },
    })

    return users.length
  }

  async findAllScopedUsers(
    parameters: UsersControlUserListParameters,
    where: Prisma.UserWhereInput
  ): Promise<UsersControlUserRecord[]> {
    return this.prisma.user.findMany({
      where,
      include: {
        memberships: {
          ...(parameters.tenantId ? { where: { tenantId: parameters.tenantId } } : {}),
          include: { tenant: USERS_CONTROL_TENANT_SELECT },
        },
        sessions: {
          ...(parameters.tenantId ? { where: { tenantId: parameters.tenantId } } : {}),
          include: { tenant: USERS_CONTROL_TENANT_SELECT },
        },
      },
    }) as Promise<UsersControlUserRecord[]>
  }

  async findScopedUser(userId: string, tenantId?: string): Promise<UsersControlUserRecord | null> {
    return this.prisma.user.findFirst({
      where: {
        id: userId,
        memberships: {
          some: tenantId ? { tenantId } : {},
        },
      },
      include: {
        memberships: {
          ...(tenantId ? { where: { tenantId } } : {}),
          include: { tenant: USERS_CONTROL_TENANT_SELECT },
        },
        sessions: {
          ...(tenantId ? { where: { tenantId } } : {}),
          include: { tenant: USERS_CONTROL_TENANT_SELECT },
        },
      },
    }) as Promise<UsersControlUserRecord | null>
  }

  async findUserSessions(
    parameters: UsersControlSessionListParameters,
    orderBy: Prisma.UserSessionOrderByWithRelationInput
  ): Promise<[UsersControlSessionRecord[], number]> {
    const where: Prisma.UserSessionWhereInput = {
      userId: parameters.userId,
      ...(parameters.tenantId ? { tenantId: parameters.tenantId } : {}),
      ...(parameters.status ? { status: parameters.status } : {}),
    }

    return this.prisma.$transaction(async tx => {
      const sessions = (await tx.userSession.findMany({
        where,
        orderBy,
        skip: (parameters.page - 1) * parameters.limit,
        take: parameters.limit,
        include: { tenant: USERS_CONTROL_TENANT_SELECT },
      })) as UsersControlSessionRecord[]
      const total = await tx.userSession.count({ where })

      return [sessions, total]
    })
  }

  async findSessionRevocationTargetsByUser(
    userId: string,
    tenantId?: string
  ): Promise<SessionRevocationTarget[]> {
    return this.prisma.userSession.findMany({
      where: {
        userId,
        status: UserSessionStatus.ACTIVE,
        ...(tenantId ? { tenantId } : {}),
      },
      select: {
        familyId: true,
        currentAccessJti: true,
        currentAccessExpiresAt: true,
      },
    })
  }

  async findSessionRevocationTargetsBySession(
    userId: string,
    sessionId: string,
    tenantId?: string
  ): Promise<SessionRevocationTarget[]> {
    return this.prisma.userSession.findMany({
      where: {
        id: sessionId,
        userId,
        status: UserSessionStatus.ACTIVE,
        ...(tenantId ? { tenantId } : {}),
      },
      select: {
        familyId: true,
        currentAccessJti: true,
        currentAccessExpiresAt: true,
      },
    })
  }

  async findSessionRevocationTargetsByScope(
    tenantId?: string,
    exclusions?: {
      actorUserId: string
      excludeGlobalAdmins: boolean
    }
  ): Promise<SessionRevocationTarget[]> {
    const where: Prisma.UserSessionWhereInput = {
      status: UserSessionStatus.ACTIVE,
      ...(tenantId ? { tenantId } : {}),
    }

    if (exclusions) {
      where.userId = { not: exclusions.actorUserId }
      const userFilter: Prisma.UserWhereInput = {
        isProtected: false,
      }

      if (exclusions.excludeGlobalAdmins) {
        userFilter.memberships = {
          none: {
            role: UserRole.GLOBAL_ADMIN,
          },
        }
      }

      where.user = userFilter
    }

    return this.prisma.userSession.findMany({
      where,
      select: {
        familyId: true,
        currentAccessJti: true,
        currentAccessExpiresAt: true,
      },
    })
  }
}
