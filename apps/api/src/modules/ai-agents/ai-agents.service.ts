import { Injectable, Logger } from '@nestjs/common'
import { AiAgentsRepository } from './ai-agents.repository'
import {
  buildAgentRecord,
  buildAgentListWhere,
  buildAgentOrderBy,
  buildAgentUpdateData,
  buildToolUpdateData,
} from './ai-agents.utilities'
import { AiAgentSessionStatus, AiAgentStatus, AppLogFeature, SortOrder } from '../../common/enums'
import { BusinessException } from '../../common/exceptions/business.exception'
import { buildPaginationMeta } from '../../common/interfaces/pagination.interface'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import { JobType } from '../jobs/enums/job.enums'
import { JobService } from '../jobs/jobs.service'
import type {
  AiAgentRecord,
  AiAgentStats,
  AgentWithRelations,
  PaginatedAgents,
} from './ai-agents.types'
import type { CreateAgentToolDto, UpdateAgentToolDto } from './dto/agent-tool.dto'
import type { CreateAgentDto } from './dto/create-agent.dto'
import type { ExecuteAgentDto } from './dto/execute-agent.dto'
import type { UpdateAgentDto } from './dto/update-agent.dto'
import type { UpdateSoulDto } from './dto/update-soul.dto'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'
import type { PaginatedResponse } from '../../common/interfaces/pagination.interface'
import type { AiAgent, AiAgentSession, AiAgentTool } from '@prisma/client'

@Injectable()
export class AiAgentsService {
  private readonly logger = new Logger(AiAgentsService.name)
  private readonly log: ServiceLogger

  constructor(
    private readonly repository: AiAgentsRepository,
    private readonly appLogger: AppLoggerService,
    private readonly jobService: JobService
  ) {
    this.log = new ServiceLogger(this.appLogger, AppLogFeature.AI_AGENTS, 'AiAgentsService')
  }

  /* ---------------------------------------------------------------- */
  /* LIST (paginated, tenant-scoped)                                   */
  /* ---------------------------------------------------------------- */

  async listAgents(
    tenantId: string,
    page = 1,
    limit = 20,
    sortBy?: string,
    sortOrder?: string,
    status?: string,
    tier?: string,
    query?: string
  ): Promise<PaginatedAgents> {
    this.logger.log(
      `listAgents called for tenant ${tenantId}: page=${String(page)}, limit=${String(limit)}`
    )
    const where = buildAgentListWhere(tenantId, status, tier, query)

    const [agents, total] = await Promise.all([
      this.repository.findManyWithCounts({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: buildAgentOrderBy(sortBy, sortOrder),
      }),
      this.repository.count(where),
    ])

    const data = this.mapAgentListItems(agents)

    this.logger.log(`listAgents completed for tenant ${tenantId}: ${String(total)} agents found`)
    return {
      data,
      pagination: buildPaginationMeta(page, limit, total),
    }
  }

  private mapAgentListItems(
    agents: Array<AiAgent & { _count: { tools: number; sessions: number } }>
  ): PaginatedAgents['data'] {
    return agents.map(agent => {
      const { _count, ...rest } = agent
      return {
        ...rest,
        totalTokens: String(agent.totalTokens),
        toolsCount: _count.tools,
        sessionsCount: _count.sessions,
      }
    })
  }

  /* ---------------------------------------------------------------- */
  /* GET BY ID                                                         */
  /* ---------------------------------------------------------------- */

  async getAgentById(id: string, tenantId: string): Promise<AiAgentRecord> {
    this.logger.log(`getAgentById called for agent ${id} in tenant ${tenantId}`)
    const agent = await this.repository.findFirstWithDetails({ id, tenantId })

    if (!agent) {
      this.log.warn('getAgentById', tenantId, 'AI Agent not found', { agentId: id })
      throw new BusinessException(404, `AI Agent ${id} not found`, 'errors.aiAgents.notFound')
    }

    return buildAgentRecord(agent as unknown as AgentWithRelations)
  }

  /* ---------------------------------------------------------------- */
  /* CREATE                                                            */
  /* ---------------------------------------------------------------- */

