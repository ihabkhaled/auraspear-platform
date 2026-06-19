import { Injectable, Logger } from '@nestjs/common'
import { AiAgentsRepository } from './ai-agents.repository'
import { nowMs, elapsedMs } from '../../common/utils/date-time.utility'
import { AI_COST_PER_1K_INPUT_TOKENS, AI_COST_PER_1K_OUTPUT_TOKENS } from '../ai/ai.constants'
import { AiService } from '../ai/ai.service'
import { AiWritebackService } from '../ai/writeback/ai-writeback.service'
import type { AgentTaskPayload } from './ai-agents.types'
import type { AiResponse } from '../ai/ai.types'
import type { Job } from '@prisma/client'

@Injectable()
export class AiAgentTaskHandler {
  private readonly logger = new Logger(AiAgentTaskHandler.name)

  constructor(
    private readonly repository: AiAgentsRepository,
    private readonly aiService: AiService,
    private readonly writebackService: AiWritebackService
  ) {}

  async handle(job: Job): Promise<Record<string, unknown>> {
    const payload = (job.payload as AgentTaskPayload | null) ?? {}
    const { agentId } = payload

    if (!agentId) {
      throw new Error('agentId is required in job payload')
    }

    // System-triggered jobs use slug IDs (e.g. 'alert-triage') from TenantAgentConfig
    // User-triggered jobs use UUID IDs from AiAgent table
    if (payload.triggeredBy) {
      return this.handleSystemTriggered(job, payload)
    }

    return this.handleUserTriggered(job, payload)
  }

  private async handleUserTriggered(
    job: Job,
    payload: AgentTaskPayload
  ): Promise<Record<string, unknown>> {
    const { agentId, sessionId, prompt, actorUserId, actorEmail, connector } = payload

    if (!agentId || !sessionId || !prompt || !actorUserId || !actorEmail) {
      throw new Error('agentId, sessionId, prompt, actorUserId, and actorEmail are required')
    }

    const startedAt = nowMs()
    const agent = await this.repository.findFirstWithDetails({
      id: agentId,
      tenantId: job.tenantId,
    })
    if (!agent) {
      throw new Error(`AI Agent ${agentId} not found for tenant ${job.tenantId}`)
    }

    const session = await this.repository.findFirstSession({ id: sessionId, agentId })
    if (!session) {
      throw new Error(`AI Agent session ${sessionId} not found`)
    }

    const { providerLabel, modelLabel } = await this.aiService.resolveConnectorLabel(
      job.tenantId,
      connector
    )
    const resolvedModel = modelLabel || agent.model

    await this.repository.updateSessionProviderInfo(sessionId, providerLabel, resolvedModel)

    try {
      this.logger.log(`Executing AI agent "${agent.name}" for tenant ${job.tenantId}`)

      const response = await this.aiService.runAgentTask({
        tenantId: job.tenantId,
        actorUserId,
        actorEmail,
        agentId,
        agentName: agent.name,
        model: agent.model,
        prompt,
        soulMd: agent.soulMd,
        tools: agent.tools.map(tool => ({
          name: tool.name,
          description: tool.description,
        })),
        connector,
      })

      const durationMs = elapsedMs(startedAt)
      const tokensUsed = response.tokensUsed.input + response.tokensUsed.output
      const estimatedCost =
        (response.tokensUsed.input / 1000) * AI_COST_PER_1K_INPUT_TOKENS +
        (response.tokensUsed.output / 1000) * AI_COST_PER_1K_OUTPUT_TOKENS

      await this.repository.markSessionCompleted({
        sessionId,
        agentId,
        tenantId: job.tenantId,
        output: response.result,
        model: response.model,
        provider: response.provider,
        tokensUsed,
        cost: estimatedCost,
        durationMs,
      })

      return { agentId, sessionId, model: response.model, tokensUsed, estimatedCost, durationMs }
    } catch (error) {
      const durationMs = elapsedMs(startedAt)
      const message = error instanceof Error ? error.message : 'Unknown AI agent execution error'
      await this.repository.markSessionFailed({
        sessionId,
        errorMessage: message,
        durationMs,
        provider: providerLabel,
        model: resolvedModel,
      })
      throw error
    }
  }

  private async handleSystemTriggered(
    job: Job,
    payload: AgentTaskPayload
  ): Promise<Record<string, unknown>> {
    const agentSlug = payload.agentId ?? 'unknown'
    const prompt = this.buildSystemPrompt(payload)
    const startedAt = nowMs()

    this.logger.log(
      `System-triggered agent task: ${agentSlug} (${payload.actionType ?? 'execute'}) for tenant ${job.tenantId}`
    )

    const agent = await this.resolveAgentForSystem(job.tenantId, agentSlug)
    const sessionId = await this.createSystemSession(agent, job, agentSlug, prompt, payload)

    try {
      const response = await this.executeAndPersist(
        job,
        payload,
        agent,
        agentSlug,
        prompt,
        sessionId
      )

      const durationMs = elapsedMs(startedAt)
      const tokensUsed = response.tokensUsed.input + response.tokensUsed.output

      await this.finalizeSystemSession(
        agent,
        sessionId,
        job.tenantId,
        response,
        tokensUsed,
        durationMs
      )

      await this.writebackService.processSystemTriggeredResult({
        tenantId: job.tenantId,
        sessionId,
        agentId: agentSlug,
        sourceModule: this.resolveSourceModule(payload),
        sourceEntityId: payload.alertId ?? payload.incidentId ?? undefined,
        aiResponse: response,
        actionType: payload.actionType ?? 'execute',
        hasRealSession: Boolean(agent),
      })

      return {
        agentId: agentSlug,
        sessionId,
        actionType: payload.actionType,
        triggeredBy: payload.triggeredBy,
        model: response.model,
        tokensUsed,
        durationMs,
      }
    } catch (error) {
      const durationMs = elapsedMs(startedAt)
      await this.handleSystemSessionFailure(agent, sessionId, agentSlug, error, durationMs)
      throw error
    }
  }

