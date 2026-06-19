import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { REDACTED } from './llm-connectors.constants'
import { LlmConnectorsRepository } from './llm-connectors.repository'
import { AppLogFeature } from '../../../common/enums'
import { BusinessException } from '../../../common/exceptions/business.exception'
import { AppLoggerService } from '../../../common/services/app-logger.service'
import { ServiceLogger } from '../../../common/services/service-logger'
import { nowDate, nowMs, elapsedMs, toIso } from '../../../common/utils/date-time.utility'
import { decrypt, encrypt } from '../../../common/utils/encryption.utility'
import { buildLlmConnectorUpdateData } from '../connectors.utilities'
import { LlmApisService } from '../services/llm-apis.service'
import type { CreateLlmConnectorDto } from './dto/create-llm-connector.dto'
import type { UpdateLlmConnectorDto } from './dto/update-llm-connector.dto'
import type { LlmConnectorEnabledConfig, LlmConnectorResponse } from './llm-connectors.types'
import type { LlmConnector } from '@prisma/client'

@Injectable()
export class LlmConnectorsService {
  private readonly log: ServiceLogger
  private readonly encryptionKey: string

  constructor(
    private readonly repository: LlmConnectorsRepository,
    private readonly configService: ConfigService,
    private readonly llmApisService: LlmApisService,
    private readonly appLogger: AppLoggerService
  ) {
    this.log = new ServiceLogger(this.appLogger, AppLogFeature.CONNECTORS, 'LlmConnectorsService')
    const key = this.configService.get<string>('CONFIG_ENCRYPTION_KEY')
    if (key?.length !== 64 || !/^[\da-f]+$/i.test(key)) {
      throw new Error('CONFIG_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)')
    }
    this.encryptionKey = key
  }

  /* ---------------------------------------------------------------- */
  /* LIST                                                              */
  /* ---------------------------------------------------------------- */

  async list(tenantId: string): Promise<LlmConnectorResponse[]> {
    this.log.entry('list', tenantId)
    const connectors = await this.repository.findAllByTenant(tenantId)
    this.log.success('list', tenantId, { count: connectors.length })
    return connectors.map(c => this.toResponse(c))
  }

  /* ---------------------------------------------------------------- */
  /* GET BY ID                                                         */
  /* ---------------------------------------------------------------- */

  async getById(id: string, tenantId: string): Promise<LlmConnectorResponse> {
    this.log.entry('getById', tenantId, { resourceId: id })
    const connector = await this.findOrThrow(id, tenantId, 'getById')
    this.log.success('getById', tenantId, { resourceId: id })
    return this.toResponse(connector)
  }

  /* ---------------------------------------------------------------- */
  /* CREATE                                                            */
  /* ---------------------------------------------------------------- */

  async create(
    tenantId: string,
    dto: CreateLlmConnectorDto,
    actorEmail: string
  ): Promise<LlmConnectorResponse> {
    this.log.entry('create', tenantId, { name: dto.name, actorEmail })
    await this.guardUniqueName(tenantId, dto.name)

    const encryptedApiKey = encrypt(dto.apiKey, this.encryptionKey)

    const connector = await this.repository.create({
      tenantId,
      name: dto.name,
      description: dto.description,
      baseUrl: dto.baseUrl,
      encryptedApiKey,
      defaultModel: dto.defaultModel,
      organizationId: dto.organizationId,
      maxTokensParam: dto.maxTokensParam ?? 'max_tokens',
      timeout: dto.timeout ?? 60000,
    })

    this.log.success('create', tenantId, {
      resourceId: connector.id,
      name: dto.name,
      actorEmail,
    })
    return this.toResponse(connector)
  }

  /* ---------------------------------------------------------------- */
  /* UPDATE                                                            */
  /* ---------------------------------------------------------------- */