  async createAgent(dto: CreateAgentDto, user: JwtPayload): Promise<AiAgentRecord> {
    this.logger.log(`createAgent called by ${user.email} in tenant ${user.tenantId}`)
    await this.validateAgentNameUnique(user.tenantId, dto.name)

    const newAgent = await this.repository.createWithDetails({
      tenantId: user.tenantId,
      name: dto.name,
      description: dto.description ?? null,
      model: dto.model,
      tier: dto.tier,
      status: AiAgentStatus.OFFLINE,
      soulMd: dto.soulMd ?? null,
    })

    this.log.success('createAgent', user.tenantId, {
      name: newAgent.name,
      tier: newAgent.tier,
      model: newAgent.model,
      actorEmail: user.email,
    })

    return buildAgentRecord(newAgent as unknown as AgentWithRelations)
  }

  private async validateAgentNameUnique(
    tenantId: string,
    name: string,
    excludeId?: string
  ): Promise<void> {
    const where: Record<string, unknown> = { tenantId, name }
    if (excludeId) {
      where.id = { not: excludeId }
    }
    const existing = await this.repository.findFirstSelect(where, { id: true })
    if (existing) {
      throw new BusinessException(
        409,
        `Agent with name "${name}" already exists`,
        'errors.aiAgents.nameAlreadyExists'
      )
    }
  }

  /* ---------------------------------------------------------------- */
  /* UPDATE                                                            */
  /* ---------------------------------------------------------------- */

  async updateAgent(id: string, dto: UpdateAgentDto, user: JwtPayload): Promise<AiAgentRecord> {
    this.logger.log(`updateAgent called for agent ${id} by ${user.email}`)
    await this.getAgentById(id, user.tenantId)

    if (dto.name !== undefined) {
      await this.validateAgentNameUnique(user.tenantId, dto.name, id)
    }

    const updated = await this.repository.updateWithDetails({
      where: { id, tenantId: user.tenantId },
      data: buildAgentUpdateData(dto),
    })

    this.log.success('updateAgent', user.tenantId, { agentId: id, actorEmail: user.email })

    return buildAgentRecord(updated as unknown as AgentWithRelations)
  }

  /* ---------------------------------------------------------------- */
  /* DELETE                                                            */
  /* ---------------------------------------------------------------- */

  async deleteAgent(id: string, tenantId: string, actor: string): Promise<{ deleted: boolean }> {
    this.logger.log(`deleteAgent called for agent ${id} in tenant ${tenantId}`)
    const existing = await this.getAgentById(id, tenantId)

    await this.repository.deleteMany({ id, tenantId })

    this.log.success('deleteAgent', tenantId, {
      agentId: id,
      name: existing.name,
      actorEmail: actor,
    })

    return { deleted: true }
  }

  /* ---------------------------------------------------------------- */
  /* UPDATE SOUL                                                       */
  /* ---------------------------------------------------------------- */

  async updateSoul(id: string, dto: UpdateSoulDto, user: JwtPayload): Promise<AiAgentRecord> {
    this.logger.log(`updateSoul called for agent ${id} by ${user.email}`)
    await this.getAgentById(id, user.tenantId)

    const updated = await this.repository.updateWithDetails({
      where: { id, tenantId: user.tenantId },
      data: { soulMd: dto.soulMd },
    })

    this.log.success('updateSoul', user.tenantId, { agentId: id, actorEmail: user.email })

    return buildAgentRecord(updated as unknown as AgentWithRelations)
  }

  /* ---------------------------------------------------------------- */
  /* GET AGENT SESSIONS                                                */
  /* ---------------------------------------------------------------- */

  async getAgentSessions(
    agentId: string,
    tenantId: string,
    page = 1,
    limit = 20
  ): Promise<PaginatedResponse<AiAgentSession>> {
    this.logger.log(`getAgentSessions called for agent ${agentId} in tenant ${tenantId}`)
    // Verify agent exists and belongs to tenant
    await this.getAgentById(agentId, tenantId)

    const where = { agentId }

    const [sessions, total] = await Promise.all([
      this.repository.findManySessions({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { startedAt: SortOrder.DESC },
      }),
      this.repository.countSessions(where),
    ])

    this.logger.log(`getAgentSessions completed for agent ${agentId}: ${String(total)} sessions`)
    return {
      data: sessions,
      pagination: buildPaginationMeta(page, limit, total),
    }
  }

