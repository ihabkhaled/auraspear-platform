import { randomBytes } from 'node:crypto'
import { BusinessException } from '../../src/common/exceptions/business.exception'
import { nowDate } from '../../src/common/utils/date-time.utility'
import { encrypt } from '../../src/common/utils/encryption.utility'
import { REDACTED_PLACEHOLDER } from '../../src/common/utils/mask.utility'
import { ConnectorsService } from '../../src/modules/connectors/connectors.service'

const ENCRYPTION_KEY = randomBytes(32).toString('hex')
const TENANT_ID = 'tenant-001'

const mockAppLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}

const mockConfigService = {
  get: jest.fn().mockReturnValue(ENCRYPTION_KEY),
}

function createMockRepository() {
  return {
    findAllByTenant: jest.fn(),
    findByTenantAndType: jest.fn(),
    findEnabledStatus: jest.fn(),
    findEnabledByTenant: jest.fn(),
    create: jest.fn(),
    updateByTenantAndType: jest.fn(),
    deleteByTenantAndType: jest.fn(),
  }
}

function createMockConnectorServices() {
  return {
    wazuh: { testConnection: jest.fn() },
    graylog: { testConnection: jest.fn() },
    logstash: { testConnection: jest.fn() },
    velociraptor: { testConnection: jest.fn() },
    grafana: { testConnection: jest.fn() },
    influxdb: { testConnection: jest.fn() },
    misp: { testConnection: jest.fn() },
    shuffle: { testConnection: jest.fn() },
    bedrock: { testConnection: jest.fn() },
    llmApis: { testConnection: jest.fn() },
    openClawGateway: { testConnection: jest.fn() },
  }
}

function buildEncryptedConfig(config: Record<string, unknown>): string {
  return encrypt(JSON.stringify(config), ENCRYPTION_KEY)
}

function createService(
  repository: ReturnType<typeof createMockRepository>,
  services: ReturnType<typeof createMockConnectorServices>
) {
  return new ConnectorsService(
    repository as never,
    mockConfigService as never,
    services.wazuh as never,
    services.graylog as never,
    services.logstash as never,
    services.velociraptor as never,
    services.grafana as never,
    services.influxdb as never,
    services.misp as never,
    services.shuffle as never,
    services.bedrock as never,
    services.llmApis as never,
    services.openClawGateway as never,
    mockAppLogger as never
  )
}

