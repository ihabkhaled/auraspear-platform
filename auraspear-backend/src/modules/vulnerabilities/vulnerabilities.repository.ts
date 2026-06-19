import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type {
  Prisma,
  PatchStatus as PrismaPatchStatus,
  VulnerabilitySeverity as PrismaVulnerabilitySeverity,
} from '@prisma/client'

@Injectable()
export class VulnerabilitiesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /* ------------------------------------------------------------------ */
  /* QUERIES                                                             */
  /* ------------------------------------------------------------------ */

  async findManyWithTenant(
    where: Prisma.VulnerabilityWhereInput,
    orderBy: Prisma.VulnerabilityOrderByWithRelationInput,
    skip: number,
    take: number
  ): Promise<
    Array<
      Prisma.VulnerabilityGetPayload<{
        include: { tenant: { select: { name: true } } }
      }>
    >
  > {
    return this.prisma.vulnerability.findMany({
      where,
      include: { tenant: { select: { name: true } } },
      orderBy,
      skip,
      take,
    })
  }

  async count(where: Prisma.VulnerabilityWhereInput): Promise<number> {
    return this.prisma.vulnerability.count({ where })
  }

  async findByIdAndTenant(
    id: string,
    tenantId: string
  ): Promise<Prisma.VulnerabilityGetPayload<{
    include: { tenant: { select: { name: true } } }
  }> | null> {
    return this.prisma.vulnerability.findFirst({
      where: { id, tenantId },
      include: { tenant: { select: { name: true } } },
    })
  }

  async findByCveIdAndTenant(
    tenantId: string,
    cveId: string
  ): Promise<{ id: string; cveId: string } | null> {
    return this.prisma.vulnerability.findFirst({
      where: { tenantId, cveId },
      select: { id: true, cveId: true },
    })
  }

  async findByCveIdAndTenantExcludingId(
    tenantId: string,
    cveId: string,
    excludeId: string
  ): Promise<{ id: string } | null> {
    return this.prisma.vulnerability.findFirst({
      where: { tenantId, cveId, id: { not: excludeId } },
      select: { id: true },
    })
  }

  async findExistingByIdAndTenant(
    id: string,
    tenantId: string
  ): Promise<{
    id: string
    cveId: string
    patchStatus: PrismaPatchStatus
    severity: PrismaVulnerabilitySeverity
  } | null> {
    return this.prisma.vulnerability.findFirst({
      where: { id, tenantId },
      select: { id: true, cveId: true, patchStatus: true, severity: true },
    })
  }

  /* ------------------------------------------------------------------ */
  /* MUTATIONS                                                           */
  /* ------------------------------------------------------------------ */

  async createWithTenant(data: Prisma.VulnerabilityUncheckedCreateInput): Promise<
    Prisma.VulnerabilityGetPayload<{
      include: { tenant: { select: { name: true } } }
    }>
  > {
    return this.prisma.vulnerability.create({
      data,
      include: { tenant: { select: { name: true } } },
    })
  }

  async updateByIdAndTenant(
    id: string,
    tenantId: string,
    data: Prisma.VulnerabilityUpdateInput
  ): Promise<Prisma.VulnerabilityGetPayload<{
    include: { tenant: { select: { name: true } } }
  }> | null> {
    // Prisma update requires a unique where, so we use updateMany for tenant scoping
    // then fetch the updated record. This ensures tenantId is always in the where clause.
    await this.prisma.vulnerability.updateMany({
      where: { id, tenantId },
      data: data as Prisma.VulnerabilityUncheckedUpdateManyInput,
    })

    return this.prisma.vulnerability.findFirst({
      where: { id, tenantId },
      include: { tenant: { select: { name: true } } },
    })
  }

  async deleteByIdAndTenant(id: string, tenantId: string): Promise<void> {
    await this.prisma.vulnerability.deleteMany({
      where: { id, tenantId },
    })
  }
}
