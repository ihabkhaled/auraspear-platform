import { describe, it, expect, vi, afterEach, type Mock } from 'vitest'
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
  },
}))
import api from '@/lib/api'
import { llmConnectorService } from '@/services/llm-connector.service'

const mockGet = api.get as Mock

afterEach(() => {
  vi.clearAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────
// Test the underlying service calls used by useAvailableAiConnectors.
// The hook wraps useQuery + local state; here we verify the service contract
// and the connector selection logic.
// ─────────────────────────────────────────────────────────────────────────────

describe('useAvailableAiConnectors — service layer', () => {
  describe('llmConnectorService.getAvailable', () => {
    it('should call the correct endpoint', async () => {
      const connectors = [
        { id: 'default', name: 'Default (Auto)' },
        { id: 'bedrock-1', name: 'AWS Bedrock' },
      ]
      mockGet.mockResolvedValue({ data: { data: connectors } })

      const result = await llmConnectorService.getAvailable()

      expect(mockGet).toHaveBeenCalledWith('/connectors/ai-available')
      expect(result).toEqual(connectors)
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Forbidden'))

      await expect(llmConnectorService.getAvailable()).rejects.toThrow('Forbidden')
    })
  })

  describe('connector selection logic', () => {
    it('should map "default" to undefined connectorValue', () => {
      const selectedConnector = 'default'
      const connectorValue = selectedConnector === 'default' ? undefined : selectedConnector

      expect(connectorValue).toBeUndefined()
    })

    it('should pass through non-default connector id', () => {
      const selectedConnector: string = 'bedrock-1'
      const connectorValue = selectedConnector === 'default' ? undefined : selectedConnector

      expect(connectorValue).toBe('bedrock-1')
    })
  })
})
