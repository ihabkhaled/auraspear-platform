import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ConnectorsRepository } from './connectors.repository'
import {
  buildConnectorStats,
  buildConnectorUpdateData,
  buildNewConnectorResponse,
  extractUrlFields,
  mapConnectorToResponse,
  mergeConfigWithRedacted,
  normalizeConnectorConfig,
  sanitizeErrorDetails,
} from './connectors.utilities'
import { validateConnectorConfig } from './dto/connector.dto'
import { BedrockService } from './services/bedrock.service'
import { GrafanaService } from './services/grafana.service'
import { GraylogService } from './services/graylog.service'
import { InfluxDBService } from './services/influxdb.service'
import { LlmApisService } from './services/llm-apis.service'
import { LogstashService } from './services/logstash.service'
import { MispService } from './services/misp.service'
import { OpenClawGatewayService } from './services/openclaw-gateway.service'
import { ShuffleService } from './services/shuffle.service'
import { VelociraptorService } from './services/velociraptor.service'
import { WazuhService } from './services/wazuh.service'
import { AppLogFeature } from '../../common/enums'
import { BusinessException } from '../../common/exceptions/business.exception'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import { nowDate, nowMs, elapsedMs, toIso } from '../../common/utils/date-time.utility'
import { encrypt, decrypt } from '../../common/utils/encryption.utility'
import { maskSecrets } from '../../common/utils/mask.utility'
import { resolveAndValidateUrl } from '../../common/utils/ssrf.utility'
import type {
  ConnectorResponse,
  ConnectorStats,
  ConnectorTestable,
  ConnectorTestResult as TestResult,
} from './connectors.types'
import type { CreateConnectorDto, UpdateConnectorDto } from './dto/connector.dto'
import type { ConnectorConfig } from '@prisma/client'

@Injectable()
export class ConnectorsService {
  private readonly log: ServiceLogger
  private readonly encryptionKey: string

  private readonly testServiceMap: Map<string, ConnectorTestable>

  constructor(
    private readonly connectorsRepository: ConnectorsRepository,
    private readonly configService: ConfigService,
    private readonly wazuhService: WazuhService,
    private readonly graylogService: GraylogService,
    private readonly logstashService: LogstashService,
    private readonly velociraptorService: VelociraptorService,
    private readonly grafanaService: GrafanaService,
    private readonly influxdbService: InfluxDBService,
    private readonly mispService: MispService,
    private readonly shuffleService: ShuffleService,
    private readonly bedrockService: BedrockService,
    private readonly llmApisService: LlmApisService,
    private readonly openClawGatewayService: OpenClawGatewayService,
    private readonly appLogger: AppLoggerService
  ) {
    this.log = new ServiceLogger(this.appLogger, AppLogFeature.CONNECTORS, 'ConnectorsService')
    this.encryptionKey = this.validateEncryptionKey()
    this.testServiceMap = this.buildTestServiceMap()
  }

  private validateEncryptionKey(): string {
    const key = this.configService.get<string>('CONFIG_ENCRYPTION_KEY')
    if (key?.length !== 64 || !/^[\da-f]+$/i.test(key)) {
      throw new Error('CONFIG_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)')
    }
    return key
  }

  private buildTestServiceMap(): Map<string, ConnectorTestable> {
    return new Map<string, ConnectorTestable>([
      ['wazuh', this.wazuhService],
      ['graylog', this.graylogService],
      ['logstash', this.logstashService],
      ['velociraptor', this.velociraptorService],
      ['grafana', this.grafanaService],
      ['influxdb', this.influxdbService],
      ['misp', this.mispService],
      ['shuffle', this.shuffleService],
      ['bedrock', this.bedrockService],
      ['llm_apis', this.llmApisService],
      ['openclaw_gateway', this.openClawGatewayService],
    ])
  }

  /* ---------------------------------------------------------------- */
  /* FIND ALL                                                          */
  /* ---------------------------------------------------------------- */

  async findAll(tenantId: string): Promise<ConnectorResponse[]> {
    this.log.entry('findAll', tenantId)
    const configs = await this.connectorsRepository.findAllByTenant(tenantId)
    const results = configs.map(c =>
      mapConnectorToResponse(c, e => this.decryptConfig(e), maskSecrets)
    )
    this.log.success('findAll', tenantId, { count: results.length })
    return results
  }

  /* ---------------------------------------------------------------- */
  /* FIND BY TYPE                                                      */
  /* ---------------------------------------------------------------- */

  async findByType(tenantId: string, type: string): Promise<ConnectorResponse> {
    this.log.entry('findByType', tenantId, { connectorType: type })
    const config = await this.findConnectorOrThrow(tenantId, type, 'findByType')
    this.log.success('findByType', tenantId, { connectorType: type })
    return mapConnectorToResponse(config, e => this.decryptConfig(e), maskSecrets)
  }

  async getStats(tenantId: string): Promise<ConnectorStats> {
    this.log.entry('getStats', tenantId)
    const connectors = await this.connectorsRepository.findAllByTenant(tenantId)
    const stats = buildConnectorStats(connectors)

    this.log.success('getStats', tenantId, { ...stats })
    return stats
  }

