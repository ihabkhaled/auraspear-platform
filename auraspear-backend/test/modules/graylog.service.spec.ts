import { GraylogService } from '../../src/modules/connectors/services/graylog.service'
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

function createService(): GraylogService {
  return new GraylogService(mockAppLogger as never, mockAxiosService as unknown as AxiosService)
}

function buildConnectorResponse(overrides: {
  status?: number
  data?: unknown
  headers?: Record<string, string>
  latencyMs?: number
}) {
  return {
    status: overrides.status ?? 200,
    data: overrides.data ?? {},
    headers: overrides.headers ?? {},
    latencyMs: overrides.latencyMs ?? 35,
  }
}

const VALID_CONFIG: Record<string, unknown> = {
  baseUrl: 'https://graylog.local:9000',
  username: 'admin',
  password: 'graylog-secret',
  verifyTls: true,
}

describe('GraylogService', () => {
  let service: GraylogService

  beforeEach(() => {
    jest.clearAllMocks()
    service = createService()
    mockAxiosService.basicAuth.mockReturnValue('Basic bW9jay1hdXRo')
  })

  /* ------------------------------------------------------------------ */
  /* testConnection                                                       */
  /* ------------------------------------------------------------------ */

  describe('testConnection', () => {
    it('should return ok: true when cluster nodes endpoint returns 200', async () => {
      mockAxiosService.fetch.mockResolvedValueOnce(
        buildConnectorResponse({
          data: { nodes: 3, cluster_id: 'abc-123' },
        })
      )

      const result = await service.testConnection(VALID_CONFIG)

      expect(result.ok).toBe(true)
      expect(result.details).toContain('Graylog reachable')
      expect(result.details).toContain(VALID_CONFIG.baseUrl)
      expect(result.details).toContain('3')
      expect(mockAxiosService.fetch).toHaveBeenCalledWith(
        'https://graylog.local:9000/api/system/cluster/nodes',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Requested-By': 'AuraSpear',
          }),
          allowPrivateNetwork: true,
        })
      )
      expect(mockAppLogger.info).toHaveBeenCalled()
    })

    it('should use total field when nodes field is absent', async () => {
      mockAxiosService.fetch.mockResolvedValueOnce(
        buildConnectorResponse({
          data: { total: 5 },
        })
      )

      const result = await service.testConnection(VALID_CONFIG)

      expect(result.ok).toBe(true)
      expect(result.details).toContain('5')
    })

    it('should display unknown when neither nodes nor total is present', async () => {
      mockAxiosService.fetch.mockResolvedValueOnce(buildConnectorResponse({ data: {} }))

      const result = await service.testConnection(VALID_CONFIG)

      expect(result.ok).toBe(true)
      expect(result.details).toContain('unknown')
    })

    it('should return ok: false when baseUrl is missing', async () => {
      const config = { username: 'admin', password: 'secret' }

      const result = await service.testConnection(config)

      expect(result.ok).toBe(false)
      expect(result.details).toBe('Graylog base URL not configured')
      expect(mockAxiosService.fetch).not.toHaveBeenCalled()
    })

    it('should return ok: false when username is missing', async () => {
      const config = { baseUrl: 'https://graylog.local', password: 'secret' }

      const result = await service.testConnection(config)

      expect(result.ok).toBe(false)
      expect(result.details).toBe('Graylog username/password not configured')
    })

    it('should return ok: false when password is missing', async () => {
      const config = { baseUrl: 'https://graylog.local', username: 'admin' }

      const result = await service.testConnection(config)

      expect(result.ok).toBe(false)
      expect(result.details).toBe('Graylog username/password not configured')
    })

    it('should return ok: false when cluster endpoint returns non-200', async () => {
      mockAxiosService.fetch.mockResolvedValueOnce(
        buildConnectorResponse({ status: 401, data: { message: 'unauthorized' } })
      )

      const result = await service.testConnection(VALID_CONFIG)

      expect(result.ok).toBe(false)
      expect(result.details).toContain('401')
    })

    it('should return ok: false when fetch throws an error', async () => {
      mockAxiosService.fetch.mockRejectedValueOnce(new Error('Connection refused'))

      const result = await service.testConnection(VALID_CONFIG)

      expect(result.ok).toBe(false)
      expect(result.details).toBe('Connection refused')
      expect(mockAppLogger.error).toHaveBeenCalled()
    })

    it('should handle non-Error thrown values', async () => {
      mockAxiosService.fetch.mockRejectedValueOnce('unexpected-error')

      const result = await service.testConnection(VALID_CONFIG)

      expect(result.ok).toBe(false)
      expect(result.details).toBe('Connection failed')
    })

    it('should pass verifyTls config to rejectUnauthorized', async () => {
      const config = { ...VALID_CONFIG, verifyTls: false }
      mockAxiosService.fetch.mockResolvedValueOnce(buildConnectorResponse({ data: { nodes: 1 } }))

      await service.testConnection(config)

      expect(mockAxiosService.fetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ rejectUnauthorized: false })
      )
    })

    it('should call basicAuth with provided credentials', async () => {
      mockAxiosService.fetch.mockResolvedValueOnce(buildConnectorResponse({ data: { nodes: 1 } }))

      await service.testConnection(VALID_CONFIG)

      expect(mockAxiosService.basicAuth).toHaveBeenCalledWith('admin', 'graylog-secret')
    })
  })

  /* ------------------------------------------------------------------ */
  /* searchEvents                                                         */
  /* ------------------------------------------------------------------ */

  describe('searchEvents', () => {
    const filter = {
      query: 'source:firewall',
      timerange: { from: 300, type: 'relative' },
    }

    it('should return events and total on success', async () => {
      const eventItems = [
        { event: { id: 'evt-1', message: 'alert fired' } },
        { event: { id: 'evt-2', message: 'rule triggered' } },
      ]
      mockAxiosService.fetch.mockResolvedValueOnce(
        buildConnectorResponse({
          data: { events: eventItems, total_results: 42 },
        })
      )

      const result = await service.searchEvents(VALID_CONFIG, filter)

      expect(result.events).toHaveLength(2)
      expect(result.total).toBe(42)
      expect(result.events[0]).toEqual(eventItems[0])
      expect(mockAxiosService.fetch).toHaveBeenCalledWith(
        'https://graylog.local:9000/api/events/search',
        expect.objectContaining({
          method: 'POST',
          body: filter,
          headers: expect.objectContaining({
            'X-Requested-By': 'AuraSpear',
          }),
        })
      )
      expect(mockAppLogger.info).toHaveBeenCalled()
    })

    it('should return empty events array when events field is absent', async () => {
      mockAxiosService.fetch.mockResolvedValueOnce(
        buildConnectorResponse({ data: { total_results: 0 } })
      )

      const result = await service.searchEvents(VALID_CONFIG, filter)

      expect(result.events).toHaveLength(0)
      expect(result.total).toBe(0)
    })

    it('should default total to 0 when total_results is absent', async () => {
      mockAxiosService.fetch.mockResolvedValueOnce(
        buildConnectorResponse({ data: { events: [{ id: '1' }] } })
      )

      const result = await service.searchEvents(VALID_CONFIG, filter)

      expect(result.total).toBe(0)
      expect(result.events).toHaveLength(1)
    })

    it('should throw when events search returns non-200 status', async () => {
      mockAxiosService.fetch.mockResolvedValueOnce(
        buildConnectorResponse({ status: 500, data: { message: 'Internal error' } })
      )

      await expect(service.searchEvents(VALID_CONFIG, filter)).rejects.toThrow(
        'returned status 500'
      )
      expect(mockAppLogger.warn).toHaveBeenCalled()
    })

    it('should propagate fetch errors', async () => {
      mockAxiosService.fetch.mockRejectedValueOnce(new Error('Timeout'))

      await expect(service.searchEvents(VALID_CONFIG, filter)).rejects.toThrow('Timeout')
    })

    it('should use basic auth credentials from config', async () => {
      mockAxiosService.fetch.mockResolvedValueOnce(
        buildConnectorResponse({ data: { events: [], total_results: 0 } })
      )

      await service.searchEvents(VALID_CONFIG, filter)

      expect(mockAxiosService.basicAuth).toHaveBeenCalledWith('admin', 'graylog-secret')
    })
  })

  /* ------------------------------------------------------------------ */
  /* getEventDefinitions                                                  */
  /* ------------------------------------------------------------------ */

  describe('getEventDefinitions', () => {
    it('should return event definitions on success', async () => {
      const definitions = [
        { id: 'def-1', title: 'SSH Brute Force', priority: 2 },
        { id: 'def-2', title: 'Firewall Deny', priority: 1 },
      ]
      mockAxiosService.fetch.mockResolvedValueOnce(
        buildConnectorResponse({
          data: { event_definitions: definitions },
        })
      )

      const result = await service.getEventDefinitions(VALID_CONFIG)

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual(definitions[0])
      expect(mockAxiosService.fetch).toHaveBeenCalledWith(
        'https://graylog.local:9000/api/events/definitions',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Requested-By': 'AuraSpear',
          }),
          allowPrivateNetwork: true,
        })
      )
      expect(mockAppLogger.info).toHaveBeenCalled()
    })

    it('should return empty array when event_definitions is absent', async () => {
      mockAxiosService.fetch.mockResolvedValueOnce(buildConnectorResponse({ data: {} }))

      const result = await service.getEventDefinitions(VALID_CONFIG)

      expect(result).toHaveLength(0)
    })

    it('should throw when endpoint returns non-200 status', async () => {
      mockAxiosService.fetch.mockResolvedValueOnce(
        buildConnectorResponse({ status: 403, data: { message: 'forbidden' } })
      )

      await expect(service.getEventDefinitions(VALID_CONFIG)).rejects.toThrow('returned status 403')
      expect(mockAppLogger.warn).toHaveBeenCalled()
    })

    it('should propagate fetch errors', async () => {
      mockAxiosService.fetch.mockRejectedValueOnce(new Error('DNS resolution failed'))

      await expect(service.getEventDefinitions(VALID_CONFIG)).rejects.toThrow(
        'DNS resolution failed'
      )
    })

    it('should pass verifyTls config to rejectUnauthorized', async () => {
      const config = { ...VALID_CONFIG, verifyTls: false }
      mockAxiosService.fetch.mockResolvedValueOnce(
        buildConnectorResponse({ data: { event_definitions: [] } })
      )

      await service.getEventDefinitions(config)

      expect(mockAxiosService.fetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ rejectUnauthorized: false })
      )
    })

    it('should use basic auth credentials from config', async () => {
      mockAxiosService.fetch.mockResolvedValueOnce(
        buildConnectorResponse({ data: { event_definitions: [] } })
      )

      await service.getEventDefinitions(VALID_CONFIG)

      expect(mockAxiosService.basicAuth).toHaveBeenCalledWith('admin', 'graylog-secret')
    })
  })
})
