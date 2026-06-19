import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AI_DEFAULT_PROVIDER_KEY } from './agent-config.constants'
import { AgentConfigRepository } from './agent-config.repository'
import {
  buildAgentConfigWithDefaults,
  buildOsintSourceUpdateData,
  buildTokenResetData,
  isValidAgentId,
  redactOsintSource,
} from './agent-config.utilities'
import { BUILTIN_OSINT_SOURCES } from './constants/osint-sources.constants'
import { AiAgentId, ApprovalStatus, AppLogFeature, TokenResetPeriod } from '../../common/enums'
import { BusinessException } from '../../common/exceptions/business.exception'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import { isAfter, nowDate } from '../../common/utils/date-time.utility'
import { encrypt } from '../../common/utils/encryption.utility'
import { validateUrl } from '../../common/utils/ssrf.utility'
import { OsintExecutorService } from '../osint-executor/osint-executor.service'
import type {
  AgentConfigWithDefaults,
  OsintSourceRedacted,
  AiApprovalRequestRecord,
  ResolvedProvider,
  OsintTestResult,
} from './agent-config.types'
import type { CreateOsintSourceDto } from './dto/create-osint-source.dto'
import type { ResolveApprovalDto } from './dto/resolve-approval.dto'
import type { UpdateAgentConfigDto } from './dto/update-agent-config.dto'
import type { UpdateOsintSourceDto } from './dto/update-osint-source.dto'
import type { InputJsonValue } from '@prisma/client/runtime/client'

@Injectable()
export class AgentConfigService {
  private readonly logger = new Logger(AgentConfigService.name)
  private readonly log: ServiceLogger

