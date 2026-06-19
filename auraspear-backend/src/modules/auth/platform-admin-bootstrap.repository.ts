import { Injectable } from '@nestjs/common'
import { UserRole } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class PlatformAdminBootstrapRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPlatformAdminByEmail(email: string): Promise<{
    id: string
    passwordHash: string | null
  } | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        passwordHash: true,
      },
    })
  }

  async upsertPlatformAdmin(data: {
    email: string
    name: string
    passwordHash: string
  }): Promise<{ id: string }> {
    return this.prisma.user.upsert({
      where: { email: data.email },
      update: {
        name: data.name,
        passwordHash: data.passwordHash,
        isProtected: true,
      },
      create: {
        email: data.email,
        name: data.name,
        passwordHash: data.passwordHash,
        isProtected: true,
      },
      select: { id: true },
    })
  }

  async upsertUserPreference(userId: string): Promise<void> {
    await this.prisma.userPreference.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        theme: 'system',
        language: 'en',
        notificationsEmail: true,
        notificationsInApp: true,
      },
    })
  }

  async findAllTenantIds(): Promise<string[]> {
    const tenants = await this.prisma.tenant.findMany({
      select: { id: true },
    })

    return tenants.map(tenant => tenant.id)
  }

  async upsertGlobalAdminMembership(userId: string, tenantId: string): Promise<void> {
    await this.prisma.tenantMembership.upsert({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
      update: {
        role: UserRole.GLOBAL_ADMIN,
        status: 'active',
      },
      create: {
        userId,
        tenantId,
        role: UserRole.GLOBAL_ADMIN,
      },
    })
  }
}
