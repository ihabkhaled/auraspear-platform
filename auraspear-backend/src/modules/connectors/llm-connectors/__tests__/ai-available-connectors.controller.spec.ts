import { Test } from '@nestjs/testing'
import { ConnectorsService } from '../../connectors.service'
import { AiAvailableConnectorsController } from '../ai-available-connectors.controller'
import { LlmConnectorsService } from '../llm-connectors.service'
import type { AiAvailableConnector } from '../llm-connectors.types'

describe('AiAvailableConnectorsController', () => {
  let controller: AiAvailableConnectorsController

  const mockConnectorsService = {
    isEnabled: jest.fn(),
  }

  const mockLlmConnectorsService = {
    getEnabledSummariesSafe: jest.fn(),
  }

  const TENANT_ID = 'tenant-1'

  beforeEach(async () => {
    jest.clearAllMocks()

    const module = await Test.createTestingModule({
      controllers: [AiAvailableConnectorsController],
      providers: [
        { provide: ConnectorsService, useValue: mockConnectorsService },
        { provide: LlmConnectorsService, useValue: mockLlmConnectorsService },
      ],
    }).compile()

    controller = module.get(AiAvailableConnectorsController)
  })

  /* ---------------------------------------------------------------- */
  /* GET /ai-connectors/ai-available                                   */
  /* ---------------------------------------------------------------- */

  describe('getAiAvailable', () => {
    it('returns default + fixed + dynamic connectors', async () => {
      mockConnectorsService.isEnabled
        .mockResolvedValueOnce(true) // bedrock
        .mockResolvedValueOnce(false) // llm_apis
        .mockResolvedValueOnce(true) // openclaw_gateway

      mockLlmConnectorsService.getEnabledSummariesSafe.mockResolvedValue([
        { id: 'dyn-1', name: 'Custom GPT', enabled: true },
        { id: 'dyn-2', name: 'Local LLaMA', enabled: true },
      ])

      const result = await controller.getAiAvailable(TENANT_ID)

      // Should have: 1 default + 3 fixed + 2 dynamic = 6 total
      expect(result).toHaveLength(6)

      // First entry is always the default system connector
      expect(result[0]).toEqual({
        key: 'default',
        label: 'Default (Auto)',
        type: 'system',
        enabled: true,
      })

      // Fixed connectors
      const fixedConnectors = result.filter((c: AiAvailableConnector) => c.type === 'fixed')
      expect(fixedConnectors).toHaveLength(3)

      // Bedrock is enabled
      const bedrock = fixedConnectors.find((c: AiAvailableConnector) => c.label === 'AWS Bedrock')
      expect(bedrock?.enabled).toBe(true)

      // LLM APIs is disabled
      const llmApis = fixedConnectors.find(
        (c: AiAvailableConnector) => c.label === 'LLM APIs (Legacy)'
      )
      expect(llmApis?.enabled).toBe(false)

      // OpenClaw is enabled
      const openClaw = fixedConnectors.find(
        (c: AiAvailableConnector) => c.label === 'OpenClaw Gateway'
      )
      expect(openClaw?.enabled).toBe(true)

      // Dynamic connectors
      const dynamicConnectors = result.filter((c: AiAvailableConnector) => c.type === 'dynamic')
      expect(dynamicConnectors).toHaveLength(2)
      expect(dynamicConnectors[0]?.label).toBe('Custom GPT')
      expect(dynamicConnectors[1]?.label).toBe('Local LLaMA')
    })

    it('returns empty dynamic list when service returns empty', async () => {
      mockConnectorsService.isEnabled.mockResolvedValue(false)
      mockLlmConnectorsService.getEnabledSummariesSafe.mockResolvedValue([])

      const result = await controller.getAiAvailable(TENANT_ID)

      // 1 default + 3 fixed + 0 dynamic = 4
      expect(result).toHaveLength(4)

      const dynamicConnectors = result.filter((c: AiAvailableConnector) => c.type === 'dynamic')
      expect(dynamicConnectors).toHaveLength(0)
    })

    it('fixed connectors show correct enabled status when all disabled', async () => {
      mockConnectorsService.isEnabled.mockResolvedValue(false)
      mockLlmConnectorsService.getEnabledSummariesSafe.mockResolvedValue([])

      const result = await controller.getAiAvailable(TENANT_ID)

      const fixedConnectors = result.filter((c: AiAvailableConnector) => c.type === 'fixed')

      for (const connector of fixedConnectors) {
        expect(connector.enabled).toBe(false)
      }
    })

    it('fixed connectors show correct enabled status when all enabled', async () => {
      mockConnectorsService.isEnabled.mockResolvedValue(true)
      mockLlmConnectorsService.getEnabledSummariesSafe.mockResolvedValue([])

      const result = await controller.getAiAvailable(TENANT_ID)

      const fixedConnectors = result.filter((c: AiAvailableConnector) => c.type === 'fixed')

      for (const connector of fixedConnectors) {
        expect(connector.enabled).toBe(true)
      }
    })

    it('always includes the default system connector', async () => {
      mockConnectorsService.isEnabled.mockResolvedValue(false)
      mockLlmConnectorsService.getEnabledSummariesSafe.mockResolvedValue([])

      const result = await controller.getAiAvailable(TENANT_ID)

      const systemConnectors = result.filter((c: AiAvailableConnector) => c.type === 'system')
      expect(systemConnectors).toHaveLength(1)
      expect(systemConnectors[0]?.key).toBe('default')
      expect(systemConnectors[0]?.enabled).toBe(true)
    })

    it('calls connectorsService.isEnabled for each fixed connector type', async () => {
      mockConnectorsService.isEnabled.mockResolvedValue(false)
      mockLlmConnectorsService.getEnabledSummariesSafe.mockResolvedValue([])

      await controller.getAiAvailable(TENANT_ID)

      expect(mockConnectorsService.isEnabled).toHaveBeenCalledTimes(3)
      expect(mockConnectorsService.isEnabled).toHaveBeenCalledWith(TENANT_ID, 'bedrock')
      expect(mockConnectorsService.isEnabled).toHaveBeenCalledWith(TENANT_ID, 'llm_apis')
      expect(mockConnectorsService.isEnabled).toHaveBeenCalledWith(TENANT_ID, 'openclaw_gateway')
    })
  })
})
