import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PLAYBOOK_WITH_TENANT_INCLUDE, EXECUTION_WITH_PLAYBOOK_INCLUDE } from './soar.constants'
import { SoarExecutionStatus } from '../../common/enums'
import { nowDate } from '../../common/utils/date-time.utility'
import { PrismaService } from '../../prisma/prisma.service'
import type { PlaybookWithTenantPrisma, ExecutionWithPlaybookPrisma } from './soar.types'
import type { SoarPlaybook, SoarExecution } from '@prisma/client'

@Injectable()
export class SoarRepository {
  constructor(private readonly prisma: PrismaService) {}

  /* ---------------------------------------------------------------- */
  /* PLAYBOOKS                                                         */
  /* ---------------------------------------------------------------- */

  async findManyPlaybooksWithTenant(params: {
    where: Prisma.SoarPlaybookWhereInput
    skip: number
    take: number
    orderBy: Prisma.SoarPlaybookOrderByWithRelationInput
  }): Promise<PlaybookWithTenantPrisma[]> {
    return this.prisma.soarPlaybook.findMany({
      ...params,
      include: PLAYBOOK_WITH_TENANT_INCLUDE,
    })
  }

  async countPlaybooks(where: Prisma.SoarPlaybookWhereInput): Promise<number> {
    return this.prisma.soarPlaybook.count({ where })
  }

  async findFirstPlaybookWithTenant(
    where: Prisma.SoarPlaybookWhereInput
  ): Promise<PlaybookWithTenantPrisma | null> {
    return this.prisma.soarPlaybook.findFirst({
      where,
      include: PLAYBOOK_WITH_TENANT_INCLUDE,
    })
  }

  async findPlaybookByIdAndTenant(id: string, tenantId: string): Promise<SoarPlaybook | null> {
    return this.prisma.soarPlaybook.findFirst({
      where: { id, tenantId },
    })
  }

  async createPlaybookWithTenant(
    data: Prisma.SoarPlaybookUncheckedCreateInput
  ): Promise<PlaybookWithTenantPrisma> {
    return this.prisma.soarPlaybook.create({
      data,
      include: PLAYBOOK_WITH_TENANT_INCLUDE,
    })
  }

  async updateManyPlaybooks(params: {
    where: Prisma.SoarPlaybookWhereInput
    data: Prisma.SoarPlaybookUpdateManyMutationInput
  }): Promise<Prisma.BatchPayload> {
    return this.prisma.soarPlaybook.updateMany(params)
  }

  async deleteManyPlaybooks(where: Prisma.SoarPlaybookWhereInput): Promise<Prisma.BatchPayload> {
    return this.prisma.soarPlaybook.deleteMany({ where })
  }

  /* ---------------------------------------------------------------- */
  /* EXECUTIONS                                                        */
  /* ---------------------------------------------------------------- */

  async findManyExecutionsWithPlaybook(params: {
    where: Prisma.SoarExecutionWhereInput
    skip: number
    take: number
    orderBy: Prisma.SoarExecutionOrderByWithRelationInput
  }): Promise<ExecutionWithPlaybookPrisma[]> {
    return this.prisma.soarExecution.findMany({
      ...params,
      include: EXECUTION_WITH_PLAYBOOK_INCLUDE,
    })
  }

  async countExecutions(where: Prisma.SoarExecutionWhereInput): Promise<number> {
    return this.prisma.soarExecution.count({ where })
  }

  async updateExecutionById(
    id: string,
    data: Prisma.SoarExecutionUpdateInput
  ): Promise<SoarExecution> {
    return this.prisma.soarExecution.update({
      where: { id },
      data,
    })
  }

  async getAvgExecutionTimeMs(tenantId: string): Promise<number | null> {
    const result = await this.prisma.$queryRaw<Array<{ avg_ms: number | null }>>`
      SELECT AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000)::float as avg_ms
      FROM soar_executions
      WHERE tenant_id = ${tenantId}::uuid
        AND completed_at IS NOT NULL
    `
    const avgMs = result[0]?.avg_ms
    if (avgMs === null || avgMs === undefined) return null
    return Math.round(avgMs)
  }

  async executePlaybookTransaction(params: {
    playbookId: string
    tenantId: string
    triggeredBy: string
  }): Promise<ExecutionWithPlaybookPrisma> {
    return this.prisma.$transaction(async tx => {
      const execution = await tx.soarExecution.create({
        data: {
          playbookId: params.playbookId,
          tenantId: params.tenantId,
          status: SoarExecutionStatus.RUNNING,
          triggeredBy: params.triggeredBy,
          startedAt: nowDate(),
        },
        include: EXECUTION_WITH_PLAYBOOK_INCLUDE,
      })

      await tx.soarPlaybook.updateMany({
        where: { id: params.playbookId, tenantId: params.tenantId },
        data: {
          executionCount: { increment: 1 },
          lastExecutedAt: nowDate(),
        },
      })

      return execution
    })
  }

  /* ---------------------------------------------------------------- */
  /* USERS (for creator name resolution)                               */
  /* ---------------------------------------------------------------- */

  async findUserByEmail(email: string): Promise<{ name: string } | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: { name: true },
    })
  }

  async findUsersByEmails(emails: string[]): Promise<Array<{ email: string; name: string }>> {
    return this.prisma.user.findMany({
      where: { email: { in: emails } },
      select: { email: true, name: true },
    })
  }
}