  async update(
    id: string,
    tenantId: string,
    dto: UpdateLlmConnectorDto,
    actorEmail: string
  ): Promise<LlmConnectorResponse> {
    this.log.entry('update', tenantId, {
      resourceId: id,
      updatedFields: Object.keys(dto),
      actorEmail,
    })
    const existing = await this.findOrThrow(id, tenantId, 'update')

    if (dto.name !== undefined && dto.name !== existing.name) {
      await this.guardUniqueName(tenantId, dto.name, id)
    }

    const updateData = buildLlmConnectorUpdateData(dto, value => encrypt(value, this.encryptionKey))

    const updated = await this.repository.updateAndReturn(id, tenantId, updateData)
    if (!updated) {
      throw new BusinessException(404, 'LLM connector not found', 'errors.llmConnectors.notFound')
    }

    this.log.success('update', tenantId, {
      resourceId: id,
      updatedFields: Object.keys(dto),
      actorEmail,
    })
    return this.toResponse(updated)
  }

  /* ---------------------------------------------------------------- */
  /* DELETE                                                            */
  /* ---------------------------------------------------------------- */

  async delete(id: string, tenantId: string, actorEmail: string): Promise<{ deleted: boolean }> {
    this.log.entry('delete', tenantId, { resourceId: id, actorEmail })
    await this.findOrThrow(id, tenantId, 'delete')
    await this.repository.delete(id, tenantId)

    this.log.success('delete', tenantId, { resourceId: id, actorEmail })
    return { deleted: true }
  }

  /* ---------------------------------------------------------------- */
  /* TOGGLE                                                            */
  /* ---------------------------------------------------------------- */

  async toggle(
    id: string,
    tenantId: string,
    actorEmail: string
  ): Promise<{ id: string; enabled: boolean }> {
    this.log.entry('toggle', tenantId, { resourceId: id, actorEmail })
    const existing = await this.findOrThrow(id, tenantId, 'toggle')
    const newEnabled = !existing.enabled

    await this.repository.updateAndReturn(id, tenantId, { enabled: newEnabled })

    this.log.success('toggle', tenantId, { resourceId: id, enabled: newEnabled, actorEmail })
    return { id, enabled: newEnabled }
  }

  /* ---------------------------------------------------------------- */
  /* TEST CONNECTION                                                   */
  /* ---------------------------------------------------------------- */

  async testConnection(
    id: string,
    tenantId: string
  ): Promise<{ id: string; ok: boolean; details: string; testedAt: string }> {
    this.log.entry('testConnection', tenantId, { resourceId: id })
    const connector = await this.findOrThrow(id, tenantId, 'testConnection')
    const config = this.buildDecryptedConfig(connector)
    const { ok, details, latencyMs } = await this.executeTest(connector.name, config)

    const testedAt = nowDate()
    await this.persistTestResult(id, tenantId, ok, details, testedAt)

    if (ok) {
      this.log.success('testConnection', tenantId, { resourceId: id, latencyMs, ok })
    } else {
      this.log.warn('testConnection', tenantId, 'Connection test failed', {
        resourceId: id,
        latencyMs,
        ok,
        details: details.slice(0, 300),
      })
    }

    return { id, ok, details, testedAt: toIso(testedAt) }
  }

  private async executeTest(
    connectorName: string,
    config: Record<string, unknown>
  ): Promise<{ ok: boolean; details: string; latencyMs: number }> {
    const start = nowMs()
    try {
      const result = await this.llmApisService.testConnection(config)
      return { ok: result.ok, details: result.details, latencyMs: elapsedMs(start) }
    } catch (error) {
      const details = error instanceof Error ? error.message : 'Connection test failed'
      this.log.warn('executeTest', '', `LLM connector test failed for ${connectorName}`, {
        connectorName,
        error: details,
      })
      return { ok: false, details, latencyMs: elapsedMs(start) }
    }
  }

  private async persistTestResult(
    id: string,
    tenantId: string,
    ok: boolean,
    details: string,
    testedAt: Date
  ): Promise<void> {
    await this.repository.updateTestResult(id, tenantId, {
      lastTestAt: testedAt,
      lastTestOk: ok,
      lastError: ok ? null : details.slice(0, 500),
    })
  }

  /* ---------------------------------------------------------------- */
  /* PUBLIC: Decrypted Config (for AI service)                         */
  /* ---------------------------------------------------------------- */

  async getDecryptedConfig(id: string, tenantId: string): Promise<Record<string, unknown> | null> {
    this.log.debug('getDecryptedConfig', tenantId, 'Decrypting LLM connector config', {
      resourceId: id,
    })
    const connector = await this.repository.findByIdAndTenant(id, tenantId)
    if (!connector?.enabled) return null
    return this.buildDecryptedConfig(connector)
  }