  /* ---------------------------------------------------------------- */
  /* CREATE                                                            */
  /* ---------------------------------------------------------------- */

  async create(tenantId: string, dto: CreateConnectorDto): Promise<ConnectorResponse> {
    this.log.entry('create', tenantId, { connectorName: dto.name, authType: dto.authType })
    await this.guardDuplicate(tenantId, dto.type)
    const validatedConfig = await this.validateAndSanitizeConfig(
      dto.type,
      dto.config as Record<string, unknown>,
      'create',
      tenantId
    )
    const encryptedConfig = encrypt(JSON.stringify(validatedConfig), this.encryptionKey)

    const config = await this.connectorsRepository.create({
      tenantId,
      type: dto.type as never,
      name: dto.name,
      enabled: dto.enabled,
      authType: dto.authType as never,
      encryptedConfig,
    })

    this.log.success('create', tenantId, {
      connectorName: dto.name,
      authType: dto.authType,
    })
    return buildNewConnectorResponse(config, maskSecrets(validatedConfig))
  }

  /* ---------------------------------------------------------------- */
  /* UPDATE                                                            */
  /* ---------------------------------------------------------------- */

  async update(
    tenantId: string,
    type: string,
    dto: UpdateConnectorDto
  ): Promise<ConnectorResponse> {
    this.log.entry('update', tenantId, { connectorType: type, updatedFields: Object.keys(dto) })
    const existing = await this.findConnectorOrThrow(tenantId, type, 'update')
    const updateData = buildConnectorUpdateData(dto)

    if (dto.config !== undefined) {
      updateData.encryptedConfig = await this.buildMergedEncryptedConfig(
        type,
        dto.config as Record<string, unknown>,
        existing.encryptedConfig,
        tenantId
      )
    }

    const updated = await this.connectorsRepository.updateByTenantAndType(
      tenantId,
      type,
      updateData
    )
    this.log.success('update', tenantId, { connectorType: type, updatedFields: Object.keys(dto) })
    return mapConnectorToResponse(updated, e => this.decryptConfig(e), maskSecrets)
  }

  /* ---------------------------------------------------------------- */
  /* REMOVE                                                            */
  /* ---------------------------------------------------------------- */

  async remove(tenantId: string, type: string): Promise<{ deleted: boolean }> {
    this.log.entry('remove', tenantId, { connectorType: type })
    await this.findConnectorOrThrow(tenantId, type, 'remove')
    await this.connectorsRepository.deleteByTenantAndType(tenantId, type)
    this.log.success('remove', tenantId, { connectorType: type })
    return { deleted: true }
  }

  /* ---------------------------------------------------------------- */
  /* TOGGLE                                                            */
  /* ---------------------------------------------------------------- */

  async toggle(
    tenantId: string,
    type: string,
    enabled: boolean
  ): Promise<{ type: string; enabled: boolean }> {
    this.log.entry('toggle', tenantId, { connectorType: type, enabled })
    await this.connectorsRepository.updateByTenantAndType(tenantId, type, { enabled })
    this.log.success('toggle', tenantId, { connectorType: type, enabled })
    return { type, enabled }
  }

  /* ---------------------------------------------------------------- */
  /* TEST CONNECTION                                                   */
  /* ---------------------------------------------------------------- */

  async testConnection(tenantId: string, type: string): Promise<TestResult> {
    this.log.entry('testConnection', tenantId, { connectorType: type })
    const config = await this.findConnectorOrThrow(tenantId, type, 'testConnection')
    const decryptedConfig = this.decryptConfig(config.encryptedConfig)
    const { ok, details, latencyMs } = await this.runConnectionTest(type, decryptedConfig, tenantId)

    const testedAt = nowDate()
    await this.connectorsRepository.updateByTenantAndType(tenantId, type, {
      lastTestAt: testedAt,
      lastTestOk: ok,
      lastError: ok ? null : details.slice(0, 500),
    })

    if (ok) {
      this.log.success('testConnection', tenantId, { connectorType: type, latencyMs, ok })
    } else {
      this.log.warn('testConnection', tenantId, 'Connection test failed', {
        connectorType: type,
        latencyMs,
        ok,
        details: details.slice(0, 300),
      })
    }
    return { type, ok, latencyMs, details, testedAt: toIso(testedAt) }
  }

  /* ---------------------------------------------------------------- */
  /* PUBLIC: Config Access (used by other modules)                     */
  /* ---------------------------------------------------------------- */

  async getDecryptedConfig(
    tenantId: string,
    type: string
  ): Promise<Record<string, unknown> | null> {
    const config = await this.connectorsRepository.findByTenantAndType(tenantId, type)
    if (!config?.enabled) return null
    this.log.debug('getDecryptedConfig', tenantId, 'Decrypting config', { connectorType: type })
    return this.decryptConfig(config.encryptedConfig)
  }

