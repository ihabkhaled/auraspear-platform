import { Injectable } from '@nestjs/common'
import { getYear } from '../../common/utils/date-time.utility'
import { buildNextSequenceNumber } from '../../common/utils/sequence-number.utility'
import { PrismaService } from '../../prisma/prisma.service'
import type { AttackPath, Prisma } from '@prisma/client'

@Injectable()
export class AttackPathsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /* ---------------------------------------------------------------- */
  /* ATTACK PATH QUERIES                                                */
  /* ---------------------------------------------------------------- */

  async findMany(params: {
    where: Prisma.AttackPathWhereInput
    orderBy: Prisma.AttackPathOrderByWithRelationInput
    skip: number
    take: number
  }): Promise<AttackPath[]> {
    return this.prisma.attackPath.findMany(params)
  }

  async findManyWithTenant(params: {
    where: Prisma.AttackPathWhereInput
    orderBy: Prisma.AttackPathOrderByWithRelationInput
    skip: number
    take: number
  }): Promise<(AttackPath & { tenant: { name: string } })[]> {
    return this.prisma.attackPath.findMany({
      ...params,
      include: { tenant: { select: { name: true } } },
    })
  }

  async count(where: Prisma.AttackPathWhereInput): Promise<number> {
    return this.prisma.attackPath.count({ where })
  }

  async findFirst(where: Prisma.AttackPathWhereInput): Promise<AttackPath | null> {
    return this.prisma.attackPath.findFirst({ where })
  }

  async findFirstWithTenant(
    where: Prisma.AttackPathWhereInput
  ): Promise<(AttackPath & { tenant: { name: string } }) | null> {
    return this.prisma.attackPath.findFirst({
      where,
      include: { tenant: { select: { name: true } } },
    })
  }

  async updateMany(params: {
    where: Prisma.AttackPathWhereInput
    data: Record<string, unknown>
  }): Promise<Prisma.BatchPayload> {
    return this.prisma.attackPath.updateMany(params)
  }

  async deleteMany(where: Prisma.AttackPathWhereInput): Promise<Prisma.BatchPayload> {
    return this.prisma.attackPath.deleteMany({ where })
  }

  /* ---------------------------------------------------------------- */
  /* AGGREGATION QUERIES                                                */
  /* ---------------------------------------------------------------- */

  async aggregateSum(
    where: Prisma.AttackPathWhereInput,
    sumFields: Prisma.AttackPathAggregateArgs['_sum']
  ): Promise<
    Prisma.GetAttackPathAggregateType<{
      where: Prisma.AttackPathWhereInput
      _sum: Prisma.AttackPathAggregateArgs['_sum']
    }>
  > {
    return this.prisma.attackPath.aggregate({
      where,
      _sum: sumFields,
    })
  }

  async aggregateAvg(
    where: Prisma.AttackPathWhereInput,
    avgFields: Prisma.AttackPathAggregateArgs['_avg']
  ): Promise<
    Prisma.GetAttackPathAggregateType<{
      where: Prisma.AttackPathWhereInput
      _avg: Prisma.AttackPathAggregateArgs['_avg']
    }>
  > {
    return this.prisma.attackPath.aggregate({
      where,
      _avg: avgFields,
    })
  }

  /* ---------------------------------------------------------------- */
  /* TRANSACTION: CREATE WITH NUMBER GENERATION                         */
  /* ---------------------------------------------------------------- */

  async createWithNumber(params: {
    tenantId: string
    data: Omit<Prisma.AttackPathUncheckedCreateInput, 'pathNumber' | 'tenantId'>
  }): Promise<AttackPath & { tenant: { name: string } }> {
    return this.prisma.$transaction(async tx => {
      const pathNumber = await this.generatePathNumber(tx, params.tenantId)

      return tx.attackPath.create({
        data: {
          ...params.data,
          tenantId: params.tenantId,
          pathNumber,
        },
        include: { tenant: { select: { name: true } } },
      })
    })
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: NUMBER GENERATION                                         */
  /* ---------------------------------------------------------------- */

  private async generatePathNumber(
    tx: Prisma.TransactionClient,
    _tenantId: string
  ): Promise<string> {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('attack_path_number_gen'))::text`

    const year = getYear()
    const prefix = `AP-${year}-`

    const lastPath = await tx.attackPath.findFirst({
      where: {
        pathNumber: { startsWith: prefix },
      },
      orderBy: { pathNumber: 'desc' },
      select: { pathNumber: true },
    })

    return buildNextSequenceNumber(lastPath?.pathNumber, prefix, 4)
  }
}