  /* ---------------------------------------------------------------- */
  /* STATS                                                             */
  /* ---------------------------------------------------------------- */

  async getAgentStats(tenantId: string): Promise<AiAgentStats> {
    this.logger.log(`getAgentStats called for tenant ${tenantId}`)
    const [totalAgents, onlineAgents, sessionAgg, costAgg] = await Promise.all([
      this.repository.count({ tenantId }),
      this.repository.count({ tenantId, status: AiAgentStatus.ONLINE }),
      this.repository.countSessions({ agent: { tenantId } }),
      this.repository.aggregate({
        where: { tenantId },
        _sum: {
          totalTokens: true,
          totalCost: true,
        },
      }),
    ])

    this.logger.log(
      `getAgentStats completed for tenant ${tenantId}: ${String(totalAgents)} total, ${String(onlineAgents)} online`
    )
    return {
      totalAgents,
      onlineAgents,
      totalSessions: sessionAgg,
      totalTokens: String(costAgg._sum?.totalTokens ?? 0),
      totalCost: costAgg._sum?.totalCost ?? 0,
    }
  }

  /* ---------------------------------------------------------------- */
  /* START AGENT                                                       */
  /* ---------------------------------------------------------------- */

  async startAgent(id: string, tenantId: string, actor: string): Promise<AiAgentRecord> {
    this.logger.log(`startAgent called for agent ${id} in tenant ${tenantId}`)
    const existing = await this.getAgentById(id, tenantId)

    if (existing.status === AiAgentStatus.ONLINE) {
      throw new BusinessException(400, 'Agent is already online', 'errors.aiAgents.alreadyOnline')
    }

    const updated = await this.repository.updateWithDetails({
      where: { id, tenantId },
      data: { status: AiAgentStatus.ONLINE },
    })

    this.log.success('startAgent', tenantId, {
      agentId: id,
      previousStatus: existing.status,
      actorEmail: actor,
    })

    return buildAgentRecord(updated as unknown as AgentWithRelations)
  }

  /* ---------------------------------------------------------------- */
  /* STOP AGENT                                                        */
  /* ---------------------------------------------------------------- */

  async stopAgent(id: string, tenantId: string, actor: string): Promise<AiAgentRecord> {
    this.logger.log(`stopAgent called for agent ${id} in tenant ${tenantId}`)
    const existing = await this.getAgentById(id, tenantId)

    if (existing.status === AiAgentStatus.OFFLINE) {
      throw new BusinessException(400, 'Agent is already offline', 'errors.aiAgents.alreadyOffline')
    }

    const updated = await this.repository.updateWithDetails({
      where: { id, tenantId },
      data: { status: AiAgentStatus.OFFLINE },
    })

    this.log.success('stopAgent', tenantId, {
      agentId: id,
      previousStatus: existing.status,
      actorEmail: actor,
    })

    return buildAgentRecord(updated as unknown as AgentWithRelations)
  }

  async runAgent(
    id: string,
    dto: ExecuteAgentDto,
    user: JwtPayload
  ): Promise<{ queued: boolean; jobId: string; sessionId: string }> {
    this.logger.log(`runAgent called for agent ${id} by ${user.email}`)
    const agent = await this.getAgentById(id, user.tenantId)

    if (agent.status === AiAgentStatus.OFFLINE) {
      throw new BusinessException(409, 'Agent is offline', 'errors.aiAgents.offline')
    }

    const session = await this.repository.createSession({
      agentId: id,
      input: dto.prompt,
      status: AiAgentSessionStatus.RUNNING,
    })

    const job = await this.enqueueAgentJob(id, session.id, dto, user)
    this.logRunAgentSuccess(id, session.id, job.id, user)

    return { queued: true, jobId: job.id, sessionId: session.id }
  }

