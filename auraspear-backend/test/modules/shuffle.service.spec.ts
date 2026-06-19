import { ShuffleService } from '../../src/modules/connectors/services/shuffle.service'
import type { AxiosService } from '../../src/common/modules/axios/axios.service'

const mockAxiosService = {
  fetch: jest.fn(),
  basicAuth: jest.fn(),
}

const mockAppLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}

function createService(): ShuffleService {
  return new ShuffleService(mockAppLogger as never, mockAxiosService as unknown as AxiosService)
}

const VALID_CONFIG: Record<string, unknown> = {
  webhookUrl: 'https://shuffle.local',
  apiKey: 'shuffle-api-key-abc',
  verifyTls: true,
}

describe('ShuffleService', () => {
  let service: ShuffleService

  beforeEach(() => {
    jest.clearAllMocks()
    service = createService()
  })

  /* ------------------------------------------------------------------ */
  /* testConnection                                                      */
  /* ------------------------------------------------------------------ */

  describe('testConnection', () => {
    it('should return ok: true when Shuffle is reachable', async () => {
      mockAxiosService.fetch.mockResolvedValue({
        status: 200,
        data: { success: true },
        headers: {},
        latencyMs: 35,
      })

      const result = await service.testConnection(VALID_CONFIG)

      expect(result.ok).toBe(true)
      expect(result.details).toContain('Shuffle SOAR reachable')
      expect(result.details).toContain('shuffle.local')
      expect(mockAxiosService.fetch).toHaveBeenCalledWith(
        'https://shuffle.local/api/v1/apps/authentication',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer shuffle-api-key-abc',
          }),
        })
      )
    })

    it('should accept baseUrl as alternative to webhookUrl', async () => {
      mockAxiosService.fetch.mockResolvedValue({
        status: 200,
        data: {},
        headers: {},
        latencyMs: 10,
      })

      const config = { baseUrl: 'https://shuffle-alt.local', apiKey: 'key' }
      const result = await service.testConnection(config)

      expect(result.ok).toBe(true)
      expect(mockAxiosService.fetch).toHaveBeenCalledWith(
        'https://shuffle-alt.local/api/v1/apps/authentication',
        expect.objectContaining({})
      )
    })

    it('should return error when Shuffle URL is not configured', async () => {
      const result = await service.testConnection({ apiKey: 'key' })

      expect(result.ok).toBe(false)
      expect(result.details).toBe('Shuffle URL not configured')
      expect(mockAxiosService.fetch).not.toHaveBeenCalled()
    })

    it('should return error when API key is not configured', async () => {
      const result = await service.testConnection({ webhookUrl: 'https://shuffle.local' })

      expect(result.ok).toBe(false)
      expect(result.details).toBe('Shuffle API key not configured')
      expect(mockAxiosService.fetch).not.toHaveBeenCalled()
    })

    it('should return error when Shuffle returns non-200 status', async () => {
      mockAxiosService.fetch.mockResolvedValue({
        status: 401,
        data: { error: 'Unauthorized' },
        headers: {},
        latencyMs: 15,
      })

      const result = await service.testConnection(VALID_CONFIG)

      expect(result.ok).toBe(false)
      expect(result.details).toContain('returned status 401')
    })

    it('should handle network errors gracefully', async () => {
      mockAxiosService.fetch.mockRejectedValue(new Error('ECONNREFUSED'))

      const result = await service.testConnection(VALID_CONFIG)

      expect(result.ok).toBe(false)
      expect(result.details).toBe('ECONNREFUSED')
      expect(mockAppLogger.error).toHaveBeenCalled()
    })

    it('should handle non-Error thrown values', async () => {
      mockAxiosService.fetch.mockRejectedValue(42)

      const result = await service.testConnection(VALID_CONFIG)

      expect(result.ok).toBe(false)
      expect(result.details).toBe('Connection failed')
    })

    it('should log success on successful connection', async () => {
      mockAxiosService.fetch.mockResolvedValue({
        status: 200,
        data: {},
        headers: {},
        latencyMs: 10,
      })

      await service.testConnection(VALID_CONFIG)

      expect(mockAppLogger.info).toHaveBeenCalledWith(
        'Shuffle testConnection succeeded',
        expect.objectContaining({
          metadata: expect.objectContaining({ connectorType: 'shuffle' }),
        })
      )
    })

    it('should log error on failed connection', async () => {
      mockAxiosService.fetch.mockRejectedValue(new Error('timeout'))

      await service.testConnection(VALID_CONFIG)

      expect(mockAppLogger.error).toHaveBeenCalledWith(
        'Shuffle connection test failed',
        expect.objectContaining({
          metadata: expect.objectContaining({ connectorType: 'shuffle' }),
        })
      )
    })

    it('should pass verifyTls option correctly', async () => {
      mockAxiosService.fetch.mockResolvedValue({
        status: 200,
        data: {},
        headers: {},
        latencyMs: 10,
      })

      await service.testConnection({ ...VALID_CONFIG, verifyTls: false })

      expect(mockAxiosService.fetch).toHaveBeenCalledWith(
        expect.stringContaining('shuffle.local'),
        expect.objectContaining({ rejectUnauthorized: false })
      )
    })
  })

  /* ------------------------------------------------------------------ */
  /* getWorkflows                                                        */
  /* ------------------------------------------------------------------ */

  describe('getWorkflows', () => {
    it('should return workflows', async () => {
      const mockWorkflows = [
        { id: 'wf-1', name: 'Alert Enrichment' },
        { id: 'wf-2', name: 'Block IP' },
      ]
      mockAxiosService.fetch.mockResolvedValue({
        status: 200,
        data: mockWorkflows,
        headers: {},
        latencyMs: 40,
      })

      const workflows = await service.getWorkflows(VALID_CONFIG)

      expect(workflows).toEqual(mockWorkflows)
      expect(mockAxiosService.fetch).toHaveBeenCalledWith(
        'https://shuffle.local/api/v1/workflows',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer shuffle-api-key-abc',
          }),
        })
      )
    })

    it('should throw when status is not 200', async () => {
      mockAxiosService.fetch.mockResolvedValue({
        status: 500,
        data: { error: 'Internal' },
        headers: {},
        latencyMs: 10,
      })

      await expect(service.getWorkflows(VALID_CONFIG)).rejects.toThrow('returned status 500')
      expect(mockAppLogger.warn).toHaveBeenCalled()
    })

    it('should return empty array when data is null', async () => {
      mockAxiosService.fetch.mockResolvedValue({
        status: 200,
        data: null,
        headers: {},
        latencyMs: 10,
      })

      const workflows = await service.getWorkflows(VALID_CONFIG)

      expect(workflows).toEqual([])
    })

    it('should log success after retrieving workflows', async () => {
      mockAxiosService.fetch.mockResolvedValue({
        status: 200,
        data: [{ id: '1' }, { id: '2' }, { id: '3' }],
        headers: {},
        latencyMs: 10,
      })

      await service.getWorkflows(VALID_CONFIG)

      expect(mockAppLogger.info).toHaveBeenCalledWith(
        'Shuffle getWorkflows succeeded',
        expect.objectContaining({
          metadata: expect.objectContaining({ count: 3 }),
        })
      )
    })
  })

  /* ------------------------------------------------------------------ */
  /* executeWorkflow                                                     */
  /* ------------------------------------------------------------------ */

  describe('executeWorkflow', () => {
    it('should execute a workflow and return execution ID', async () => {
      mockAxiosService.fetch.mockResolvedValue({
        status: 200,
        data: { execution_id: 'exec-abc-123' },
        headers: {},
        latencyMs: 100,
      })

      const result = await service.executeWorkflow(VALID_CONFIG, 'aaaa-bbbb-cccc', {
        alertId: '42',
      })

      expect(result.executionId).toBe('exec-abc-123')
      expect(mockAxiosService.fetch).toHaveBeenCalledWith(
        'https://shuffle.local/api/v1/workflows/aaaa-bbbb-cccc/execute',
        expect.objectContaining({
          method: 'POST',
          body: { alertId: '42' },
          headers: expect.objectContaining({
            Authorization: 'Bearer shuffle-api-key-abc',
          }),
        })
      )
    })

    it('should fall back to id field when execution_id is missing', async () => {
      mockAxiosService.fetch.mockResolvedValue({
        status: 200,
        data: { id: 'fallback-id' },
        headers: {},
        latencyMs: 50,
      })

      const result = await service.executeWorkflow(VALID_CONFIG, 'aabb-ccdd-eeff')

      expect(result.executionId).toBe('fallback-id')
    })

    it('should return unknown when both execution_id and id are missing', async () => {
      mockAxiosService.fetch.mockResolvedValue({
        status: 200,
        data: {},
        headers: {},
        latencyMs: 10,
      })

      const result = await service.executeWorkflow(VALID_CONFIG, 'aabb-ccdd-eeff')

      expect(result.executionId).toBe('unknown')
    })

    it('should use empty object as default data', async () => {
      mockAxiosService.fetch.mockResolvedValue({
        status: 200,
        data: { execution_id: 'exec-1' },
        headers: {},
        latencyMs: 10,
      })

      await service.executeWorkflow(VALID_CONFIG, 'aabb-ccdd-eeff')

      expect(mockAxiosService.fetch).toHaveBeenCalledWith(
        expect.stringContaining('execute'),
        expect.objectContaining({ body: {} })
      )
    })

    it('should throw on invalid workflow ID (non-hex/dash)', async () => {
      await expect(service.executeWorkflow(VALID_CONFIG, 'invalid!id@#$')).rejects.toThrow(
        'Invalid workflow ID'
      )
      expect(mockAxiosService.fetch).not.toHaveBeenCalled()
    })

    it('should throw on workflow ID with path traversal', async () => {
      await expect(service.executeWorkflow(VALID_CONFIG, '../../../etc/passwd')).rejects.toThrow(
        'Invalid workflow ID'
      )
      expect(mockAxiosService.fetch).not.toHaveBeenCalled()
    })

    it('should accept valid UUID-style workflow IDs', async () => {
      mockAxiosService.fetch.mockResolvedValue({
        status: 200,
        data: { execution_id: 'e1' },
        headers: {},
        latencyMs: 10,
      })

      const result = await service.executeWorkflow(
        VALID_CONFIG,
        '550e8400-e29b-41d4-a716-446655440000'
      )

      expect(result.executionId).toBe('e1')
    })

    it('should accept hex-only workflow IDs', async () => {
      mockAxiosService.fetch.mockResolvedValue({
        status: 200,
        data: { execution_id: 'e2' },
        headers: {},
        latencyMs: 10,
      })

      const result = await service.executeWorkflow(VALID_CONFIG, 'abcdef0123456789')

      expect(result.executionId).toBe('e2')
    })

    it('should throw when status is not 200', async () => {
      mockAxiosService.fetch.mockResolvedValue({
        status: 500,
        data: {},
        headers: {},
        latencyMs: 10,
      })

      await expect(
        service.executeWorkflow(VALID_CONFIG, 'aabb-ccdd', { data: 'test' })
      ).rejects.toThrow('returned status 500')
      expect(mockAppLogger.warn).toHaveBeenCalled()
    })

    it('should log warning for invalid workflow ID', async () => {
      try {
        await service.executeWorkflow(VALID_CONFIG, 'bad/id')
      } catch {
        // expected
      }

      expect(mockAppLogger.warn).toHaveBeenCalledWith(
        'Invalid Shuffle workflow ID provided',
        expect.objectContaining({
          metadata: expect.objectContaining({ workflowId: 'bad/id' }),
        })
      )
    })

    it('should log success after workflow execution', async () => {
      mockAxiosService.fetch.mockResolvedValue({
        status: 200,
        data: { execution_id: 'exec-xyz' },
        headers: {},
        latencyMs: 10,
      })

      await service.executeWorkflow(VALID_CONFIG, 'aabb-ccdd', { test: true })

      expect(mockAppLogger.info).toHaveBeenCalledWith(
        'Shuffle executeWorkflow succeeded',
        expect.objectContaining({
          metadata: expect.objectContaining({
            workflowId: 'aabb-ccdd',
            executionId: 'exec-xyz',
          }),
        })
      )
    })
  })
})
