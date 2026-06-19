import { Test } from '@nestjs/testing'
import { REDACTED } from '../llm-connectors.constants'
import { LlmConnectorsController } from '../llm-connectors.controller'
import { LlmConnectorsService } from '../llm-connectors.service'
import type { LlmConnectorResponse } from '../llm-connectors.types'

describe('LlmConnectorsController', () => {
  let controller: LlmConnectorsController
  let service: jest.Mocked<LlmConnectorsService>

  const mockService = {
    list: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    testConnection: jest.fn(),
    toggle: jest.fn(),
  }

  const TENANT_ID = 'tenant-1'
  const CONNECTOR_ID = 'conn-1'
  const ACTOR_EMAIL = 'admin@test.com'

  const mockResponse: LlmConnectorResponse = {
    id: CONNECTOR_ID,
    tenantId: TENANT_ID,
    name: 'Test LLM',
    description: 'A test connector',
    enabled: true,
    baseUrl: 'https://api.openai.com/v1',
    apiKey: REDACTED,
    defaultModel: 'gpt-4',
    organizationId: 'org-123',
    maxTokensParam: 'max_tokens',
    timeout: 60000,
    lastTestAt: null,
    lastTestOk: null,
    lastError: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-02T00:00:00.000Z',
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const module = await Test.createTestingModule({
      controllers: [LlmConnectorsController],
      providers: [{ provide: LlmConnectorsService, useValue: mockService }],
    }).compile()

    controller = module.get(LlmConnectorsController)
    service = module.get(LlmConnectorsService) as jest.Mocked<LlmConnectorsService>
  })

  /* ---------------------------------------------------------------- */
  /* GET /                                                             */
  /* ---------------------------------------------------------------- */

  describe('list', () => {
    it('calls service.list and returns connectors', async () => {
      service.list.mockResolvedValue([mockResponse])

      const result = await controller.list(TENANT_ID)

      expect(result).toEqual([mockResponse])
      expect(service.list).toHaveBeenCalledWith(TENANT_ID)
    })

    it('returns empty array when no connectors', async () => {
      service.list.mockResolvedValue([])

      const result = await controller.list(TENANT_ID)

      expect(result).toEqual([])
    })
  })

  /* ---------------------------------------------------------------- */
  /* GET /:id                                                          */
  /* ---------------------------------------------------------------- */

  describe('getById', () => {
    it('calls service.getById with id and tenantId', async () => {
      service.getById.mockResolvedValue(mockResponse)

      const result = await controller.getById(TENANT_ID, CONNECTOR_ID)

      expect(result).toEqual(mockResponse)
      expect(service.getById).toHaveBeenCalledWith(CONNECTOR_ID, TENANT_ID)
    })
  })

  /* ---------------------------------------------------------------- */
  /* POST /                                                            */
  /* ---------------------------------------------------------------- */

  describe('create', () => {
    it('calls service.create with dto, tenantId, and actorEmail', async () => {
      const dto = {
        name: 'New LLM',
        description: 'Test',
        baseUrl: 'https://api.example.com/v1',
        apiKey: 'sk-test',
        defaultModel: 'gpt-4',
        organizationId: undefined,
        maxTokensParam: 'max_tokens',
        timeout: 30000,
      }
      service.create.mockResolvedValue(mockResponse)

      const result = await controller.create(TENANT_ID, ACTOR_EMAIL, dto)

      expect(result).toEqual(mockResponse)
      expect(service.create).toHaveBeenCalledWith(TENANT_ID, dto, ACTOR_EMAIL)
    })
  })

  /* ---------------------------------------------------------------- */
  /* PATCH /:id                                                        */
  /* ---------------------------------------------------------------- */

  describe('update', () => {
    it('calls service.update with id, tenantId, dto, and actorEmail', async () => {
      const dto = { name: 'Updated LLM' }
      service.update.mockResolvedValue({ ...mockResponse, name: 'Updated LLM' })

      const result = await controller.update(TENANT_ID, CONNECTOR_ID, ACTOR_EMAIL, dto)

      expect(result.name).toBe('Updated LLM')
      expect(service.update).toHaveBeenCalledWith(CONNECTOR_ID, TENANT_ID, dto, ACTOR_EMAIL)
    })
  })

  /* ---------------------------------------------------------------- */
  /* DELETE /:id                                                       */
  /* ---------------------------------------------------------------- */

  describe('remove', () => {
    it('calls service.delete with id, tenantId, and actorEmail', async () => {
      service.delete.mockResolvedValue({ deleted: true })

      const result = await controller.remove(TENANT_ID, CONNECTOR_ID, ACTOR_EMAIL)

      expect(result).toEqual({ deleted: true })
      expect(service.delete).toHaveBeenCalledWith(CONNECTOR_ID, TENANT_ID, ACTOR_EMAIL)
    })
  })

  /* ---------------------------------------------------------------- */
  /* POST /:id/test                                                    */
  /* ---------------------------------------------------------------- */

  describe('test', () => {
    it('calls service.testConnection with id and tenantId', async () => {
      const testResult = {
        id: CONNECTOR_ID,
        ok: true,
        details: 'Connected',
        testedAt: '2025-01-01T00:00:00.000Z',
      }
      service.testConnection.mockResolvedValue(testResult)

      const result = await controller.test(TENANT_ID, CONNECTOR_ID)

      expect(result).toEqual(testResult)
      expect(service.testConnection).toHaveBeenCalledWith(CONNECTOR_ID, TENANT_ID)
    })
  })

  /* ---------------------------------------------------------------- */
  /* POST /:id/toggle                                                  */
  /* ---------------------------------------------------------------- */

  describe('toggle', () => {
    it('calls service.toggle with id, tenantId, and actorEmail', async () => {
      service.toggle.mockResolvedValue({ id: CONNECTOR_ID, enabled: false })

      const result = await controller.toggle(TENANT_ID, CONNECTOR_ID, ACTOR_EMAIL)

      expect(result).toEqual({ id: CONNECTOR_ID, enabled: false })
      expect(service.toggle).toHaveBeenCalledWith(CONNECTOR_ID, TENANT_ID, ACTOR_EMAIL)
    })
  })
})
