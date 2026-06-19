import { randomUUID } from 'node:crypto'
import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common'
import { APPROVAL_REQUIRED_MODES, DISABLED_MODES, HIGH_RISK_LEVELS } from './orchestrator.constants'
import { OrchestratorRepository } from './orchestrator.repository'
import {
  AgentAutomationMode,
  AgentRiskLevel,
  AiFeatureKey,
  AppLogFeature,
  AppLogOutcome,
  AppLogSourceType,
} from '../../../common/enums'
import { BusinessException } from '../../../common/exceptions/business.exception'
import { buildPaginationMeta } from '../../../common/interfaces/pagination.interface'
import { AppLoggerService } from '../../../common/services/app-logger.service'
import { daysAgo, diffMs, toIso } from '../../../common/utils/date-time.utility'
import { resolveExecutionAgent } from '../../agent-config/agent-config.constants'
import { AgentConfigService } from '../../agent-config/agent-config.service'
import { JobType } from '../../jobs/enums/job.enums'
import { JobService } from '../../jobs/jobs.service'
import { checkAgentQuota } from '../ai.utilities'
import { UsageBudgetService } from '../usage-budget/usage-budget.service'
import type { DispatchTaskDto } from './dto/dispatch-task.dto'
import type { ListHistoryQueryDto } from './dto/list-history-query.dto'
import type {
  ApprovalCheckInput,
  CanExecuteResult,
  DispatchAgentTaskInput,
  DispatchAgentTaskResult,
  OrchestratorDispatchResult,
  OrchestratorHistoryEntry,
  OrchestratorStatsResult,
  ResolvedAutomationMode,
} from './orchestrator.types'
import type { AgentActionType } from '../../../common/enums'
import type { JwtPayload } from '../../../common/interfaces/authenticated-request.interface'
import type { PaginatedResponse } from '../../../common/interfaces/pagination.interface'
import type { AgentConfigWithDefaults } from '../../agent-config/agent-config.types'

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name)

  constructor(
    private readonly repository: OrchestratorRepository,
    private readonly agentConfigService: AgentConfigService,
    @Inject(forwardRef(() => JobService))
    private readonly jobService: JobService,
    private readonly usageBudgetService: UsageBudgetService,
    private readonly appLogger: AppLoggerService
  ) {}

  /* ---------------------------------------------------------------- */
  /* DISPATCH AGENT TASK                                               */
  /* ---------------------------------------------------------------- */

  async dispatchAgentTask(input: DispatchAgentTaskInput): Promise<DispatchAgentTaskResult> {
    const { tenantId, actionType } = input
    // Resolve specialist agent alias to its core execution agent
    const agentId = resolveExecutionAgent(input.agentId)

    const agentConfig = await this.agentConfigService.getAgentConfig(tenantId, agentId)

    const canExecute = await this.canAgentExecute(tenantId, agentId, actionType, agentConfig)
    if (!canExecute.allowed) {
      this.logDispatchBlocked(input, canExecute)
      throw new BusinessException(
        403,
        canExecute.reason ?? 'Agent cannot execute this task',
        canExecute.messageKey ?? 'errors.orchestrator.cannotExecute'
      )
    }

    const resolved = this.resolveAutomationMode(agentConfig, actionType)
    const job = await this.enqueueAgentJob(input, resolved)

    // Create approval record when approval is required
    if (resolved.requiresApproval) {
      await this.createApprovalRecord(input, job.id, agentConfig)
    }

    this.logDispatchSuccess(input, job.id, resolved)

    return {
      dispatched: true,
      jobId: job.id,
      automationMode: resolved.mode,
      requiresApproval: resolved.requiresApproval,
    }
  }

  private async createApprovalRecord(
    input: DispatchAgentTaskInput,
    jobId: string,
    _agentConfig: AgentConfigWithDefaults
  ): Promise<void> {
    try {
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 24)

      await this.agentConfigService.createApproval({
        tenantId: input.tenantId,
        agentId: input.agentId,
        actionType: input.actionType,
        actionData: {
          jobId,
          payload: input.payload ?? {},
          triggeredBy: input.triggeredBy,
        },
        riskLevel: 'medium',
        requestedBy: input.triggeredBy,
        expiresAt,
      })

      this.logger.log(`Approval record created for agent ${input.agentId} (job ${jobId})`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      this.logger.warn(`Failed to create approval record: ${message}`)
    }
  }

  /* ---------------------------------------------------------------- */
  /* CAN AGENT EXECUTE                                                 */
  /* ---------------------------------------------------------------- */

  async canAgentExecute(
    tenantId: string,
    agentId: string,
    _actionType: AgentActionType,
    agentConfig?: AgentConfigWithDefaults
  ): Promise<CanExecuteResult> {
    const config = agentConfig ?? (await this.agentConfigService.getAgentConfig(tenantId, agentId))

    const enabledCheck = this.checkAgentEnabled(config)
    if (enabledCheck) {
      return enabledCheck
    }

    const quotaCheck = this.checkAgentQuotaLimit(config)
    if (quotaCheck) {
      return quotaCheck
    }

    const budgetCheck = await this.checkFeatureBudget(tenantId)
    if (!budgetCheck.allowed) {
      return {
        allowed: false,
        reason: 'Monthly AI token budget exceeded',
        messageKey: 'errors.orchestrator.budgetExceeded',
      }
    }

    return { allowed: true }
  }

  /* ---------------------------------------------------------------- */
  /* RESOLVE AUTOMATION MODE                                           */
  /* ---------------------------------------------------------------- */

  resolveAutomationMode(
    tenantConfig: AgentConfigWithDefaults,
    _actionType: AgentActionType
  ): ResolvedAutomationMode {
    const mode = this.mapTriggerModeToAutomationMode(tenantConfig.triggerMode)

    return {
      mode,
      requiresApproval: this.requiresApproval({
        mode,
        riskLevel: AgentRiskLevel.NONE,
      }),
    }
  }

  /* ---------------------------------------------------------------- */
  /* REQUIRES APPROVAL                                                 */
  /* ---------------------------------------------------------------- */

  requiresApproval(input: ApprovalCheckInput): boolean {
    if (APPROVAL_REQUIRED_MODES.has(input.mode)) {
      return true
    }

    if (input.mode === AgentAutomationMode.AUTO_LOW_RISK && HIGH_RISK_LEVELS.has(input.riskLevel)) {
      return true
    }

    return false
  }

  /* ---------------------------------------------------------------- */
  /* DISPATCH VIA HTTP (controller-facing)                              */
  /* ---------------------------------------------------------------- */

  async dispatchFromHttp(
    agentId: string,
    dto: DispatchTaskDto,
    user: JwtPayload
  ): Promise<OrchestratorDispatchResult> {
    const result = await this.dispatchAgentTask({
      tenantId: user.tenantId,
      agentId,
      actionType: dto.actionType,
      payload: {
        ...dto.payload,
        targetId: dto.targetId,
        targetType: dto.targetType,
      },
      triggeredBy: user.email,
    })

    return { jobId: result.jobId, status: 'queued' }
  }

  /* ---------------------------------------------------------------- */
  /* AGENT EXECUTION HISTORY                                            */
  /* ---------------------------------------------------------------- */

  async getAgentHistory(
    agentId: string,
    tenantId: string,
    query: ListHistoryQueryDto
  ): Promise<PaginatedResponse<OrchestratorHistoryEntry>> {
    const agentConfig = await this.agentConfigService.getAgentConfig(tenantId, agentId)

    if (!agentConfig) {
      throw new BusinessException(
        404,
        'Agent config not found',
        'errors.orchestrator.agentNotFound'
      )
    }

    const sortField = this.resolveSortField(query.sortBy)
    const orderBy = { [sortField]: query.sortOrder }

    const [jobs, total] = await Promise.all([
      this.repository.findJobsByAgent(tenantId, agentId, {
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy,
        status: query.status,
      }),
      this.repository.countJobsByAgent(tenantId, agentId, query.status),
    ])

    const data = this.mapJobsToHistoryEntries(jobs, agentId)

    return {
      data,
      pagination: buildPaginationMeta(query.page, query.limit, total),
    }
  }

  /* ---------------------------------------------------------------- */
  /* ORCHESTRATOR STATS                                                 */
  /* ---------------------------------------------------------------- */

  async getOrchestratorStats(tenantId: string): Promise<OrchestratorStatsResult> {
    const since24h = daysAgo(1)

    const [
      totalDispatches24h,
      successCount24h,
      failureCount24h,
      pendingApprovals,
      allAgentConfigs,
    ] = await Promise.all([
      this.repository.countJobsSince(tenantId, since24h),
      this.repository.countJobsSince(tenantId, since24h, 'completed'),
      this.repository.countJobsSince(tenantId, since24h, 'failed'),
      this.repository.countPendingApprovals(tenantId),
      this.agentConfigService.getAgentConfigs(tenantId),
    ])

    return {
      totalDispatches24h,
      successCount24h,
      failureCount24h,
      pendingApprovals,
      activeAgents: allAgentConfigs.filter(c => c.isEnabled).length,
      totalAgents: allAgentConfigs.length,
    }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Helpers                                                   */
  /* ---------------------------------------------------------------- */

  private async enqueueAgentJob(
    input: DispatchAgentTaskInput,
    resolved: ResolvedAutomationMode
  ): Promise<{ id: string }> {
    const { tenantId, agentId, actionType, payload, triggeredBy, connector } = input
    return this.jobService.enqueue({
      tenantId,
      type: JobType.AI_AGENT_TASK,
      payload: {
        agentId,
        actionType,
        triggeredBy,
        automationMode: resolved.mode,
        requiresApproval: resolved.requiresApproval,
        connector,
        ...payload,
      },
      maxAttempts: 2,
      idempotencyKey: `orchestrator:${agentId}:${actionType}:${randomUUID()}`,
      createdBy: triggeredBy,
    })
  }

  private checkAgentEnabled(config: AgentConfigWithDefaults): CanExecuteResult | null {
    if (!config.isEnabled) {
      return {
        allowed: false,
        reason: `Agent "${config.displayName}" is disabled for this tenant`,
        messageKey: 'errors.orchestrator.agentDisabled',
      }
    }

    const mode = this.mapTriggerModeToAutomationMode(config.triggerMode)
    if (DISABLED_MODES.has(mode)) {
      return {
        allowed: false,
        reason: `Agent "${config.displayName}" automation mode is disabled`,
        messageKey: 'errors.orchestrator.automationDisabled',
      }
    }

    return null
  }

  private checkAgentQuotaLimit(config: AgentConfigWithDefaults): CanExecuteResult | null {
    const quotaResult = checkAgentQuota(config)
    if (!quotaResult.allowed) {
      return {
        allowed: false,
        reason: `Agent "${config.displayName}" quota exceeded (${quotaResult.period ?? 'unknown'}: ${String(quotaResult.used ?? 0)}/${String(quotaResult.limit ?? 0)})`,
        messageKey: 'errors.orchestrator.quotaExceeded',
      }
    }
    return null
  }

  private resolveSortField(sortBy: string): string {
    if (sortBy === 'tokensUsed' || sortBy === 'durationMs') {
      return 'createdAt'
    }
    if (sortBy === 'status') {
      return 'status'
    }
    return sortBy
  }

  private mapJobsToHistoryEntries(
    jobs: Awaited<ReturnType<OrchestratorRepository['findJobsByAgent']>>,
    agentId: string
  ): OrchestratorHistoryEntry[] {
    return jobs.map(job => {
      const durationMs =
        job.startedAt && job.completedAt ? diffMs(job.startedAt, job.completedAt) : 0

      return {
        id: job.id,
        agentId,
        status: job.status,
        startedAt: job.startedAt ? toIso(job.startedAt) : toIso(job.createdAt),
        completedAt: job.completedAt ? toIso(job.completedAt) : null,
        durationMs,
        tokensUsed: 0,
        model: null,
        provider: null,
        error: job.error,
      }
    })
  }

  private mapTriggerModeToAutomationMode(triggerMode: string): AgentAutomationMode {
    const modeMap: Record<string, AgentAutomationMode> = {
      manual_only: AgentAutomationMode.MANUAL_ONLY,
      auto_on_alert: AgentAutomationMode.EVENT_DRIVEN,
      auto_by_agent: AgentAutomationMode.ORCHESTRATOR_INVOKED,
      scheduled: AgentAutomationMode.SCHEDULED,
    }

    return Reflect.get(modeMap, triggerMode) ?? AgentAutomationMode.MANUAL_ONLY
  }

  private async checkFeatureBudget(tenantId: string): Promise<{ allowed: boolean }> {
    const result = await this.usageBudgetService.checkBudget(tenantId, AiFeatureKey.AGENT_TASK)
    return { allowed: result.allowed }
  }

  private logDispatchSuccess(
    input: DispatchAgentTaskInput,
    jobId: string,
    resolved: ResolvedAutomationMode
  ): void {
    this.appLogger.info(
      `Orchestrator dispatched agent task: ${input.agentId}/${input.actionType}`,
      {
        feature: AppLogFeature.AI,
        action: 'dispatchAgentTask',
        outcome: AppLogOutcome.SUCCESS,
        sourceType: AppLogSourceType.SERVICE,
        className: 'OrchestratorService',
        functionName: 'dispatchAgentTask',
        tenantId: input.tenantId,
        targetResource: 'Job',
        targetResourceId: jobId,
        metadata: {
          agentId: input.agentId,
          actionType: input.actionType,
          triggeredBy: input.triggeredBy,
          automationMode: resolved.mode,
          requiresApproval: resolved.requiresApproval,
        },
      }
    )
  }

  private logDispatchBlocked(input: DispatchAgentTaskInput, result: CanExecuteResult): void {
    this.appLogger.warn(
      `Orchestrator blocked agent task: ${input.agentId}/${input.actionType} \u2014 ${result.reason ?? 'unknown'}`,
      {
        feature: AppLogFeature.AI,
        action: 'dispatchAgentTask',
        outcome: AppLogOutcome.DENIED,
        sourceType: AppLogSourceType.SERVICE,
        className: 'OrchestratorService',
        functionName: 'dispatchAgentTask',
        tenantId: input.tenantId,
        metadata: {
          agentId: input.agentId,
          actionType: input.actionType,
          triggeredBy: input.triggeredBy,
          reason: result.reason,
          messageKey: result.messageKey,
        },
      }
    )
  }
}
