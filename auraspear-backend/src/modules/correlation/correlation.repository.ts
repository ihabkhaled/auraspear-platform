import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { Prisma, CorrelationRule } from '@prisma/client'

@Injectable()
export class CorrelationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /* ---------------------------------------------------------------- */
  /* CORRELATION RULE QUERIES                                           */
  /* ---------------------------------------------------------------- */

  async findMany(params: {
    where: Prisma.CorrelationRuleWhereInput
    orderBy: Prisma.CorrelationRuleOrderByWithRelationInput
    skip: number
    take: number
  }): Promise<CorrelationRule[]> {
    return this.prisma.correlationRule.findMany(params)
  }

  async findManyWithTenant(params: {
    where: Prisma.CorrelationRuleWhereInput
    orderBy: Prisma.CorrelationRuleOrderByWithRelationInput
    skip: number
    take: number
  }): Promise<Array<CorrelationRule & { tenant: { name: string } }>> {
    return this.prisma.correlationRule.findMany({
      ...params,
      include: { tenant: { select: { name: true } } },
    })
  }

  async count(where: Prisma.CorrelationRuleWhereInput): Promise<number> {
    return this.prisma.correlationRule.count({ where })
  }

  async findFirstWithTenant(
    where: Prisma.CorrelationRuleWhereInput
  ): Promise<(CorrelationRule & { tenant: { name: string } }) | null> {
    return this.prisma.correlationRule.findFirst({
      where,
      include: { tenant: { select: { name: true } } },
    })
  }

  async findFirstSelect(
    where: Prisma.CorrelationRuleWhereInput,
    select: Prisma.CorrelationRuleSelect
  ): Promise<Partial<CorrelationRule> | null> {
    return this.prisma.correlationRule.findFirst({ where, select })
  }

  async create(data: Prisma.CorrelationRuleUncheckedCreateInput): Promise<CorrelationRule> {
    return this.prisma.correlationRule.create({ data })
  }

  async createWithTenant(
    data: Prisma.CorrelationRuleUncheckedCreateInput
  ): Promise<CorrelationRule & { tenant: { name: string } }> {
    return this.prisma.correlationRule.create({
      data,
      include: { tenant: { select: { name: true } } },
    })
  }

  async update(params: {
    where: { id: string; tenantId: string }
    data: Prisma.CorrelationRuleUpdateInput
  }): Promise<CorrelationRule | null> {
    // Use updateMany to enforce tenantId in WHERE clause (Prisma .update() only
    // accepts unique fields, so tenantId would be silently ignored).
    await this.prisma.correlationRule.updateMany({
      where: { id: params.where.id, tenantId: params.where.tenantId },
      data: params.data as Prisma.CorrelationRuleUncheckedUpdateManyInput,
    })

    return this.prisma.correlationRule.findFirst({
      where: { id: params.where.id, tenantId: params.where.tenantId },
    })
  }

  async updateWithTenant(params: {
    where: { id: string; tenantId: string }
    data: Prisma.CorrelationRuleUpdateInput
  }): Promise<(CorrelationRule & { tenant: { name: string } }) | null> {
    // Use updateMany to enforce tenantId in WHERE clause (Prisma .update() only
    // accepts unique fields, so tenantId would be silently ignored).
    await this.prisma.correlationRule.updateMany({
      where: { id: params.where.id, tenantId: params.where.tenantId },
      data: params.data as Prisma.CorrelationRuleUncheckedUpdateManyInput,
    })

    return this.prisma.correlationRule.findFirst({
      where: { id: params.where.id, tenantId: params.where.tenantId },
      include: { tenant: { select: { name: true } } },
    })
  }

  async deleteByIdAndTenantId(id: string, tenantId: string): Promise<Prisma.BatchPayload> {
    // Use deleteMany to enforce tenantId in WHERE clause (Prisma .delete() only
    // accepts unique fields, so tenantId would be silently ignored).
    return this.prisma.correlationRule.deleteMany({
      where: { id, tenantId },
    })
  }

  /* ---------------------------------------------------------------- */
  /* AGGREGATION QUERIES                                                */
  /* ---------------------------------------------------------------- */

  async aggregate<T extends Prisma.CorrelationRuleAggregateArgs>(
    params: T
  ): Promise<Prisma.GetCorrelationRuleAggregateType<T>> {
    return this.prisma.correlationRule.aggregate(params)
  }

  /* ---------------------------------------------------------------- */
  /* USER LOOKUPS                                                       */
  /* ---------------------------------------------------------------- */

  async findUsersByEmails(emails: string[]): Promise<Array<{ email: string; name: string }>> {
    return this.prisma.user.findMany({
      where: { email: { in: emails } },
      select: { email: true, name: true },
    })
  }

  async findUserNameByEmail(email: string): Promise<{ name: string } | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: { name: true },
    })
  }

  /* ---------------------------------------------------------------- */
  /* NUMBER GENERATION                                                  */
  /* ---------------------------------------------------------------- */

  async findLastRuleByPrefix(
    _tenantId: string,
    prefix: string
  ): Promise<{ ruleNumber: string } | null> {
    return this.prisma.correlationRule.findFirst({
      where: {
        ruleNumber: { startsWith: prefix },
      },
      orderBy: { ruleNumber: 'desc' },
      select: { ruleNumber: true },
    })
  }
}