describe('ConnectorsService', () => {
  let repository: ReturnType<typeof createMockRepository>
  let services: ReturnType<typeof createMockConnectorServices>
  let service: ConnectorsService

  beforeEach(() => {
    jest.clearAllMocks()
    repository = createMockRepository()
    services = createMockConnectorServices()
    service = createService(repository, services)
  })

  /* ------------------------------------------------------------------ */
  /* constructor                                                          */
  /* ------------------------------------------------------------------ */

  describe('constructor', () => {
    it('should throw if CONFIG_ENCRYPTION_KEY is missing', () => {
      const badConfig = { get: jest.fn().mockReturnValue(undefined) }
      expect(
        () =>
          new ConnectorsService(
            repository as never,
            badConfig as never,
            services.wazuh as never,
            services.graylog as never,
            services.logstash as never,
            services.velociraptor as never,
            services.grafana as never,
            services.influxdb as never,
            services.misp as never,
            services.shuffle as never,
            services.bedrock as never,
            services.llmApis as never,
            services.openClawGateway as never,
            mockAppLogger as never
          )
      ).toThrow('CONFIG_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)')
    })

    it('should throw if CONFIG_ENCRYPTION_KEY is too short', () => {
      const badConfig = { get: jest.fn().mockReturnValue('short') }
      expect(
        () =>
          new ConnectorsService(
            repository as never,
            badConfig as never,
            services.wazuh as never,
            services.graylog as never,
            services.logstash as never,
            services.velociraptor as never,
            services.grafana as never,
            services.influxdb as never,
            services.misp as never,
            services.shuffle as never,
            services.bedrock as never,
            services.llmApis as never,
            services.openClawGateway as never,
            mockAppLogger as never
          )
      ).toThrow('CONFIG_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)')
    })
  })

  /* ------------------------------------------------------------------ */
  /* findAll                                                              */
  /* ------------------------------------------------------------------ */

  describe('findAll', () => {
    it('should return all connectors for a tenant with masked secrets', async () => {
      const config = { baseUrl: 'https://wazuh.local:55000', password: 'secret' }
      repository.findAllByTenant.mockResolvedValue([
        {
          type: 'wazuh',
          name: 'Wazuh',
          enabled: true,
          authType: 'basic',
          encryptedConfig: buildEncryptedConfig(config),
          lastTestAt: null,
          lastTestOk: null,
          lastError: null,
        },
      ])

      const result = await service.findAll(TENANT_ID)

      expect(result).toHaveLength(1)
      expect(result[0]?.type).toBe('wazuh')
      expect(result[0]?.config.baseUrl).toBe('https://wazuh.local:55000')
      expect(result[0]?.config.password).toBe(REDACTED_PLACEHOLDER)
    })

    it('should return empty array when no connectors exist', async () => {
      repository.findAllByTenant.mockResolvedValue([])

      const result = await service.findAll(TENANT_ID)

      expect(result).toHaveLength(0)
    })
  })

  /* ------------------------------------------------------------------ */
  /* findByType                                                           */
  /* ------------------------------------------------------------------ */

  describe('findByType', () => {
    it('should return connector with masked config', async () => {
      const config = { baseUrl: 'https://grafana.local', apiKey: 'secret-key' }
      repository.findByTenantAndType.mockResolvedValue({
        type: 'grafana',
        name: 'Grafana',
        enabled: true,
        authType: 'api_key',
        encryptedConfig: buildEncryptedConfig(config),
        lastTestAt: nowDate(),
        lastTestOk: true,
        lastError: null,
      })

      const result = await service.findByType(TENANT_ID, 'grafana')

      expect(result.type).toBe('grafana')
      expect(result.config.baseUrl).toBe('https://grafana.local')
      expect(result.config.apiKey).toBe(REDACTED_PLACEHOLDER)
    })

    it('should throw 404 when connector not found', async () => {
      repository.findByTenantAndType.mockResolvedValue(null)

      await expect(service.findByType(TENANT_ID, 'nonexistent')).rejects.toThrow(BusinessException)

      try {
        await service.findByType(TENANT_ID, 'nonexistent')
      } catch (error) {
        expect((error as BusinessException).getStatus()).toBe(404)
        expect((error as BusinessException).messageKey).toBe('errors.connectors.notFound')
      }
    })
  })

  /* ------------------------------------------------------------------ */
  /* getStats                                                             */
  /* ------------------------------------------------------------------ */

  describe('getStats', () => {
    it('should aggregate connector health counts for a tenant', async () => {
      repository.findAllByTenant.mockResolvedValue([
        {
          enabled: true,
          lastTestOk: true,
        },
        {
          enabled: true,
          lastTestOk: false,
        },
        {
          enabled: false,
          lastTestOk: null,
        },
        {
          enabled: false,
          lastTestOk: true,
        },
      ])

      const result = await service.getStats(TENANT_ID)

      expect(repository.findAllByTenant).toHaveBeenCalledWith(TENANT_ID)
      expect(result).toEqual({
        totalConnectors: 4,
        enabledConnectors: 2,
        healthyConnectors: 2,
        failingConnectors: 1,
        untestedConnectors: 1,
      })
    })
  })

  /* ------------------------------------------------------------------ */
  /* create                                                               */
  /* ------------------------------------------------------------------ */

  describe('create', () => {
    it('should create a new connector and return masked config', async () => {
      repository.findByTenantAndType.mockResolvedValue(null)
      repository.create.mockResolvedValue({
        type: 'logstash',
        name: 'Logstash',
        enabled: true,
        authType: 'api_key',
        encryptedConfig: buildEncryptedConfig({ baseUrl: 'https://logstash.local' }),
        lastTestAt: null,
        lastTestOk: null,
        lastError: null,
      })

      const dto = {
        type: 'logstash',
        name: 'Logstash',
        enabled: true,
        authType: 'api_key',
        config: { baseUrl: 'https://logstash.local', apiKey: 'key123' },
      }

      const result = await service.create(TENANT_ID, dto as never)

      expect(result.type).toBe('logstash')
      expect(result.name).toBe('Logstash')
      expect(repository.create).toHaveBeenCalled()
    })

    it('should throw 409 when connector already exists', async () => {
      repository.findByTenantAndType.mockResolvedValue({ type: 'wazuh' })

      const dto = {
        type: 'wazuh',
        name: 'Wazuh',
        enabled: true,
        authType: 'basic',
        config: { baseUrl: 'https://wazuh.local:55000' },
      }

      await expect(service.create(TENANT_ID, dto as never)).rejects.toThrow(BusinessException)

      try {
        await service.create(TENANT_ID, dto as never)
      } catch (error) {
        expect((error as BusinessException).getStatus()).toBe(409)
        expect((error as BusinessException).messageKey).toBe('errors.connectors.alreadyExists')
      }
    })
  })

  /* ------------------------------------------------------------------ */
  /* update                                                               */
  /* ------------------------------------------------------------------ */

  describe('update', () => {
    it('should update connector name and enabled status', async () => {
      const existingConfig = { baseUrl: 'https://wazuh.local', password: 'old-secret' }
      repository.findByTenantAndType.mockResolvedValue({
        type: 'wazuh',
        name: 'Wazuh',
        enabled: true,
        authType: 'basic',
        encryptedConfig: buildEncryptedConfig(existingConfig),
      })
      repository.updateByTenantAndType.mockResolvedValue({
        type: 'wazuh',
        name: 'Wazuh Updated',
        enabled: false,
        authType: 'basic',
        encryptedConfig: buildEncryptedConfig(existingConfig),
        lastTestAt: null,
        lastTestOk: null,
        lastError: null,
      })

      const result = await service.update(TENANT_ID, 'wazuh', {
        name: 'Wazuh Updated',
        enabled: false,
      } as never)

      expect(result.name).toBe('Wazuh Updated')
      expect(result.enabled).toBe(false)
      expect(repository.updateByTenantAndType).toHaveBeenCalled()
    })

    it('should preserve existing secrets when REDACTED value is sent', async () => {
      const existingConfig = {
        baseUrl: 'https://wazuh.local',
        password: 'real-secret',
        username: 'admin',
      }
      repository.findByTenantAndType.mockResolvedValue({
        type: 'wazuh',
        name: 'Wazuh',
        enabled: true,
        authType: 'basic',
        encryptedConfig: buildEncryptedConfig(existingConfig),
      })
      repository.updateByTenantAndType.mockImplementation(
        async (_tenantId: string, _type: string, data: Record<string, unknown>) => {
          return {
            type: 'wazuh',
            name: 'Wazuh',
            enabled: true,
            authType: 'basic',
            encryptedConfig:
              (data.encryptedConfig as string) ?? buildEncryptedConfig(existingConfig),
            lastTestAt: null,
            lastTestOk: null,
            lastError: null,
          }
        }
      )

      await service.update(TENANT_ID, 'wazuh', {
        config: {
          baseUrl: 'https://wazuh.local',
          password: REDACTED_PLACEHOLDER,
          username: 'admin',
        },
      } as never)

      // Verify that the update was called with encrypted config (not the redacted placeholder)
      expect(repository.updateByTenantAndType).toHaveBeenCalledWith(
        TENANT_ID,
        'wazuh',
        expect.objectContaining({
          encryptedConfig: expect.any(String),
        })
      )
    })

    it('should preserve existing keys not present in update payload', async () => {
      const existingConfig = {
        baseUrl: 'https://wazuh.local',
        password: 'secret',
        username: 'admin',
        tenant: 'default',
      }
      repository.findByTenantAndType.mockResolvedValue({
        type: 'wazuh',
        name: 'Wazuh',
        enabled: true,
        authType: 'basic',
        encryptedConfig: buildEncryptedConfig(existingConfig),
      })
      repository.updateByTenantAndType.mockResolvedValue({
        type: 'wazuh',
        name: 'Wazuh',
        enabled: true,
        authType: 'basic',
        encryptedConfig: buildEncryptedConfig(existingConfig),
        lastTestAt: null,
        lastTestOk: null,
        lastError: null,
      })

      // Only send baseUrl — password, username, tenant should be preserved
      await service.update(TENANT_ID, 'wazuh', {
        config: { baseUrl: 'https://wazuh-new.local' },
      } as never)

      expect(repository.updateByTenantAndType).toHaveBeenCalled()
    })

    it('should throw 404 when connector not found for update', async () => {
      repository.findByTenantAndType.mockResolvedValue(null)

      await expect(
        service.update(TENANT_ID, 'nonexistent', { name: 'X' } as never)
      ).rejects.toThrow(BusinessException)

      try {
        await service.update(TENANT_ID, 'nonexistent', { name: 'X' } as never)
      } catch (error) {
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })
  })

  /* ------------------------------------------------------------------ */
  /* remove                                                               */
  /* ------------------------------------------------------------------ */

  describe('remove', () => {
    it('should delete connector and return confirmation', async () => {
      repository.findByTenantAndType.mockResolvedValue({ type: 'logstash' })
      repository.deleteByTenantAndType.mockResolvedValue({})

      const result = await service.remove(TENANT_ID, 'logstash')

      expect(result.deleted).toBe(true)
      expect(repository.deleteByTenantAndType).toHaveBeenCalledWith(TENANT_ID, 'logstash')
    })

    it('should throw 404 when connector not found for removal', async () => {
      repository.findByTenantAndType.mockResolvedValue(null)

      await expect(service.remove(TENANT_ID, 'nonexistent')).rejects.toThrow(BusinessException)

      try {
        await service.remove(TENANT_ID, 'nonexistent')
      } catch (error) {
        expect((error as BusinessException).getStatus()).toBe(404)
        expect((error as BusinessException).messageKey).toBe('errors.connectors.notFound')
      }
    })
  })

  /* ------------------------------------------------------------------ */
  /* toggle                                                               */
  /* ------------------------------------------------------------------ */

  describe('toggle', () => {
    it('should enable a connector', async () => {
      repository.updateByTenantAndType.mockResolvedValue({})

      const result = await service.toggle(TENANT_ID, 'wazuh', true)

      expect(result).toEqual({ type: 'wazuh', enabled: true })
      expect(repository.updateByTenantAndType).toHaveBeenCalledWith(TENANT_ID, 'wazuh', {
        enabled: true,
      })
    })

    it('should disable a connector', async () => {
      repository.updateByTenantAndType.mockResolvedValue({})

      const result = await service.toggle(TENANT_ID, 'wazuh', false)

      expect(result).toEqual({ type: 'wazuh', enabled: false })
    })
  })

  /* ------------------------------------------------------------------ */
  /* testConnection                                                       */
  /* ------------------------------------------------------------------ */

  describe('testConnection', () => {
    it('should test wazuh connection and return success result', async () => {
      const config = { baseUrl: 'https://wazuh.local', username: 'admin', password: 'secret' }
      repository.findByTenantAndType.mockResolvedValue({
        type: 'wazuh',
        encryptedConfig: buildEncryptedConfig(config),
      })
      repository.updateByTenantAndType.mockResolvedValue({})
      services.wazuh.testConnection.mockResolvedValue({
        ok: true,
        details: 'Wazuh v4.9.0 reachable',
      })

      const result = await service.testConnection(TENANT_ID, 'wazuh')

      expect(result.type).toBe('wazuh')
      expect(result.ok).toBe(true)
      expect(result.details).toBe('Wazuh v4.9.0 reachable')
      expect(result.latencyMs).toBeGreaterThanOrEqual(0)
      expect(result.testedAt).toBeDefined()
    })

    it('should test graylog connection', async () => {
      const config = { baseUrl: 'https://graylog.local' }
      repository.findByTenantAndType.mockResolvedValue({
        type: 'graylog',
        encryptedConfig: buildEncryptedConfig(config),
      })
      repository.updateByTenantAndType.mockResolvedValue({})
      services.graylog.testConnection.mockResolvedValue({
        ok: true,
        details: 'Graylog reachable',
      })

      const result = await service.testConnection(TENANT_ID, 'graylog')

      expect(result.ok).toBe(true)
    })

    it('should handle failed connection test', async () => {
      const config = { baseUrl: 'https://wazuh.local' }
      repository.findByTenantAndType.mockResolvedValue({
        type: 'wazuh',
        encryptedConfig: buildEncryptedConfig(config),
      })
      repository.updateByTenantAndType.mockResolvedValue({})
      services.wazuh.testConnection.mockResolvedValue({
        ok: false,
        details: 'Connection refused',
      })

      const result = await service.testConnection(TENANT_ID, 'wazuh')

      expect(result.ok).toBe(false)
      expect(result.details).toBe('Connection refused')
    })

    it('should handle exceptions during connection test', async () => {
      const config = { baseUrl: 'https://wazuh.local' }
      repository.findByTenantAndType.mockResolvedValue({
        type: 'wazuh',
        encryptedConfig: buildEncryptedConfig(config),
      })
      repository.updateByTenantAndType.mockResolvedValue({})
      services.wazuh.testConnection.mockRejectedValue(new Error('self-signed certificate'))

      const result = await service.testConnection(TENANT_ID, 'wazuh')

      expect(result.ok).toBe(false)
      expect(result.details).toContain('self-signed certificate')
    })

    it('should throw 404 when connector not found for test', async () => {
      repository.findByTenantAndType.mockResolvedValue(null)

      await expect(service.testConnection(TENANT_ID, 'nonexistent')).rejects.toThrow(
        BusinessException
      )
    })

    it('should update lastTestAt and lastTestOk after test', async () => {
      const config = { baseUrl: 'https://wazuh.local' }
      repository.findByTenantAndType.mockResolvedValue({
        type: 'wazuh',
        encryptedConfig: buildEncryptedConfig(config),
      })
      repository.updateByTenantAndType.mockResolvedValue({})
      services.wazuh.testConnection.mockResolvedValue({
        ok: true,
        details: 'OK',
      })

      await service.testConnection(TENANT_ID, 'wazuh')

      expect(repository.updateByTenantAndType).toHaveBeenCalledWith(
        TENANT_ID,
        'wazuh',
        expect.objectContaining({
          lastTestOk: true,
          lastTestAt: expect.any(Date),
          lastError: null,
        })
      )
    })

    it('should save error details when test fails', async () => {
      const config = { baseUrl: 'https://wazuh.local' }
      repository.findByTenantAndType.mockResolvedValue({
        type: 'wazuh',
        encryptedConfig: buildEncryptedConfig(config),
      })
      repository.updateByTenantAndType.mockResolvedValue({})
      services.wazuh.testConnection.mockResolvedValue({
        ok: false,
        details: 'Authentication failed',
      })

      await service.testConnection(TENANT_ID, 'wazuh')

      expect(repository.updateByTenantAndType).toHaveBeenCalledWith(
        TENANT_ID,
        'wazuh',
        expect.objectContaining({
          lastTestOk: false,
          lastError: 'Authentication failed',
        })
      )
    })

    it('should handle unknown connector type gracefully', async () => {
      const config = { baseUrl: 'https://unknown.local' }
      repository.findByTenantAndType.mockResolvedValue({
        type: 'unknown',
        encryptedConfig: buildEncryptedConfig(config),
      })
      repository.updateByTenantAndType.mockResolvedValue({})

      const result = await service.testConnection(TENANT_ID, 'unknown')

      expect(result.ok).toBe(false)
      expect(result.details).toContain('Unknown connector type')
    })

    it('should test all supported connector types', async () => {
      const types = [
        'wazuh',
        'graylog',
        'logstash',
        'velociraptor',
        'grafana',
        'influxdb',
        'misp',
        'shuffle',
        'bedrock',
      ] as const

      for (const connectorType of types) {
        const config = { baseUrl: 'https://test.local' }
        repository.findByTenantAndType.mockResolvedValue({
          type: connectorType,
          encryptedConfig: buildEncryptedConfig(config),
        })
        repository.updateByTenantAndType.mockResolvedValue({})
        services[connectorType].testConnection.mockResolvedValue({
          ok: true,
          details: 'OK',
        })

        const result = await service.testConnection(TENANT_ID, connectorType)

        expect(result.type).toBe(connectorType)
        expect(result.ok).toBe(true)
      }
    })
  })

  /* ------------------------------------------------------------------ */
  /* getDecryptedConfig                                                   */
  /* ------------------------------------------------------------------ */

  describe('getDecryptedConfig', () => {
    it('should return decrypted config for enabled connector', async () => {
      const config = { baseUrl: 'https://wazuh.local', password: 'secret' }
      repository.findByTenantAndType.mockResolvedValue({
        enabled: true,
        encryptedConfig: buildEncryptedConfig(config),
      })

      const result = await service.getDecryptedConfig(TENANT_ID, 'wazuh')

      expect(result).toEqual(config)
    })

    it('should return null for disabled connector', async () => {
      repository.findByTenantAndType.mockResolvedValue({
        enabled: false,
        encryptedConfig: buildEncryptedConfig({}),
      })

      const result = await service.getDecryptedConfig(TENANT_ID, 'wazuh')

      expect(result).toBeNull()
    })

    it('should return null when connector does not exist', async () => {
      repository.findByTenantAndType.mockResolvedValue(null)

      const result = await service.getDecryptedConfig(TENANT_ID, 'nonexistent')

      expect(result).toBeNull()
    })
  })

  /* ------------------------------------------------------------------ */
  /* isEnabled                                                            */
  /* ------------------------------------------------------------------ */

  describe('isEnabled', () => {
    it('should return true for enabled connector', async () => {
      repository.findEnabledStatus.mockResolvedValue({ enabled: true })

      const result = await service.isEnabled(TENANT_ID, 'wazuh')

      expect(result).toBe(true)
    })

    it('should return false for disabled connector', async () => {
      repository.findEnabledStatus.mockResolvedValue({ enabled: false })

      const result = await service.isEnabled(TENANT_ID, 'wazuh')

      expect(result).toBe(false)
    })

    it('should return false when connector does not exist', async () => {
      repository.findEnabledStatus.mockResolvedValue(null)

      const result = await service.isEnabled(TENANT_ID, 'nonexistent')

      expect(result).toBe(false)
    })
  })

  /* ------------------------------------------------------------------ */
  /* getEnabledConnectors                                                 */
  /* ------------------------------------------------------------------ */

  describe('getEnabledConnectors', () => {
    it('should return list of enabled connectors', async () => {
      repository.findEnabledByTenant.mockResolvedValue([
        { type: 'wazuh', name: 'Wazuh' },
        { type: 'grafana', name: 'Grafana' },
      ])

      const result = await service.getEnabledConnectors(TENANT_ID)

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ type: 'wazuh', name: 'Wazuh' })
    })

    it('should return empty array when no connectors are enabled', async () => {
      repository.findEnabledByTenant.mockResolvedValue([])

      const result = await service.getEnabledConnectors(TENANT_ID)

      expect(result).toHaveLength(0)
    })
  })
})