  async isEnabled(tenantId: string, type: string): Promise<boolean> {
    this.log.debug('isEnabled', tenantId, 'Checking enabled status', { connectorType: type })
    const config = await this.connectorsRepository.findEnabledStatus(tenantId, type)
    return config?.enabled ?? false
  }

  async getEnabledConnectors(tenantId: string): Promise<Array<{ type: string; name: string }>> {
    this.log.debug('getEnabledConnectors', tenantId, 'Fetching enabled connectors')
    const configs = await this.connectorsRepository.findEnabledByTenant(tenantId)
    return configs.map(c => ({ type: c.type, name: c.name }))
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Finders                                                  */
  /* ---------------------------------------------------------------- */

  private async findConnectorOrThrow(
    tenantId: string,
    type: string,
    action: string
  ): Promise<ConnectorConfig> {
    const config = await this.connectorsRepository.findByTenantAndType(tenantId, type)
    if (!config) {
      this.log.warn(action, tenantId, 'Connector not found', { connectorType: type })
      throw new BusinessException(
        404,
        `Connector '${type}' not found`,
        'errors.connectors.notFound'
      )
    }
    return config
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Validation                                               */
  /* ---------------------------------------------------------------- */

  private async guardDuplicate(tenantId: string, type: string): Promise<void> {
    const existing = await this.connectorsRepository.findByTenantAndType(tenantId, type)
    if (existing) {
      this.log.warn('create', tenantId, 'Connector already exists', { connectorType: type })
      throw new BusinessException(
        409,
        `Connector '${type}' already exists`,
        'errors.connectors.alreadyExists'
      )
    }
  }

  private async validateAndSanitizeConfig(
    type: string,
    config: Record<string, unknown>,
    action: string,
    tenantId: string
  ): Promise<Record<string, unknown>> {
    let validated: Record<string, unknown>
    try {
      validated = validateConnectorConfig(type, config)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid connector config'
      this.log.warn(action, tenantId, 'Invalid connector config', {
        connectorType: type,
        error: message,
      })
      throw new BusinessException(
        400,
        `Invalid config for '${type}': ${message}`,
        'errors.connectors.invalidConfig'
      )
    }
    await this.validateConfigUrls(validated)
    return validated
  }

  /**
   * Validates all URL fields in the connector config using DNS-aware SSRF defense.
   * In production, hostnames are resolved to IP addresses and checked against
   * the private IP blocklist to prevent DNS rebinding attacks.
   * Falls back to synchronous validation for basic URL structure checks.
   */
  private async validateConfigUrls(config: Record<string, unknown>): Promise<void> {
    await Promise.all(
      extractUrlFields(config).map(async ({ value }) => resolveAndValidateUrl(value))
    )
  }

  private async buildMergedEncryptedConfig(
    type: string,
    incomingConfig: Record<string, unknown>,
    existingEncrypted: string,
    tenantId: string
  ): Promise<string> {
    const existingDecrypted = this.decryptConfig(existingEncrypted)
    const mergedConfig = mergeConfigWithRedacted(incomingConfig, existingDecrypted)
    const validatedConfig = await this.validateAndSanitizeConfig(
      type,
      mergedConfig,
      'update',
      tenantId
    )
    return encrypt(JSON.stringify(validatedConfig), this.encryptionKey)
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Connection Test Runner                                   */
  /* ---------------------------------------------------------------- */

  private async runConnectionTest(
    type: string,
    config: Record<string, unknown>,
    tenantId: string
  ): Promise<{ ok: boolean; details: string; latencyMs: number }> {
    const start = nowMs()
    const service = this.testServiceMap.get(type)

    if (!service) {
      return {
        ok: false,
        details: `Unknown connector type: ${type}`,
        latencyMs: elapsedMs(start),
      }
    }

    try {
      const { ok, details } = await service.testConnection(config)
      return { ok, details, latencyMs: elapsedMs(start) }
    } catch (error) {
      const details = sanitizeErrorDetails(error)
      this.log.error('runConnectionTest', tenantId, error, {
        connectorType: type,
        latencyMs: elapsedMs(start),
      })
      return { ok: false, details, latencyMs: elapsedMs(start) }
    }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Encryption                                               */
  /* ---------------------------------------------------------------- */

  private decryptConfig(encryptedConfig: string): Record<string, unknown> {
    const config = this.parseOrDecryptConfig(encryptedConfig)
    if (!config) {
      this.log.warn('decryptConfig', '', 'Failed to decrypt connector config, returning empty')
      return {}
    }
    return normalizeConnectorConfig(config)
  }

  private parseOrDecryptConfig(encryptedConfig: string): Record<string, unknown> | null {
    try {
      const raw = JSON.parse(encryptedConfig) as Record<string, unknown>
      if ('placeholder' in raw) return raw
      return raw
    } catch {
      // Not plain JSON — try decrypting
    }

    try {
      const decrypted = decrypt(encryptedConfig, this.encryptionKey)
      return JSON.parse(decrypted) as Record<string, unknown>
    } catch {
      return null
    }
  }
}