  constructor(
    private readonly repository: AgentConfigRepository,
    private readonly appLogger: AppLoggerService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => OsintExecutorService))
    private readonly osintExecutorService: OsintExecutorService
  ) {
    this.log = new ServiceLogger(this.appLogger, AppLogFeature.AI_CONFIG, 'AgentConfigService')
  }

  // ─── Agent Configs ──────────────────────────────────────────

  async getAgentConfigs(tenantId: string): Promise<AgentConfigWithDefaults[]> {
    this.logger.log(`getAgentConfigs called for tenant ${tenantId}`)
    const records = await this.repository.findAllAgentConfigs(tenantId)

    const agentIds = Object.values(AiAgentId)
    const configMap = new Map(records.map(record => [record.agentId, record]))

    const result: AgentConfigWithDefaults[] = []
    for (const agentId of agentIds) {
      const record = configMap.get(agentId) ?? null
      result.push(buildAgentConfigWithDefaults(agentId, record))
    }

    this.logger.log(
      `getAgentConfigs completed for tenant ${tenantId}: ${String(result.length)} configs`
    )
    this.log.success('listAgentConfigs', tenantId)

    return result
  }

  async getAgentConfig(tenantId: string, agentId: string): Promise<AgentConfigWithDefaults> {
    this.logger.log(`getAgentConfig called for agent ${agentId} in tenant ${tenantId}`)
    this.validateAgentId(agentId)

    const record = await this.repository.findAgentConfig(tenantId, agentId)

    return buildAgentConfigWithDefaults(agentId as AiAgentId, record)
  }

  async updateAgentConfig(
    tenantId: string,
    agentId: string,
    dto: UpdateAgentConfigDto,
    actor: string
  ): Promise<AgentConfigWithDefaults> {
    this.logger.log(`updateAgentConfig called for agent ${agentId} in tenant ${tenantId}`)
    this.validateAgentId(agentId)

    const updateData: Record<string, unknown> = { ...dto }
    if (dto.triggerConfig) {
      updateData.triggerConfig = dto.triggerConfig as InputJsonValue
    }

    await this.repository.upsertAgentConfig(tenantId, agentId, updateData)

    this.log.success('updateAgentConfig', tenantId, { agentId, actor })

    return this.getAgentConfig(tenantId, agentId)
  }

  async toggleAgent(
    tenantId: string,
    agentId: string,
    enabled: boolean,
    actor: string
  ): Promise<AgentConfigWithDefaults> {
    this.logger.log(
      `toggleAgent called for agent ${agentId} in tenant ${tenantId}: enabled=${String(enabled)}`
    )
    this.validateAgentId(agentId)

    await this.repository.upsertAgentConfig(tenantId, agentId, { isEnabled: enabled })

    this.log.success('toggleAgent', tenantId, { agentId, enabled, actor })

    return this.getAgentConfig(tenantId, agentId)
  }

  async bulkToggleAgents(
    tenantId: string,
    enabled: boolean,
    actor: string
  ): Promise<{ updated: number }> {
    const result = await this.repository.bulkToggleAgents(tenantId, enabled)
    this.log.success('bulkToggleAgents', tenantId, { enabled, actor, updated: result.count })
    return { updated: result.count }
  }

  async bulkToggleOsintSources(tenantId: string, enabled: boolean): Promise<{ updated: number }> {
    const result = await this.repository.bulkToggleOsintSources(tenantId, enabled)
    this.log.success('bulkToggleOsintSources', tenantId, { enabled, updated: result.count })
    return { updated: result.count }
  }

  async resetUsage(
    tenantId: string,
    agentId: string,
    period: TokenResetPeriod,
    actor: string
  ): Promise<AgentConfigWithDefaults> {
    this.logger.log(
      `resetUsage called for agent ${agentId} in tenant ${tenantId}, period=${period}`
    )
    this.validateAgentId(agentId)

    const existing = await this.repository.findAgentConfig(tenantId, agentId)
    if (!existing) {
      throw new BusinessException(404, 'Agent config not found', 'errors.agentConfig.notFound')
    }

    const resetData = buildTokenResetData(period)
    await this.repository.resetTokenCounters(tenantId, agentId, resetData)

    this.log.success('resetUsage', tenantId, { agentId, period, actor })

    return this.getAgentConfig(tenantId, agentId)
  }

  async resolveProviderForAgent(tenantId: string, agentId: string): Promise<ResolvedProvider> {
    this.validateAgentId(agentId)

    const config = await this.repository.findAgentConfig(tenantId, agentId)

    const providerMode = config?.providerMode ?? AI_DEFAULT_PROVIDER_KEY

    if (providerMode === AI_DEFAULT_PROVIDER_KEY) {
      return { mode: AI_DEFAULT_PROVIDER_KEY, connectorId: null, model: null }
    }

    return {
      mode: providerMode,
      connectorId: null,
      model: config?.model ?? null,
    }
  }

  // ─── OSINT Sources ─────────────────────────────────────────

  async listOsintSources(tenantId: string): Promise<OsintSourceRedacted[]> {
    this.logger.log(`listOsintSources called for tenant ${tenantId}`)
    let sources = await this.repository.findAllOsintSources(tenantId)

    // Lazy seed: if no sources exist for this tenant, seed builtins
    if (sources.length === 0) {
      await this.seedBuiltinSources(tenantId)
      sources = await this.repository.findAllOsintSources(tenantId)
    }

    this.logger.log(
      `listOsintSources completed for tenant ${tenantId}: ${String(sources.length)} sources`
    )
    return sources.map(redactOsintSource)
  }

  async seedBuiltinSources(tenantId: string): Promise<void> {
    const existingChecks = await Promise.all(
      BUILTIN_OSINT_SOURCES.map(builtin =>
        this.repository
          .findOsintSourceByTypeAndName(tenantId, builtin.sourceType, builtin.name)
          .then(existing => ({ builtin, existing }))
      )
    )

    const missingSources = existingChecks
      .filter(entry => !entry.existing)
      .map(entry => entry.builtin)

    await Promise.all(
      missingSources.map(builtin =>
        this.repository.createOsintSource({
          tenant: { connect: { id: tenantId } },
          sourceType: builtin.sourceType,
          name: builtin.name,
          isEnabled: false,
          baseUrl: builtin.baseUrl,
          authType: builtin.authType,
          headerName: builtin.headerName ?? null,
          queryParamName: builtin.queryParamName ?? null,
          responsePath: builtin.responsePath ?? null,
          requestMethod: builtin.requestMethod ?? 'GET',
          timeout: 30_000,
        })
      )
    )

    this.log.success('seedBuiltinSources', tenantId)
  }

  async createOsintSource(
    tenantId: string,
    dto: CreateOsintSourceDto,
    actor: string
  ): Promise<OsintSourceRedacted> {
    this.logger.log(`createOsintSource called for tenant ${tenantId} by ${actor}`)
    if (dto.baseUrl) {
      validateUrl(dto.baseUrl)
    }

    const encryptedKey = this.encryptApiKey(dto.apiKey)

    const record = await this.repository.createOsintSource({
      tenant: { connect: { id: tenantId } },
      sourceType: dto.sourceType,
      name: dto.name,
      isEnabled: dto.isEnabled ?? true,
      encryptedApiKey: encryptedKey,
      baseUrl: dto.baseUrl ?? null,
      authType: dto.authType,
      headerName: dto.headerName ?? null,
      queryParamName: dto.queryParamName ?? null,
      responsePath: dto.responsePath ?? null,
      requestMethod: dto.requestMethod ?? 'GET',
      timeout: dto.timeout ?? 30_000,
    })

    this.log.success('createOsintSource', tenantId, {
      sourceId: record.id,
      sourceType: dto.sourceType,
      actor,
    })

    return redactOsintSource(record)
  }

  async updateOsintSource(
    id: string,
    tenantId: string,
    dto: UpdateOsintSourceDto,
    actor: string
  ): Promise<OsintSourceRedacted> {
    this.logger.log(`updateOsintSource called for source ${id} in tenant ${tenantId}`)
    this.validateOsintSourceExists(await this.repository.findOsintSource(id, tenantId))

    if (dto.baseUrl) {
      validateUrl(dto.baseUrl)
    }

    const encryptedKey = dto.apiKey ? this.encryptApiKey(dto.apiKey) : null
    const updateData = buildOsintSourceUpdateData(dto as Record<string, unknown>, encryptedKey)
    const record = await this.repository.updateOsintSource(id, tenantId, updateData)

    this.log.success('updateOsintSource', tenantId, { sourceId: id, actor })

    return redactOsintSource(record)
  }

  async deleteOsintSource(id: string, tenantId: string, actor: string): Promise<void> {
    this.logger.log(`deleteOsintSource called for source ${id} in tenant ${tenantId}`)
    this.validateOsintSourceExists(await this.repository.findOsintSource(id, tenantId))

    await this.repository.deleteOsintSource(id, tenantId)

    this.log.success('deleteOsintSource', tenantId, { sourceId: id, actor })
  }

  async testOsintSource(id: string, tenantId: string, actor: string): Promise<OsintTestResult> {
    this.logger.log(`testOsintSource called for source ${id} in tenant ${tenantId}`)
    return this.osintExecutorService.testSource(id, tenantId, actor)
  }

  // ─── Approvals ─────────────────────────────────────────────

  async createApproval(data: {
    tenantId: string
    agentId: string
    actionType: string
    actionData: Record<string, unknown>
    riskLevel: string
    requestedBy: string
    expiresAt: Date
  }): Promise<AiApprovalRequestRecord> {
    return this.repository.createApproval({
      tenant: { connect: { id: data.tenantId } },
      agentId: data.agentId,
      actionType: data.actionType,
      actionData: data.actionData as never,
      riskLevel: data.riskLevel,
      requestedBy: data.requestedBy,
      expiresAt: data.expiresAt,
    })
  }

  async listApprovals(tenantId: string, status?: string): Promise<AiApprovalRequestRecord[]> {
    this.logger.log(`listApprovals called for tenant ${tenantId}`)
    return this.repository.findAllApprovals(tenantId, status)
  }

  async resolveApproval(
    id: string,
    tenantId: string,
    dto: ResolveApprovalDto,
    actor: string
  ): Promise<AiApprovalRequestRecord> {
    this.logger.log(`resolveApproval called for approval ${id} in tenant ${tenantId}`)
    await this.findAndValidateApproval(id, tenantId)

    const record = await this.repository.updateApprovalStatus(id, tenantId, {
      status: dto.status,
      reviewedBy: actor,
      reviewedAt: nowDate(),
      comment: dto.comment ?? null,
    })

    this.log.success('resolveApproval', tenantId, { approvalId: id, status: dto.status, actor })

    return record
  }

  private async findAndValidateApproval(
    id: string,
    tenantId: string
  ): Promise<AiApprovalRequestRecord> {
    const existing = await this.repository.findApproval(id, tenantId)
    if (!existing) {
      throw new BusinessException(
        404,
        'Approval request not found',
        'errors.agentConfig.approvalNotFound'
      )
    }

    if (existing.status !== ApprovalStatus.PENDING) {
      throw new BusinessException(
        400,
        'Approval already resolved',
        'errors.agentConfig.approvalAlreadyResolved'
      )
    }

    if (isAfter(nowDate(), existing.expiresAt)) {
      throw new BusinessException(400, 'Approval has expired', 'errors.agentConfig.approvalExpired')
    }

    return existing
  }

  // ─── Token Usage Tracking ──────────────────────────────────

  /**
   * Best-effort increment of per-agent token usage counters.
   * Called by AiService after successful AI execution to track
   * hour/day/month consumption against agent quotas.
   */
  async incrementUsage(tenantId: string, agentId: string, tokens: number): Promise<void> {
    try {
      await this.repository.incrementTokenUsage(tenantId, agentId, tokens)
    } catch {
      this.logger.warn(`Failed to increment token usage for agent ${agentId} in tenant ${tenantId}`)
    }
  }

  // ─── Private Helpers ───────────────────────────────────────

  private encryptApiKey(apiKey: string | undefined): string | null {
    if (!apiKey) return null

    const encryptionKey = this.configService.get<string>('CONFIG_ENCRYPTION_KEY')
    if (!encryptionKey) {
      throw new BusinessException(
        500,
        'Encryption key not configured',
        'errors.agentConfig.encryptionKeyMissing'
      )
    }
    return encrypt(apiKey, encryptionKey)
  }

  private validateOsintSourceExists(source: unknown): void {
    if (!source) {
      throw new BusinessException(
        404,
        'OSINT source not found',
        'errors.agentConfig.osintSourceNotFound'
      )
    }
  }

  private validateAgentId(agentId: string): void {
    if (!isValidAgentId(agentId)) {
      throw new BusinessException(400, 'Invalid agent ID', 'errors.agentConfig.invalidAgentId')
    }
  }
}
