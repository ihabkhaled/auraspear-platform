import { Injectable } from '@nestjs/common'
import { MembershipStatus } from '../../common/interfaces/authenticated-request.interface'
import { PrismaService } from '../../prisma/prisma.service'
import type { RolePermission, UserRole } from '@prisma/client'

@Injectable()
export class RoleSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPermissionsByTenant(tenantId: string): Promise<RolePermission[]> {
    return this.prisma.rolePermission.findMany({
      where: { tenantId, allowed: true },
      orderBy: [{ role: 'asc' }, { permissionKey: 'asc' }],
    })
  }

  async findPermissionsByTenantAndRole(
    tenantId: string,
    role: UserRole
  ): Promise<RolePermission[]> {
    return this.prisma.rolePermission.findMany({
      where: { tenantId, role, allowed: true },
    })
  }

  async hasPermissionByTenantAndRole(
    tenantId: string,
    role: UserRole,
    permissionKey: string
  ): Promise<boolean> {
    const count = await this.prisma.rolePermission.count({
      where: { tenantId, role, permissionKey },
    })

    return count > 0
  }

  async upsertPermission(
    tenantId: string,
    role: UserRole,
    permissionKey: string,
    allowed: boolean
  ): Promise<RolePermission> {
    return this.prisma.rolePermission.upsert({
      where: {
        tenantId_role_permissionKey: { tenantId, role, permissionKey },
      },
      update: { allowed },
      create: { tenantId, role, permissionKey, allowed },
    })
  }

  async deleteAllByTenant(tenantId: string): Promise<{ count: number }> {
    return this.prisma.rolePermission.deleteMany({
      where: { tenantId },
    })
  }

  async bulkUpsertPermissions(
    tenantId: string,
    entries: Array<{ role: UserRole; permissionKey: string; allowed: boolean }>
  ): Promise<void> {
    await this.prisma.$transaction(
      entries.map(entry =>
        this.prisma.rolePermission.upsert({
          where: {
            tenantId_role_permissionKey: {
              tenantId,
              role: entry.role,
              permissionKey: entry.permissionKey,
            },
          },
          update: { allowed: entry.allowed },
          create: {
            tenantId,
            role: entry.role,
            permissionKey: entry.permissionKey,
            allowed: entry.allowed,
          },
        })
      )
    )
  }

  async bulkCreatePermissions(
    tenantId: string,
    entries: Array<{ role: UserRole; permissionKey: string; allowed: boolean }>
  ): Promise<void> {
    if (entries.length === 0) {
      return
    }

    await this.prisma.rolePermission.createMany({
      data: entries.map(entry => ({
        tenantId,
        role: entry.role,
        permissionKey: entry.permissionKey,
        allowed: entry.allowed,
      })),
      skipDuplicates: true,
    })
  }

  async countByTenant(tenantId: string): Promise<number> {
    return this.prisma.rolePermission.count({
      where: { tenantId },
    })
  }

  async findAllTenantIds(): Promise<string[]> {
    const tenants = await this.prisma.tenant.findMany({
      select: { id: true },
    })
    return tenants.map(t => t.id)
  }

  async findActiveUserIdsByRoles(tenantId: string, roles: UserRole[]): Promise<string[]> {
    if (roles.length === 0) {
      return []
    }

    const memberships = await this.prisma.tenantMembership.findMany({
      where: {
        tenantId,
        role: { in: roles },
        status: MembershipStatus.ACTIVE,
      },
      select: { userId: true },
      distinct: ['userId'],
    })

    return memberships.map(membership => membership.userId)
  }

  /**
   * Returns permission definitions for a tenant.
   * Includes global definitions (tenantId = null) merged with
   * any tenant-specific overrides or additions.
   */
  async findPermissionDefinitions(
    tenantId: string
  ): Promise<Array<{ key: string; module: string; labelKey: string; sortOrder: number }>> {
    const rows = await this.prisma.permissionDefinition.findMany({
      where: {
        OR: [{ tenantId: null }, { tenantId }],
      },
      orderBy: [{ sortOrder: 'asc' }],
    })

    // Tenant-specific definitions override global ones with the same key
    const definitionMap = new Map<string, (typeof rows)[number]>()
    for (const row of rows) {
      const existing = definitionMap.get(row.key)
      if (!existing || row.tenantId !== null) {
        definitionMap.set(row.key, row)
      }
    }

    return [...definitionMap.values()].sort((a, b) => a.sortOrder - b.sortOrder)
  }

  async upsertPermissionDefinition(
    tenantId: string | null,
    key: string,
    module: string,
    labelKey: string,
    sortOrder: number
  ): Promise<void> {
    const existing = await this.prisma.permissionDefinition.findFirst({
      where: { tenantId, key },
    })

    await (existing
      ? this.prisma.permissionDefinition.update({
          where: { id: existing.id },
          data: { module, labelKey, sortOrder },
        })
      : this.prisma.permissionDefinition.create({
          data: { tenantId, key, module, labelKey, sortOrder },
        }))
  }

  async hasPermissionDefinition(tenantId: string | null, key: string): Promise<boolean> {
    const count = await this.prisma.permissionDefinition.count({
      where: { tenantId, key },
    })

    return count > 0
  }
}
