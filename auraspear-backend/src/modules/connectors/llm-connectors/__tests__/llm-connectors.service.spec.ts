import { ConfigService } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { BusinessException } from '../../../../common/exceptions/business.exception'
import { AppLoggerService } from '../../../../common/services/app-logger.service'
import { toDay } from '../../../../common/utils/date-time.utility'
import { LlmApisService } from '../../services/llm-apis.service'
import { REDACTED } from '../llm-connectors.constants'
import { LlmConnectorsRepository } from '../llm-connectors.repository'
import { LlmConnectorsService } from '../llm-connectors.service'
import type { LlmConnector } from '@prisma/client'

/* ---------------------------------------------------------------- */
/* Helper: build a mock LlmConnector record                         */
/* ---------------------------------------------------------------- */

const TENANT_ID = 'tenant-1'
const CONNECTOR_ID = 'conn-1'
const ENCRYPTION_KEY = 'a'.repeat(64)

function buildConnector(overrides?: Partial<LlmConnector>): LlmConnector {
  return {
    id: CONNECTOR_ID,
    tenantId: TENANT_ID,
    name: 'Test LLM',
    description: 'A test connector',
    enabled: true,
    baseUrl: 'https://api.openai.com/v1',
    encryptedApiKey: 'encrypted-key-placeholder',
    defaultModel: 'gpt-4',
    organizationId: 'org-123',
    maxTokensParam: 'max_tokens',
    timeout: 60000,
    lastTestAt: null,
    lastTestOk: null,
    lastError: null,
    createdAt: toDay('2025-01-01T00:00:00.000Z').toDate(),
    updatedAt: toDay('2025-01-02T00:00:00.000Z').toDate(),
    ...overrides,
  }
}

/* ---------------------------------------------------------------- */
/* Mocks                                                             */
/* ---------------------------------------------------------------- */

jest.mock('../../../../common/utils/encryption.utility', () => ({
  encrypt: jest.fn().mockReturnValue('encrypted-value'),
  decrypt: jest.fn().mockReturnValue('decrypted-api-key'),
}))

const { encrypt, decrypt } = jest.requireMock('../../../../common/utils/encryption.utility') as {
  encrypt: jest.Mock
  decrypt: jest.Mock
}