  /* ---------------------------------------------------------------- */
  /* PUBLIC: Enabled Configs (for AI service)                          */
  /* ---------------------------------------------------------------- */

  async getEnabledConfigs(tenantId: string): Promise<LlmConnectorEnabledConfig[]> {
    this.log.debug('getEnabledConfigs', tenantId, 'Fetching enabled LLM configs')
    const connectors = await this.repository.findEnabledByTenant(tenantId)
    return connectors.map(c => ({
      id: c.id,
      name: c.name,
      config: this.buildDecryptedConfig(c),
    }))
  }

  /* ---------------------------------------------------------------- */
  /* PUBLIC: Has any enabled (for AI gate check)                       */
  /* ---------------------------------------------------------------- */

  async hasEnabledConnectors(tenantId: string): Promise<boolean> {
    this.log.debug('hasEnabledConnectors', tenantId, 'Checking for enabled LLM connectors')
    const connectors = await this.repository.findEnabledByTenant(tenantId)
    return connectors.length > 0
  }

  /* ---------------------------------------------------------------- */
  /* PUBLIC: Get all for AI available list                              */
  /* ---------------------------------------------------------------- */

  async getEnabledSummaries(
    tenantId: string
  ): Promise<Array<{ id: string; name: string; enabled: boolean }>> {
    this.log.debug('getEnabledSummaries', tenantId, 'Fetching enabled LLM summaries')
    const connectors = await this.repository.findAllByTenant(tenantId)
    return connectors
      .filter(c => c.enabled)
      .map(c => ({ id: c.id, name: c.name, enabled: c.enabled }))
  }

  /**
   * Like getEnabledSummaries but returns an empty array on error
   * (e.g. if the LlmConnector table does not exist yet).
   */
  async getEnabledSummariesSafe(
    tenantId: string
  ): Promise<Array<{ id: string; name: string; enabled: boolean }>> {
    try {
      return await this.getEnabledSummaries(tenantId)
    } catch {
      return []
    }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Helpers                                                   */
  /* ---------------------------------------------------------------- */

  private async findOrThrow(id: string, tenantId: string, action: string): Promise<LlmConnector> {
    const connector = await this.repository.findByIdAndTenant(id, tenantId)
    if (!connector) {
      this.log.warn(action, tenantId, 'LLM connector not found', { resourceId: id })
      throw new BusinessException(404, 'LLM connector not found', 'errors.llmConnectors.notFound')
    }
    return connector
  }

  private async guardUniqueName(tenantId: string, name: string, excludeId?: string): Promise<void> {
    const existing = await this.repository.findByNameAndTenant(name, tenantId)
    if (existing && existing.id !== excludeId) {
      throw new BusinessException(
        409,
        `LLM connector with name "${name}" already exists`,
        'errors.llmConnectors.nameExists'
      )
    }
  }

  private buildDecryptedConfig(connector: LlmConnector): Record<string, unknown> {
    let apiKey: string
    try {
      apiKey = decrypt(connector.encryptedApiKey, this.encryptionKey)
    } catch {
      this.log.warn('buildDecryptedConfig', connector.tenantId, 'Failed to decrypt API key', {
        resourceId: connector.id,
      })
      apiKey = ''
    }

    return {
      baseUrl: connector.baseUrl,
      apiKey,
      defaultModel: connector.defaultModel,
      organizationId: connector.organizationId,
      maxTokensParameter: connector.maxTokensParam,
      timeout: connector.timeout,
    }
  }

  private toResponse(connector: LlmConnector): LlmConnectorResponse {
    return {
      id: connector.id,
      tenantId: connector.tenantId,
      name: connector.name,
      description: connector.description,
      enabled: connector.enabled,
      baseUrl: connector.baseUrl,
      apiKey: REDACTED,
      defaultModel: connector.defaultModel,
      organizationId: connector.organizationId,
      maxTokensParam: connector.maxTokensParam,
      timeout: connector.timeout,
      lastTestAt: connector.lastTestAt ? toIso(connector.lastTestAt) : null,
      lastTestOk: connector.lastTestOk,
      lastError: connector.lastError,
      createdAt: toIso(connector.createdAt),
      updatedAt: toIso(connector.updatedAt),
    }
  }
}
