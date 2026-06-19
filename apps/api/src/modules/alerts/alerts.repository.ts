import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { AlertRecord } from './alerts.types'
import type { Prisma } from '@prisma/client'

@Injectable()
export class AlertsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findManyAndCount(params: {
    where: Prisma.AlertWhereInput
    orderBy: Prisma.AlertOrderByWithRelationInput
    skip: number
    take: number
  }): Promise<[AlertRecord[], number]> {
    return Promise.all([
      this.prisma.alert.findMany(params),
      this.prisma.alert.count({ where: params.where }),
    ])
  }

  async findFirstByIdAndTenant(id: string, tenantId: string): Promise<AlertRecord | null> {
    return this.prisma.alert.findFirst({
      where: { id, tenantId },
    })
  }

  async updateByIdAndTenant(
    id: string,
    tenantId: string,
    data: Prisma.AlertUpdateInput
  ): Promise<AlertRecord | null> {
    // Use updateMany to enforce tenantId in WHERE clause (Prisma .update() only
    // accepts unique fields, so tenantId would be silently ignored).
    await this.prisma.alert.updateMany({
      where: { id, tenantId },
      data: data as Prisma.AlertUncheckedUpdateManyInput,
    })

    return this.prisma.alert.findFirst({
      where: { id, tenantId },
    })
  }

  async upsertByTenantAndExternalId(
    tenantId: string,
    externalId: string,
    createData: Prisma.AlertCreateInput,
    updateData: Prisma.AlertUpdateInput
  ): Promise<AlertRecord> {
    return this.prisma.alert.upsert({
      where: { tenantId_externalId: { tenantId, externalId } },
      create: createData,
      update: updateData,
    })
  }

  async groupBySeverity(tenantId: string): Promise<Array<{ severity: string; _count: number }>> {
    const results = await this.prisma.alert.groupBy({
      by: ['severity'],
      where: { tenantId },
      _count: true,
    })
    return results.map(r => ({ severity: r.severity, _count: r._count }))
  }

  async queryTrend(tenantId: string, since: Date): Promise<Array<{ date: string; count: bigint }>> {
    return this.prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT DATE(timestamp) as date, COUNT(*)::bigint as count
      FROM alerts
      WHERE tenant_id = ${tenantId}::uuid AND timestamp >= ${since}
      GROUP BY DATE(timestamp)
      ORDER BY date ASC
    `
  }

  async queryMitreTechniqueCounts(
    tenantId: string
  ): Promise<Array<{ technique: string; count: bigint }>> {
    return this.prisma.$queryRaw<Array<{ technique: string; count: bigint }>>`
      SELECT unnest(mitre_techniques) as technique, COUNT(*)::bigint as count
      FROM alerts
      WHERE tenant_id = ${tenantId}::uuid
      GROUP BY technique
      ORDER BY count DESC
      LIMIT 15
    `
  }

  async queryTopTargetedAssets(
    tenantId: string,
    limit: number
  ): Promise<Array<{ asset: string; count: bigint }>> {
    return this.prisma.$queryRaw<Array<{ asset: string; count: bigint }>>`
      SELECT agent_name as asset, COUNT(*)::bigint as count
      FROM alerts
      WHERE tenant_id = ${tenantId}::uuid AND agent_name IS NOT NULL
      GROUP BY agent_name
      ORDER BY count DESC
      LIMIT ${limit}
    `
  }

  async countByTenantAndIds(tenantId: string, ids: string[]): Promise<number> {
    return this.prisma.alert.count({
      where: { id: { in: ids }, tenantId },
    })
  }

  async create(data: Prisma.AlertUncheckedCreateInput): Promise<AlertRecord> {
    return this.prisma.alert.create({ data })
  }

  async countByTenantAndId(tenantId: string, id: string): Promise<number> {
    return this.prisma.alert.count({
      where: { id, tenantId },
    })
  }
}