describe('LlmConnectorsService', () => {
  let service: LlmConnectorsService

  const mockRepository = {
    findAllByTenant: jest.fn(),
    findByIdAndTenant: jest.fn(),
    findByNameAndTenant: jest.fn(),
    findEnabledByTenant: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateAndReturn: jest.fn(),
    delete: jest.fn(),
    updateTestResult: jest.fn(),
  }

  const mockConfigService = {
    get: jest.fn().mockReturnValue(ENCRYPTION_KEY),
  }

  const mockLlmApisService = {
    testConnection: jest.fn(),
  }

  const mockAppLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    mockConfigService.get.mockReturnValue(ENCRYPTION_KEY)

    const module = await Test.createTestingModule({
      providers: [
        LlmConnectorsService,
        { provide: LlmConnectorsRepository, useValue: mockRepository },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: LlmApisService, useValue: mockLlmApisService },
        { provide: AppLoggerService, useValue: mockAppLogger },
      ],
    }).compile()

    service = module.get(LlmConnectorsService)
  })

  /* ---------------------------------------------------------------- */
  /* constructor                                                       */
  /* ---------------------------------------------------------------- */

  describe('constructor', () => {
    it('throws if CONFIG_ENCRYPTION_KEY is missing', async () => {
      mockConfigService.get.mockReturnValue(undefined)

      await expect(
        Test.createTestingModule({
          providers: [
            LlmConnectorsService,
            { provide: LlmConnectorsRepository, useValue: mockRepository },
            { provide: ConfigService, useValue: mockConfigService },
            { provide: LlmApisService, useValue: mockLlmApisService },
            { provide: AppLoggerService, useValue: mockAppLogger },
          ],
        }).compile()
      ).rejects.toThrow('CONFIG_ENCRYPTION_KEY must be exactly 64 hex characters')
    })

    it('throws if CONFIG_ENCRYPTION_KEY is not 64 hex chars', async () => {
      mockConfigService.get.mockReturnValue('too-short')

      await expect(
        Test.createTestingModule({
          providers: [
            LlmConnectorsService,
            { provide: LlmConnectorsRepository, useValue: mockRepository },
            { provide: ConfigService, useValue: mockConfigService },
            { provide: LlmApisService, useValue: mockLlmApisService },
            { provide: AppLoggerService, useValue: mockAppLogger },
          ],
        }).compile()
      ).rejects.toThrow('CONFIG_ENCRYPTION_KEY must be exactly 64 hex characters')
    })
  })

  /* ---------------------------------------------------------------- */
  /* list                                                              */
  /* ---------------------------------------------------------------- */

  describe('list', () => {
    it('returns connectors with redacted API keys', async () => {
      const connector = buildConnector()
      mockRepository.findAllByTenant.mockResolvedValue([connector])

      const result = await service.list(TENANT_ID)

      expect(result).toHaveLength(1)
      expect(result[0]?.apiKey).toBe(REDACTED)
      expect(result[0]?.name).toBe('Test LLM')
      expect(result[0]?.id).toBe(CONNECTOR_ID)
      expect(mockRepository.findAllByTenant).toHaveBeenCalledWith(TENANT_ID)
    })

    it('returns empty array when no connectors exist', async () => {
      mockRepository.findAllByTenant.mockResolvedValue([])

      const result = await service.list(TENANT_ID)

      expect(result).toHaveLength(0)
    })

    it('logs success with count', async () => {
      mockRepository.findAllByTenant.mockResolvedValue([buildConnector()])

      await service.list(TENANT_ID)

      expect(mockAppLogger.info).toHaveBeenCalledWith(
        'LlmConnectorsService => list completed',
        expect.objectContaining({
          action: 'list',
          outcome: 'success',
          metadata: expect.objectContaining({ count: 1 }),
        })
      )
    })
  })

  /* ---------------------------------------------------------------- */
  /* create                                                            */
  /* ---------------------------------------------------------------- */

  describe('create', () => {
    const createDto = {
      name: 'New LLM',
      description: 'New connector',
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'sk-test-key',
      defaultModel: 'gpt-4',
      organizationId: undefined,
      maxTokensParam: 'max_tokens',
      timeout: 30000,
    }

    it('encrypts API key, validates unique name, and returns created connector', async () => {
      mockRepository.findByNameAndTenant.mockResolvedValue(null)
      const created = buildConnector({ name: 'New LLM' })
      mockRepository.create.mockResolvedValue(created)

      const result = await service.create(TENANT_ID, createDto, 'admin@test.com')

      expect(encrypt).toHaveBeenCalledWith('sk-test-key', ENCRYPTION_KEY)
      expect(mockRepository.findByNameAndTenant).toHaveBeenCalledWith('New LLM', TENANT_ID)
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT_ID,
          name: 'New LLM',
          encryptedApiKey: 'encrypted-value',
        })
      )
      expect(result.apiKey).toBe(REDACTED)
    })

    it('throws BusinessException when name already exists', async () => {
      mockRepository.findByNameAndTenant.mockResolvedValue(buildConnector())

      await expect(service.create(TENANT_ID, createDto, 'admin@test.com')).rejects.toThrow(
        BusinessException
      )

      await expect(service.create(TENANT_ID, createDto, 'admin@test.com')).rejects.toThrow(
        'already exists'
      )
    })

    it('uses default values for maxTokensParam and timeout when not provided', async () => {
      mockRepository.findByNameAndTenant.mockResolvedValue(null)
      mockRepository.create.mockResolvedValue(buildConnector())

      const dto = {
        name: 'New LLM',
        description: null,
        baseUrl: 'https://api.example.com/v1',
        apiKey: 'sk-test-key',
        defaultModel: null,
        organizationId: undefined,
      }

      await service.create(TENANT_ID, dto as never, 'admin@test.com')

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          maxTokensParam: 'max_tokens',
          timeout: 60000,
        })
      )
    })
  })

  /* ---------------------------------------------------------------- */
  /* update                                                            */
  /* ---------------------------------------------------------------- */

  describe('update', () => {
    it('updates fields and re-encrypts API key if provided', async () => {
      const existing = buildConnector()
      mockRepository.findByIdAndTenant.mockResolvedValue(existing)
      mockRepository.updateAndReturn.mockResolvedValue(buildConnector({ name: 'Updated LLM' }))

      const dto = { name: 'Updated LLM', apiKey: 'new-api-key' }

      const result = await service.update(CONNECTOR_ID, TENANT_ID, dto, 'admin@test.com')

      expect(encrypt).toHaveBeenCalledWith('new-api-key', ENCRYPTION_KEY)
      expect(mockRepository.updateAndReturn).toHaveBeenCalledWith(
        CONNECTOR_ID,
        TENANT_ID,
        expect.objectContaining({
          name: 'Updated LLM',
          encryptedApiKey: 'encrypted-value',
        })
      )
      expect(result.apiKey).toBe(REDACTED)
    })

    it('checks name uniqueness when name is changed', async () => {
      const existing = buildConnector({ name: 'Old Name' })
      mockRepository.findByIdAndTenant.mockResolvedValue(existing)
      mockRepository.findByNameAndTenant.mockResolvedValue(null)
      mockRepository.updateAndReturn.mockResolvedValue(buildConnector({ name: 'New Name' }))

      await service.update(CONNECTOR_ID, TENANT_ID, { name: 'New Name' }, 'admin@test.com')

      expect(mockRepository.findByNameAndTenant).toHaveBeenCalledWith('New Name', TENANT_ID)
    })

    it('skips name uniqueness check when name is unchanged', async () => {
      const existing = buildConnector({ name: 'Same Name' })
      mockRepository.findByIdAndTenant.mockResolvedValue(existing)
      mockRepository.updateAndReturn.mockResolvedValue(existing)

      await service.update(CONNECTOR_ID, TENANT_ID, { name: 'Same Name' }, 'admin@test.com')

      expect(mockRepository.findByNameAndTenant).not.toHaveBeenCalled()
    })

    it('throws BusinessException when connector not found', async () => {
      mockRepository.findByIdAndTenant.mockResolvedValue(null)

      await expect(
        service.update('missing-id', TENANT_ID, { name: 'X' }, 'admin@test.com')
      ).rejects.toThrow(BusinessException)
    })

    it('throws BusinessException when updateAndReturn returns null', async () => {
      mockRepository.findByIdAndTenant.mockResolvedValue(buildConnector())
      mockRepository.updateAndReturn.mockResolvedValue(null)

      await expect(
        service.update(CONNECTOR_ID, TENANT_ID, { name: 'X' }, 'admin@test.com')
      ).rejects.toThrow(BusinessException)
    })
  })

  /* ---------------------------------------------------------------- */
  /* delete                                                            */
  /* ---------------------------------------------------------------- */

  describe('delete', () => {
    it('calls repository delete after finding the connector', async () => {
      mockRepository.findByIdAndTenant.mockResolvedValue(buildConnector())
      mockRepository.delete.mockResolvedValue(undefined)

      const result = await service.delete(CONNECTOR_ID, TENANT_ID, 'admin@test.com')

      expect(result).toEqual({ deleted: true })
      expect(mockRepository.delete).toHaveBeenCalledWith(CONNECTOR_ID, TENANT_ID)
    })

    it('throws BusinessException when connector not found', async () => {
      mockRepository.findByIdAndTenant.mockResolvedValue(null)

      await expect(service.delete('missing-id', TENANT_ID, 'admin@test.com')).rejects.toThrow(
        BusinessException
      )
    })
  })

  /* ---------------------------------------------------------------- */
  /* toggle                                                            */
  /* ---------------------------------------------------------------- */

  describe('toggle', () => {
    it('flips enabled from true to false', async () => {
      mockRepository.findByIdAndTenant.mockResolvedValue(buildConnector({ enabled: true }))
      mockRepository.updateAndReturn.mockResolvedValue(buildConnector({ enabled: false }))

      const result = await service.toggle(CONNECTOR_ID, TENANT_ID, 'admin@test.com')

      expect(result).toEqual({ id: CONNECTOR_ID, enabled: false })
      expect(mockRepository.updateAndReturn).toHaveBeenCalledWith(CONNECTOR_ID, TENANT_ID, {
        enabled: false,
      })
    })

    it('flips enabled from false to true', async () => {
      mockRepository.findByIdAndTenant.mockResolvedValue(buildConnector({ enabled: false }))
      mockRepository.updateAndReturn.mockResolvedValue(buildConnector({ enabled: true }))

      const result = await service.toggle(CONNECTOR_ID, TENANT_ID, 'admin@test.com')

      expect(result).toEqual({ id: CONNECTOR_ID, enabled: true })
      expect(mockRepository.updateAndReturn).toHaveBeenCalledWith(CONNECTOR_ID, TENANT_ID, {
        enabled: true,
      })
    })

    it('throws BusinessException when connector not found', async () => {
      mockRepository.findByIdAndTenant.mockResolvedValue(null)

      await expect(service.toggle('missing-id', TENANT_ID, 'admin@test.com')).rejects.toThrow(
        BusinessException
      )
    })
  })

  /* ---------------------------------------------------------------- */
  /* testConnection                                                    */
  /* ---------------------------------------------------------------- */

  describe('testConnection', () => {
    it('calls LlmApisService.testConnection and updates test results on success', async () => {
      mockRepository.findByIdAndTenant.mockResolvedValue(buildConnector())
      mockLlmApisService.testConnection.mockResolvedValue({
        ok: true,
        details: 'Connected successfully',
      })
      mockRepository.updateTestResult.mockResolvedValue(undefined)

      const result = await service.testConnection(CONNECTOR_ID, TENANT_ID)

      expect(result.ok).toBe(true)
      expect(result.details).toBe('Connected successfully')
      expect(result.id).toBe(CONNECTOR_ID)
      expect(result.testedAt).toBeDefined()
      expect(mockRepository.updateTestResult).toHaveBeenCalledWith(
        CONNECTOR_ID,
        TENANT_ID,
        expect.objectContaining({
          lastTestOk: true,
          lastError: null,
        })
      )
    })

    it('stores error in lastError on failure', async () => {
      mockRepository.findByIdAndTenant.mockResolvedValue(buildConnector())
      mockLlmApisService.testConnection.mockResolvedValue({
        ok: false,
        details: 'Connection refused',
      })
      mockRepository.updateTestResult.mockResolvedValue(undefined)

      const result = await service.testConnection(CONNECTOR_ID, TENANT_ID)

      expect(result.ok).toBe(false)
      expect(result.details).toBe('Connection refused')
      expect(mockRepository.updateTestResult).toHaveBeenCalledWith(
        CONNECTOR_ID,
        TENANT_ID,
        expect.objectContaining({
          lastTestOk: false,
          lastError: 'Connection refused',
        })
      )
    })

    it('handles thrown errors from LlmApisService gracefully', async () => {
      mockRepository.findByIdAndTenant.mockResolvedValue(buildConnector())
      mockLlmApisService.testConnection.mockRejectedValue(new Error('Network error'))
      mockRepository.updateTestResult.mockResolvedValue(undefined)

      const result = await service.testConnection(CONNECTOR_ID, TENANT_ID)

      expect(result.ok).toBe(false)
      expect(result.details).toBe('Network error')
    })

    it('handles non-Error thrown values', async () => {
      mockRepository.findByIdAndTenant.mockResolvedValue(buildConnector())
      mockLlmApisService.testConnection.mockRejectedValue('unknown failure')
      mockRepository.updateTestResult.mockResolvedValue(undefined)

      const result = await service.testConnection(CONNECTOR_ID, TENANT_ID)

      expect(result.ok).toBe(false)
      expect(result.details).toBe('Connection test failed')
    })

    it('throws BusinessException when connector not found', async () => {
      mockRepository.findByIdAndTenant.mockResolvedValue(null)

      await expect(service.testConnection('missing-id', TENANT_ID)).rejects.toThrow(
        BusinessException
      )
    })
  })

  /* ---------------------------------------------------------------- */
  /* getDecryptedConfig                                                */
  /* ---------------------------------------------------------------- */

  describe('getDecryptedConfig', () => {
    it('returns config with decrypted API key for enabled connector', async () => {
      mockRepository.findByIdAndTenant.mockResolvedValue(buildConnector({ enabled: true }))

      const result = await service.getDecryptedConfig(CONNECTOR_ID, TENANT_ID)

      expect(result).not.toBeNull()
      expect(decrypt).toHaveBeenCalled()
      expect(result?.apiKey).toBe('decrypted-api-key')
      expect(result?.baseUrl).toBe('https://api.openai.com/v1')
    })

    it('returns null when connector is not found', async () => {
      mockRepository.findByIdAndTenant.mockResolvedValue(null)

      const result = await service.getDecryptedConfig('missing-id', TENANT_ID)

      expect(result).toBeNull()
    })

    it('returns null when connector is disabled', async () => {
      mockRepository.findByIdAndTenant.mockResolvedValue(buildConnector({ enabled: false }))

      const result = await service.getDecryptedConfig(CONNECTOR_ID, TENANT_ID)

      expect(result).toBeNull()
    })
  })

  /* ---------------------------------------------------------------- */
  /* getEnabledConfigs                                                 */
  /* ---------------------------------------------------------------- */

  describe('getEnabledConfigs', () => {
    it('returns enabled connectors with decrypted configs', async () => {
      const connectors = [
        buildConnector({ id: 'c1', name: 'LLM A' }),
        buildConnector({ id: 'c2', name: 'LLM B' }),
      ]
      mockRepository.findEnabledByTenant.mockResolvedValue(connectors)

      const result = await service.getEnabledConfigs(TENANT_ID)

      expect(result).toHaveLength(2)
      expect(result[0]?.id).toBe('c1')
      expect(result[0]?.name).toBe('LLM A')
      expect(result[0]?.config.apiKey).toBe('decrypted-api-key')
      expect(result[1]?.id).toBe('c2')
    })

    it('returns empty array when no enabled connectors', async () => {
      mockRepository.findEnabledByTenant.mockResolvedValue([])

      const result = await service.getEnabledConfigs(TENANT_ID)

      expect(result).toHaveLength(0)
    })
  })

  /* ---------------------------------------------------------------- */
  /* getEnabledSummariesSafe                                           */
  /* ---------------------------------------------------------------- */

  describe('getEnabledSummariesSafe', () => {
    it('returns enabled summaries normally', async () => {
      mockRepository.findAllByTenant.mockResolvedValue([
        buildConnector({ id: 'c1', name: 'LLM A', enabled: true }),
        buildConnector({ id: 'c2', name: 'LLM B', enabled: false }),
      ])

      const result = await service.getEnabledSummariesSafe(TENANT_ID)

      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe('c1')
    })

    it('returns empty array on error', async () => {
      mockRepository.findAllByTenant.mockRejectedValue(new Error('Table not found'))

      const result = await service.getEnabledSummariesSafe(TENANT_ID)

      expect(result).toEqual([])
    })
  })
})
