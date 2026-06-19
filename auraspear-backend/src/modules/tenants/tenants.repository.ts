import { Injectable } from '@nestjs/common'
import { USER_MEMBER_SELECT } from './tenants.constants'
import { PrismaService } from '../../prisma/prisma.service'
import type {
  FindOrCreateUserResult,
  FindOrCreateUserFields,
  FindOrCreateMembershipFields,
} from './tenants.types'
import type { MembershipStatus } from '../../common/interfaces/authenticated-request.interface'
import type { Prisma, UserRole, UserStatus, TenantMembership, User } from '@prisma/client'

@Injectable()
export class TenantsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllTenantsWithCounts(params: {
    where: Prisma.TenantWhereInput
    orderBy: Prisma.TenantOrderByWithRelationInput
    skip: number
    take: number
  }): Promise<
    [
      Array<{
        id: string
        name: string
        slug: string
        createdAt: Date
        _count: { memberships: number; alerts: number; cases: number }
      }>,
      number,
    ]
  > {
    return this.prisma.$transaction([
      this.prisma.tenant.findMany({
        ...params,
        include: {
          _count: {
            select: {
              memberships: true,
              alerts: true,
              cases: true,
            },
          },
        },
      }),
      this.prisma.tenant.count({ where: params.where }),
    ])
  }

  async findByIdWithCounts(id: string): Promise<{
    id: string
    name: string
    slug: string
    createdAt: Date
    _count: { memberships: number; alerts: number; cases: number }
  } | null> {
    return this.prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: { memberships: true, alerts: true, cases: true },
        },
      },
    })
  }

  async create(data: { name: string; slug: string }): Promise<{
    id: string
    name: string
    slug: string
    createdAt: Date
  }> {
    return this.prisma.tenant.create({ data })
  }

  async update(
    id: string,
    data: Prisma.TenantUpdateInput
  ): Promise<{
    id: string
    name: string
    slug: string
    createdAt: Date
  }> {
    return this.prisma.tenant.update({ where: { id }, data })
  }

  async deactivateAllMemberships(tenantId: string, status: MembershipStatus): Promise<void> {
    await this.prisma.$transaction(async tx => {
      await tx.tenantMembership.updateMany({
        where: { tenantId },
        data: { status: status as UserStatus },
      })
    })
  }

  async findMembershipsWithUsers(params: {
    where: Prisma.TenantMembershipWhereInput
    orderBy: Prisma.TenantMembershipOrderByWithRelationInput
    skip: number
    take: number
  }): Promise<[Array<TenantMembership & { user: User }>, number]> {
    return Promise.all([
      this.prisma.tenantMembership.findMany({
        ...params,
        include: { user: USER_MEMBER_SELECT },
      }) as unknown as Promise<Array<TenantMembership & { user: User }>>,
      this.prisma.tenantMembership.count({ where: params.where }),
    ])
  }

  async findActiveMembersWithUsers(
    tenantId: string,
    status: MembershipStatus
  ): Promise<
    Array<{
      user: { id: string; name: string; email: string }
    }>
  > {
    return this.prisma.tenantMembership.findMany({
      where: { tenantId, status },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { user: { name: 'asc' } },
    })
  }

  async findUserByEmail(
    email: string
  ): Promise<{ id: string; name: string; email: string } | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    })
  }

  async findMembershipByUserAndTenant(
    userId: string,
    tenantId: string
  ): Promise<{ role: string; status: string } | null> {
    return this.prisma.tenantMembership.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    })
  }

  /**
   * Atomically finds or creates a user by email, then creates a tenant membership.
   * Pure data access — caller is responsible for all validation before calling.
   */
  async findOrCreateUserWithMembership(
    tenantId: string,
    email: string,
    role: string,
    userData?: { name: string; passwordHash: string }
  ): Promise<FindOrCreateUserResult> {
    return this.prisma.$transaction(async tx => {
      const existing = await tx.user.findUnique({ where: { email } })

      const isExisting = Boolean(existing)

      const user: FindOrCreateUserFields =
        existing ??
        (await tx.user.create({
          data: {
            email,
            name: userData?.name ?? '',
            passwordHash: userData?.passwordHash ?? null,
          },
        }))

      const membership = await tx.tenantMembership.create({
        data: { userId: user.id, tenantId, role: role as UserRole },
      })

      return { user, membership, isExisting }
    })
  }

  /**
   * Checks whether a user exists and whether they already belong to the tenant.
   * Returns both pieces of information in a single consistent read.
   */
  async findUserWithTenantMembership(
    email: string,
    tenantId: string
  ): Promise<{
    user: FindOrCreateUserFields | null
    membership: FindOrCreateMembershipFields | null
  }> {
    return this.prisma.$transaction(async tx => {
      const user = await tx.user.findUnique({ where: { email } })

      if (!user) {
        return { user: null, membership: null }
      }

      const membership = await tx.tenantMembership.findUnique({
        where: { userId_tenantId: { userId: user.id, tenantId } },
      })

      return { user, membership }
    })
  }

  async findMembershipWithUser(
    userId: string,
    tenantId: string
  ): Promise<(TenantMembership & { user: User }) | null> {
    return this.prisma.tenantMembership.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
      include: { user: USER_MEMBER_SELECT },
    }) as Promise<(TenantMembership & { user: User }) | null>
  }

  async updateMembershipRole(
    userId: string,
    tenantId: string,
    role: string
  ): Promise<TenantMembership> {
    return this.prisma.tenantMembership.update({
      where: { userId_tenantId: { userId, tenantId } },
      data: { role: role as UserRole },
    })
  }

  async updateUser(userId: string, data: Record<string, unknown>): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    })
  }

  async updateMembershipStatus(
    userId: string,
    tenantId: string,
    status: MembershipStatus | UserStatus
  ): Promise<TenantMembership> {
    return this.prisma.tenantMembership.update({
      where: { userId_tenantId: { userId, tenantId } },
      data: { status: status as UserStatus },
    })
  }

  async updateMembershipStatusWithUser(
    userId: string,
    tenantId: string,
    status: MembershipStatus | UserStatus
  ): Promise<TenantMembership & { user: User }> {
    return this.prisma.tenantMembership.update({
      where: { userId_tenantId: { userId, tenantId } },
      data: { status: status as UserStatus },
      include: { user: USER_MEMBER_SELECT },
    }) as unknown as Promise<TenantMembership & { user: User }>
  }

  async findTenantById(
    tenantId: string
  ): Promise<{ id: string; slug: string; name: string } | null> {
    return this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, slug: true, name: true },
    })
  }

  async findUserById(userId: string): Promise<{
    id: string
    email: string
    name: string
    isProtected: boolean
  } | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, isProtected: true },
    })
  }
}
