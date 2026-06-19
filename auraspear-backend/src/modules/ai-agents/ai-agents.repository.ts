import { Injectable } from '@nestjs/common'
import { nowDate } from '../../common/utils/date-time.utility'
import { PrismaService } from '../../prisma/prisma.service'
import type { AiAgent, AiAgentSession, AiAgentTool, Prisma } from '@prisma/client'

@Injectable()
export class AiAgentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /* ---------------------------------------------------------------- */
  /* AI AGENT QUERIES                                                   */
  /* ---------------------------------------------------------------- */

  async findMany(params: {
    where: Prisma.AiAgentWhereInput
    orderBy: Prisma.AiAgentOrderByWithRelationInput
    skip: number
    take: number
  }): Promise<AiAgent[]> {
    return this.prisma.aiAgent.findMany(params)
  }

  async findManyWithCounts(params: {
    where: Prisma.AiAgentWhereInput
    orderBy: Prisma.AiAgentOrderByWithRelationInput
    skip: number
    take: number
  }): Promise<(AiAgent & { _count: { tools: number; sessions: number } })[]> {
    return this.prisma.aiAgent.findMany({
      ...params,
      include: {
        _count: {
          select: {
            tools: true,
            sessions: true,
          },
        },
      },
    })
  }

  async count(where: Prisma.AiAgentWhereInput): Promise<number> {
    return this.prisma.aiAgent.count({ where })
  }

  async findFirst(where: Prisma.AiAgentWhereInput): Promise<AiAgent | null> {
    return this.prisma.aiAgent.findFirst({ where })
  }

  async findFirstWithDetails(where: Prisma.AiAgentWhereInput): Promise<Prisma.AiAgentGetPayload<{
    include: {
      tools: true
      sessions: true
      _count: { select: { tools: true; sessions: true } }
    }
  }> | null> {
    return this.prisma.aiAgent.findFirst({
      where,
      include: {
        tools: true,
        sessions: {
          orderBy: { startedAt: 'desc' } as const,
          take: 10,
        },
        _count: {
          select: {
            tools: true,
            sessions: true,
          },
        },
      },
    })
  }

  async findFirstSelect(
    where: Prisma.AiAgentWhereInput,
    select: Prisma.AiAgentSelect
  ): Promise<Partial<AiAgent> | null> {
    return this.prisma.aiAgent.findFirst({ where, select })
  }

  async create(data: Prisma.AiAgentUncheckedCreateInput): Promise<AiAgent> {
    return this.prisma.aiAgent.create({ data })
  }

  async createWithDetails(data: Prisma.AiAgentUncheckedCreateInput): Promise<
    Prisma.AiAgentGetPayload<{
      include: {
        tools: true
        sessions: true
        _count: { select: { tools: true; sessions: true } }
      }
    }>
  > {
    return this.prisma.aiAgent.create({
      data,
      include: {
        tools: true,
        sessions: {
          orderBy: { startedAt: 'desc' } as const,
          take: 10,
        },
        _count: {
          select: {
            tools: true,
            sessions: true,
          },
        },
      },
    })
  }

  async update(params: {
    where: { id: string; tenantId: string }
    data: Prisma.AiAgentUpdateManyMutationInput | Record<string, unknown>
  }): Promise<Prisma.BatchPayload> {
    return this.prisma.aiAgent.updateMany({
      where: params.where,
      data: params.data,
    })
  }

  async updateWithDetails(params: {
    where: { id: string; tenantId: string }
    data: Prisma.AiAgentUpdateManyMutationInput | Record<string, unknown>
  }): Promise<Prisma.AiAgentGetPayload<{
    include: {
      tools: true
      sessions: true
      _count: { select: { tools: true; sessions: true } }
    }
  }> | null> {
    await this.prisma.aiAgent.updateMany({
      where: params.where,
      data: params.data,
    })

    const updated = await this.prisma.aiAgent.findFirst({
      where: params.where,
      include: {
        tools: true,
        sessions: {
          orderBy: { startedAt: 'desc' } as const,
          take: 10,
        },
        _count: {
          select: {
            tools: true,
            sessions: true,
          },
        },
      },
    })

    if (!updated) {
      return null
    }

    return updated
  }

  async deleteMany(where: Prisma.AiAgentWhereInput): Promise<Prisma.BatchPayload> {
    return this.prisma.aiAgent.deleteMany({ where })
  }

  /* ---------------------------------------------------------------- */
  /* AI AGENT AGGREGATION                                               */
  /* ---------------------------------------------------------------- */

  async aggregate(params: {
    where: Prisma.AiAgentWhereInput
    _sum?: Prisma.AiAgentAggregateArgs['_sum']
  }): Promise<
    Prisma.GetAiAgentAggregateType<{
      where: Prisma.AiAgentWhereInput
      _sum: Prisma.AiAgentAggregateArgs['_sum']
    }>
  > {
    return this.prisma.aiAgent.aggregate({
      where: params.where,
      _sum: params._sum,
    })
  }

  /* ---------------------------------------------------------------- */
  /* AI AGENT SESSION QUERIES                                           */
  /* ---------------------------------------------------------------- */

  async findManySessions(params: {
    where: Prisma.AiAgentSessionWhereInput
    skip: number
    take: number
    orderBy: Prisma.AiAgentSessionOrderByWithRelationInput
  }): Promise<AiAgentSession[]> {
    return this.prisma.aiAgentSession.findMany(params)
  }

  async countSessions(where: Prisma.AiAgentSessionWhereInput): Promise<number> {
    return this.prisma.aiAgentSession.count({ where })
  }

  async findFirstSession(where: Prisma.AiAgentSessionWhereInput): Promise<AiAgentSession | null> {
    return this.prisma.aiAgentSession.findFirst({ where })
  }

  async createSession(data: Prisma.AiAgentSessionUncheckedCreateInput): Promise<AiAgentSession> {
    return this.prisma.aiAgentSession.create({ data })
  }

  async markSessionCompleted(params: {
    sessionId: string
    agentId: string
    tenantId: string
    output: string
    model: string
    provider: string
    tokensUsed: number
    cost: number
    durationMs: number
  }): Promise<void> {
    await this.prisma.$transaction(async tx => {
      await tx.aiAgentSession.update({
        where: { id: params.sessionId },
        data: {
          status: 'completed',
          output: params.output,
          model: params.model,
          provider: params.provider,
          tokensUsed: params.tokensUsed,
          cost: params.cost,
          durationMs: params.durationMs,
          completedAt: nowDate(),
        },
      })

      const agent = await tx.aiAgent.findFirst({
        where: { id: params.agentId, tenantId: params.tenantId },
        select: { totalTasks: true, avgTimeMs: true },
      })

      if (!agent) {
        return
      }

      const nextTotalTasks = agent.totalTasks + 1
      const nextAvgTimeMs =
        agent.totalTasks === 0
          ? params.durationMs
          : Math.round((agent.avgTimeMs * agent.totalTasks + params.durationMs) / nextTotalTasks)

      await tx.aiAgent.update({
        where: { id: params.agentId },
        data: {
          totalTasks: { increment: 1 },
          totalTokens: { increment: params.tokensUsed },
          totalCost: { increment: params.cost },
          avgTimeMs: nextAvgTimeMs,
        },
      })
    })
  }

  async updateSessionProviderInfo(
    sessionId: string,
    provider: string,
    model: string
  ): Promise<void> {
    await this.prisma.aiAgentSession.update({
      where: { id: sessionId },
      data: { provider, model },
    })
  }

  async markSessionFailed(params: {
    sessionId: string
    errorMessage: string
    durationMs: number
    model?: string
    provider?: string
  }): Promise<void> {
    await this.prisma.aiAgentSession.update({
      where: { id: params.sessionId },
      data: {
        status: 'failed',
        errorMessage: params.errorMessage,
        durationMs: params.durationMs,
        model: params.model ?? null,
        provider: params.provider ?? null,
        completedAt: nowDate(),
      },
    })
  }

  /* ---------------------------------------------------------------- */
  /* AI AGENT TOOL QUERIES                                              */
  /* ---------------------------------------------------------------- */

  async findManyTools(where: Prisma.AiAgentToolWhereInput): Promise<AiAgentTool[]> {
    return this.prisma.aiAgentTool.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    })
  }

  async findFirstTool(where: Prisma.AiAgentToolWhereInput): Promise<AiAgentTool | null> {
    return this.prisma.aiAgentTool.findFirst({ where })
  }

  async createTool(data: Prisma.AiAgentToolUncheckedCreateInput): Promise<AiAgentTool> {
    return this.prisma.aiAgentTool.create({ data })
  }

  async updateTool(
    where: { id: string },
    data: Prisma.AiAgentToolUpdateInput
  ): Promise<AiAgentTool> {
    return this.prisma.aiAgentTool.update({ where, data })
  }

  async deleteTool(where: { id: string }): Promise<AiAgentTool> {
    return this.prisma.aiAgentTool.delete({ where })
  }

  async countTools(where: Prisma.AiAgentToolWhereInput): Promise<number> {
    return this.prisma.aiAgentTool.count({ where })
  }
}