  /**
   * Resolve an AiAgent record by slug name for system-triggered tasks.
   */
  private async resolveAgentForSystem(
    tenantId: string,
    agentSlug: string
  ): Promise<Awaited<ReturnType<AiAgentsRepository['findFirst']>>> {
    return this.repository.findFirst({ tenantId, name: agentSlug })
  }

  /**
   * Create a session for the system-triggered task when an AiAgent record exists.
   */
  private async createSystemSession(
    agent: Awaited<ReturnType<AiAgentsRepository['findFirst']>>,
    job: Job,
    agentSlug: string,
    prompt: string,
    payload: AgentTaskPayload
  ): Promise<string> {
    const fallbackSessionId = payload.sessionId ?? job.id

    if (!agent) {
      return fallbackSessionId
    }

    try {
      const session = await this.repository.createSession({
        agentId: agent.id,
        tenantId: job.tenantId,
        input: prompt,
        status: 'running',
        triggerType: 'system',
        sourceModule: this.resolveSourceModule(payload),
        sourceEntityId: payload.alertId ?? payload.incidentId ?? null,
        jobId: job.id,
      })
      return session.id
    } catch (sessionError) {
      this.logger.warn(
        `Failed to create session for system agent ${agentSlug}: ${sessionError instanceof Error ? sessionError.message : 'Unknown error'}`
      )
      return fallbackSessionId
    }
  }

  /**
   * Execute the AI agent task and return the response.
   */
  private async executeAndPersist(
    job: Job,
    payload: AgentTaskPayload,
    agent: Awaited<ReturnType<AiAgentsRepository['findFirst']>>,
    agentSlug: string,
    prompt: string,
    _sessionId: string
  ): Promise<AiResponse> {
    return this.aiService.runAgentTask({
      tenantId: job.tenantId,
      actorUserId: 'system',
      actorEmail: 'system@auraspear.io',
      agentId: agentSlug,
      agentName: agent?.name ?? agentSlug,
      model: agent?.model ?? 'default',
      prompt,
      soulMd: agent?.soulMd ?? null,
      tools: [],
      connector: payload.connector,
    })
  }

  /**
   * Mark the session as completed when an AiAgent record exists.
   */
  private async finalizeSystemSession(
    agent: Awaited<ReturnType<AiAgentsRepository['findFirst']>>,
    sessionId: string,
    tenantId: string,
    response: AiResponse,
    tokensUsed: number,
    durationMs: number
  ): Promise<void> {
    if (!agent) {
      return
    }

    try {
      await this.repository.markSessionCompleted({
        sessionId,
        agentId: agent.id,
        tenantId,
        output: response.result,
        model: response.model,
        provider: response.provider,
        tokensUsed,
        cost:
          (response.tokensUsed.input / 1000) * AI_COST_PER_1K_INPUT_TOKENS +
          (response.tokensUsed.output / 1000) * AI_COST_PER_1K_OUTPUT_TOKENS,
        durationMs,
      })
    } catch (sessionError) {
      this.logger.warn(
        `Failed to mark session completed: ${sessionError instanceof Error ? sessionError.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Handle session failure by marking it failed and logging the error.
   */
  private async handleSystemSessionFailure(
    agent: Awaited<ReturnType<AiAgentsRepository['findFirst']>>,
    sessionId: string,
    agentSlug: string,
    error: unknown,
    durationMs: number
  ): Promise<void> {
    const message = error instanceof Error ? error.message : 'Unknown error'

    if (agent) {
      try {
        await this.repository.markSessionFailed({
          sessionId,
          errorMessage: message,
          durationMs,
        })
      } catch (sessionError) {
        this.logger.warn(
          `Failed to mark session failed for system agent ${agentSlug}: ${sessionError instanceof Error ? sessionError.message : 'Unknown error'}`
        )
      }
    }

    this.logger.warn(
      `System agent task failed (${agentSlug}): ${message} -- this is non-critical for background tasks`
    )
  }

  private buildSystemPrompt(payload: AgentTaskPayload): string {
    const action = payload.actionType ?? 'execute'
    const source = payload.triggeredBy ?? 'system'
    const context = this.resolveSystemContext(payload, action)
    return `System-triggered ${action} task from ${source}. Context: ${context}. Analyze and provide recommendations.`
  }

  private resolveSourceModule(payload: AgentTaskPayload): string {
    if (payload.alertId) {
      return 'alert'
    }
    if (payload.incidentId) {
      return 'incident'
    }
    if (payload.source) {
      return payload.source
    }
    return 'unknown'
  }

  private resolveSystemContext(payload: AgentTaskPayload, fallbackAction: string): string {
    if (payload.alertId) {
      return `Alert ID: ${String(payload.alertId)}`
    }
    if (payload.incidentId) {
      return `Incident ID: ${String(payload.incidentId)}`
    }
    if (payload.jobId) {
      return `Job ID: ${String(payload.jobId)}`
    }
    return `Action: ${fallbackAction}`
  }
}
