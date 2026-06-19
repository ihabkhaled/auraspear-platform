import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { IntelIOC, IntelMispEvent, Prisma } from '@prisma/client'

@Injectable()
export class IntelRepository {
  constructor(private readonly prisma: PrismaService) {}

  /* IOC methods */

  async groupActiveIOCsByType(
    tenantId: string
  ): Promise<Array<{ iocType: string; _count: { id: number } }>> {
    const results = await this.prisma.intelIOC.groupBy({
      by: ['iocType'],
      where: { tenantId, active: true },
      _count: { id: true },
    })
    return results
  }

  async findManyIOCs(params: {
    where: Prisma.IntelIOCWhereInput
    orderBy: Prisma.IntelIOCOrderByWithRelationInput
    skip: number
    take: number
  }): Promise<IntelIOC[]> {
    return this.prisma.intelIOC.findMany(params)
  }

  async countIOCs(where: Prisma.IntelIOCWhereInput): Promise<number> {
    return this.prisma.intelIOC.count({ where })
  }

  async findActiveIOCsByValues(tenantId: string, values: string[]): Promise<IntelIOC[]> {
    return this.prisma.intelIOC.findMany({
      where: {
        tenantId,
        active: true,
        iocValue: { in: values },
      },
    })
  }

  async upsertIOC(args: Prisma.IntelIOCUpsertArgs): Promise<IntelIOC> {
    return this.prisma.intelIOC.upsert(args)
  }

  /* MISP Event methods */

  async findDistinctOrganizations(tenantId: string): Promise<Array<{ organization: string }>> {
    return this.prisma.intelMispEvent.findMany({
      where: { tenantId },
      select: { organization: true },
      distinct: ['organization'],
      take: 500,
    })
  }

  async findManyMispEvents(params: {
    where: Prisma.IntelMispEventWhereInput
    orderBy: Prisma.IntelMispEventOrderByWithRelationInput
    skip: number
    take: number
  }): Promise<IntelMispEvent[]> {
    return this.prisma.intelMispEvent.findMany(params)
  }

  async countMispEvents(where: Prisma.IntelMispEventWhereInput): Promise<number> {
    return this.prisma.intelMispEvent.count({ where })
  }

  async upsertMispEvent(args: Prisma.IntelMispEventUpsertArgs): Promise<IntelMispEvent> {
    return this.prisma.intelMispEvent.upsert(args)
  }

  /* Alert methods (for IOC matching) */

  async findAlertsByIds(
    tenantId: string,
    ids: string[]
  ): Promise<Array<{ id: string; sourceIp: string | null; destinationIp: string | null }>> {
    return this.prisma.alert.findMany({
      where: { tenantId, id: { in: ids } },
      select: { id: true, sourceIp: true, destinationIp: true },
    })
  }
}