  private logRunAgentSuccess(
    agentId: string,
    sessionId: string,
    jobId: string,
    user: JwtPayload
  ): void {
    this.log.success('runAgent', user.tenantId, {
      agentId,
      sessionId,
      jobId,
      actorEmail: user.email,
    })
  }

  private async enqueueAgentJob(
    agentId: string,
    sessionId: string,
    dto: ExecuteAgentDto,
    user: JwtPayload
  ): Promise<{ id: string }> {
    return this.jobService.enqueue({
      tenantId: user.tenantId,
      type: JobType.AI_AGENT_TASK,
      payload: {
        agentId,
        sessionId,
        prompt: dto.prompt,
        actorUserId: user.sub,
        actorEmail: user.email,
        connector: dto.connector,
      },
      maxAttempts: 2,
      idempotencyKey: `ai-agent:${agentId}:${sessionId}`,
      createdBy: user.email,
    })
  }

  /* ---------------------------------------------------------------- */
  /* CREATE TOOL                                                       */
  /* ---------------------------------------------------------------- */

  async createTool(
    agentId: string,
    dto: CreateAgentToolDto,
    user: JwtPayload
  ): Promise<AiAgentTool> {
    this.logger.log(`createTool called for agent ${agentId} by ${user.email}`)
    await this.getAgentById(agentId, user.tenantId)
    await this.validateToolNameUnique(agentId, dto.name)

    const tool = await this.repository.createTool({
      agentId,
      name: dto.name,
      description: dto.description,
      schema: JSON.parse(JSON.stringify(dto.schema ?? {})),
    })

    this.log.success('createTool', user.tenantId, {
      agentId,
      toolName: tool.name,
      actorEmail: user.email,
    })

    return tool
  }

  /* ---------------------------------------------------------------- */
  /* UPDATE TOOL                                                       */
  /* ---------------------------------------------------------------- */

  async updateTool(
    agentId: string,
    toolId: string,
    dto: UpdateAgentToolDto,
    user: JwtPayload
  ): Promise<AiAgentTool> {
    this.logger.log(`updateTool called for tool ${toolId} on agent ${agentId} by ${user.email}`)
    await this.getAgentById(agentId, user.tenantId)
    await this.validateToolExists(toolId, agentId)
    await this.validateToolNameUnique(agentId, dto.name, toolId)

    const updated = await this.repository.updateTool({ id: toolId }, buildToolUpdateData(dto))

    this.log.success('updateTool', user.tenantId, {
      agentId,
      toolId,
      toolName: updated.name,
      actorEmail: user.email,
    })

    return updated
  }

  private async validateToolExists(toolId: string, agentId: string): Promise<void> {
    const existingTool = await this.repository.findFirstTool({ id: toolId, agentId })
    if (!existingTool) {
      throw new BusinessException(
        404,
        `Tool ${toolId} not found on agent ${agentId}`,
        'errors.aiAgents.toolNotFound'
      )
    }
  }

  private async validateToolNameUnique(
    agentId: string,
    name: string | undefined,
    excludeToolId?: string
  ): Promise<void> {
    if (name === undefined) return

    const where: Record<string, unknown> = { agentId, name }
    if (excludeToolId) {
      where.id = { not: excludeToolId }
    }

    const duplicate = await this.repository.findFirstTool(where)
    if (duplicate) {
      throw new BusinessException(
        409,
        `Tool with name "${name}" already exists on this agent`,
        'errors.aiAgents.toolNameAlreadyExists'
      )
    }
  }

  /* ---------------------------------------------------------------- */
  /* DELETE TOOL                                                       */
  /* ---------------------------------------------------------------- */

  async deleteTool(
    agentId: string,
    toolId: string,
    tenantId: string,
    actorEmail: string
  ): Promise<{ deleted: boolean }> {
    this.logger.log(`deleteTool called for tool ${toolId} on agent ${agentId}`)
    await this.getAgentById(agentId, tenantId)
    await this.validateToolExists(toolId, agentId)

    await this.repository.deleteTool({ id: toolId })

    this.log.success('deleteTool', tenantId, { agentId, toolId, actorEmail })

    return { deleted: true }
  }
}
