import { Injectable } from '@nestjs/common'
import { nowDate } from '../../common/utils/date-time.utility'
import { PrismaService } from '../../prisma/prisma.service'
import type { CaseCycle, Prisma } from '@prisma/client'

@Injectable()
export class CaseCyclesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findManyWithCasesAndCount(params: {
    where: Prisma.CaseCycleWhereInput
    orderBy: Prisma.CaseCycleOrderByWithRelationInput
    skip: number
    take: number
  }): Promise<
    [(CaseCycle & { _count: { cases: number }; cases: { status: string }[] })[], number]
  > {
    return Promise.all([
      this.prisma.caseCycle.findMany({
        ...params,
        include: {
          _count: { select: { cases: true } },
          cases: { select: { status: true } },
        },
      }),
      this.prisma.caseCycle.count({ where: params.where }),
    ])
  }

  async countOrphanedCases(tenantId: string): Promise<[number, number, number]> {
    return Promise.all([
      this.prisma.case.count({ where: { tenantId, cycleId: null } }),
      this.prisma.case.count({ where: { tenantId, cycleId: null, status: { not: 'closed' } } }),
      this.prisma.case.count({ where: { tenantId, cycleId: null, status: 'closed' } }),
    ])
  }

  async findFirstActive(
    tenantId: string
  ): Promise<(CaseCycle & { _count: { cases: number }; cases: { status: string }[] }) | null> {
    return this.prisma.caseCycle.findFirst({
      where: { tenantId, status: 'active' },
      include: {
        _count: { select: { cases: true } },
        cases: { select: { status: true } },
      },
    })
  }

  async findFirstByIdAndTenantWithCases(
    id: string,
    tenantId: string
  ): Promise<Prisma.CaseCycleGetPayload<{
    include: {
      _count: { select: { cases: true } }
      cases: { orderBy: { createdAt: 'desc' }; include: { tenant: { select: { name: true } } } }
    }
  }> | null> {
    return this.prisma.caseCycle.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { cases: true } },
        cases: {
          orderBy: { createdAt: 'desc' },
          take: 500,
          include: { tenant: { select: { name: true } } },
        },
      },
    })
  }

  async findUsersByIds(
    userIds: string[]
  ): Promise<{ id: string; name: string | null; email: string }[]> {
    return this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    })
  }

  async create(data: Prisma.CaseCycleUncheckedCreateInput): Promise<CaseCycle> {
    return this.prisma.caseCycle.create({ data })
  }

  async findFirstByIdAndTenantWithCounts(
    id: string,
    tenantId: string
  ): Promise<(CaseCycle & { _count: { cases: number }; cases: { status: string }[] }) | null> {
    return this.prisma.caseCycle.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { cases: true } },
        cases: { select: { status: true } },
      },
    })
  }

  async update(
    id: string,
    tenantId: string,
    data: Record<string, unknown>
  ): Promise<Prisma.BatchPayload> {
    return this.prisma.caseCycle.updateMany({
      where: { id, tenantId },
      data,
    })
  }

  async activateCycleTransaction(
    cycleId: string,
    tenantId: string,
    closedByEmail: string
  ): Promise<CaseCycle | null> {
    return this.prisma.$transaction(async tx => {
      await tx.caseCycle.updateMany({
        where: { tenantId, status: 'active', id: { not: cycleId } },
        data: {
          status: 'closed',
          closedBy: closedByEmail,
          closedAt: nowDate(),
        },
      })

      await tx.caseCycle.updateMany({
        where: { id: cycleId, tenantId },
        data: {
          status: 'active',
          closedBy: null,
          closedAt: null,
        },
      })

      return tx.caseCycle.findFirst({
        where: { id: cycleId, tenantId },
      })
    })
  }

  async findFirstByIdAndTenantWithCaseCount(
    id: string,
    tenantId: string
  ): Promise<(CaseCycle & { _count: { cases: number } }) | null> {
    return this.prisma.caseCycle.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { cases: true } } },
    })
  }

  async deleteCycleWithCasesTransaction(cycleId: string, tenantId: string): Promise<void> {
    await this.prisma.$transaction(async tx => {
      await tx.case.updateMany({
        where: { cycleId, tenantId },
        data: { cycleId: null },
      })
      await tx.caseCycle.deleteMany({ where: { id: cycleId, tenantId } })
    })
  }

  async deleteCycle(id: string, tenantId: string): Promise<Prisma.BatchPayload> {
    return this.prisma.caseCycle.deleteMany({ where: { id, tenantId } })
  }

  async findManyForOverlapCheck(
    where: Prisma.CaseCycleWhereInput
  ): Promise<{ id: string; name: string; startDate: Date; endDate: Date | null }[]> {
    return this.prisma.caseCycle.findMany({
      where,
      select: { id: true, name: true, startDate: true, endDate: true },
    })
  }
}
