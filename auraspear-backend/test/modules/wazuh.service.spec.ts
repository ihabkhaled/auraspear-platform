import { WazuhService } from '../../src/modules/connectors/services/wazuh.service'
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

function createService(): WazuhService {
  return new WazuhService(mockAppLogger as never, mockAxiosService as unknown as AxiosService)
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
    latencyMs: overrides.latencyMs ?? 42,
  }
}

const VALID_CONFIG: Record<string, unknown> = {
  managerUrl: 'https://wazuh.local:55000',
  username: 'admin',
  password: 'secret',
  indexerUrl: 'https://wazuh-indexer.local:9200',
  indexerUsername: 'indexer-admin',
  indexerPassword: 'indexer-secret',
  verifyTls: true,
}

describe('WazuhService', () => {
  let service: WazuhService

  beforeEach(() => {
    jest.clearAllMocks()
    service = createService()
    mockAxiosService.basicAuth.mockReturnValue('Basic bW9jay1hdXRo')
  })

  /* ------------------------------------------------------------------ */
  /* testConnection                                                       */
  /* ------------------------------------------------------------------ */

  describe('testConnection', () => {
    it('should return ok: true when authentication and manager info succeed', async () => {
      // First call: authenticate
      mockAxiosService.fetch.mockResolvedValueOnce(
        buildConnectorResponse({
          data: { data: { token: 'jwt-token-123' } },
        })
      )
      // Second call: manager info
      mockAxiosService.fetch.mockResolvedValueOnce(
        buildConnectorResponse({
          data: { data: { api_version: '4.9.0' } },
        })
      )

      const result = await service.testConnection(VALID_CONFIG)

      expect(result.ok).toBe(true)
      expect(result.details).toContain('4.9.0')
      expect(result.details).toContain(VALID_CONFIG.managerUrl)
      expect(mockAppLogger.info).toHaveBeenCalled()
    })

    it('should use baseUrl when managerUrl is not provided', async () => {
      const config = { ...VALID_CONFIG, managerUrl: undefined, baseUrl: 'https://fallback.local' }

      mockAxiosService.fetch.mockResolvedValueOnce(
        buildConnectorResponse({ data: { data: { token: 'jwt-token' } } })
      )
      mockAxiosService.fetch.mockResolvedValueOnce(
        buildConnectorResponse({ data: { data: { api_version: '4.8.0' } } })
      )

      const result = await service.testConnection(config)

      expect(result.ok).toBe(true)
      expect(mockAxiosService.fetch).toHaveBeenCalledWith(
        'https://fallback.local/security/user/authenticate',
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('should return ok: false when managerUrl is missing', async () => {
      const config = { username: 'admin', password: 'secret' }

      const result = await service.testConnection(config)

      expect(result.ok).toBe(false)
      expect(result.details).toBe('Wazuh Manager URL not configured')
      expect(mockAxiosService.fetch).not.toHaveBeenCalled()
    })

    it('should return ok: false when username is missing', async () => {
      const config = { managerUrl: 'https://wazuh.local', password: 'secret' }

      const result = await service.testConnection(config)

      expect(result.ok).toBe(false)
      expect(result.details).toBe('Wazuh Manager username/password not configured')
    })

    it('should return ok: false when password is missing', async () => {
      const config = { managerUrl: 'https://wazuh.local', username: 'admin' }

      const result = await service.testConnection(config)

      expect(result.ok).toBe(false)
      expect(result.details).toBe('Wazuh Manager username/password not configured')
    })

    it('should return ok: false when manager info returns non-200 status', async () => {
      mockAxiosService.fetch.mockResolvedValueOnce(
        buildConnectorResponse({ data: { data: { token: 'jwt-token' } } })
      )
      mockAxiosService.fetch.mockResolvedValueOnce(
        buildConnectorResponse({ status: 403, data: { error: 'forbidden' } })
      )

      const result = await service.testConnection(VALID_CONFIG)

      expect(result.ok).toBe(false)
      expect(result.details).toContain('403')
    })

    it('should return ok: false when fetch throws', async () => {
      mockAxiosService.fetch.mockRejectedValueOnce(new Error('Connection refused'))

      const result = await service.testConnection(VALID_CONFIG)

      expect(result.ok).toBe(false)
      expect(result.details).toBe('Connection refused')
      expect(mockAppLogger.error).toHaveBeenCalled()
    })

    it('should handle non-Error thrown values', async () => {
      mockAxiosService.fetch.mockRejectedValueOnce('string-error')

      const result = await service.testConnection(VALID_CONFIG)

      expect(result.ok).toBe(false)
      expect(result.details).toBe('Connection failed')
    })

    it('should use version from top-level data when nested data is absent', async () => {
      mockAxiosService.fetch.mockResolvedValueOnce(
        buildConnectorResponse({ data: { data: { token: 'jwt-token' } } })
      )
      mockAxiosService.fetch.mockResolvedValueOnce(
        buildConnectorResponse({ data: { version: '4.7.0' } })
      )

      const result = await service.testConnection(VALID_CONFIG)

      expect(result.ok).toBe(true)
      expect(result.details).toContain('4.7.0')
    })
  })

  /* ------------------------------------------------------------------ */
  /* authenticate                                                         */
  /* ------------------------------------------------------------------ */

  describe('authenticate', () => {
    it('should return a JWT token on successful authentication', async () => {
      mockAxiosService.fetch.mockResolvedValueOnce(
        buildConnectorResponse({ data: { data: { token: 'jwt-token-abc' } } })
      )

      const token = await service.authenticate('https://wazuh.local:55000', 'admin', 'secret')

      expect(token).toBe('jwt-token-abc')
      expect(mockAxiosService.fetch).toHaveBeenCalledWith(
        'https://wazuh.local:55000/security/user/authenticate',
        expect.objectContaining({
          method: 'POST',
          allowPrivateNetwork: true,
        })
      )
      expect(mockAppLogger.info).toHaveBeenCalled()
    })

    it('should extract token from top-level body when data.token is absent', async () => {
      mockAxiosService.fetch.mockResolvedValueOnce(
        buildConnectorResponse({ data: { token: 'top-level-token' } })
      )

      const token = await service.authenticate('https://wazuh.local:55000', 'admin', 'secret')

      expect(token).toBe('top-level-token')
    })

    it('should throw when authentication returns non-200 status', async () => {
      mockAxiosService.fetch.mockResolvedValueOnce(
        buildConnectorResponse({ status: 401, data: { error: 'unauthorized' } })
      )

      await expect(
        service.authenticate('https://wazuh.local:55000', 'admin', 'wrong')
      ).rejects.toThrow('returned status 401')

      expect(mockAppLogger.warn).toHaveBeenCalled()
    })

    it('should throw when response contains no token', async () => {
      mockAxiosService.fetch.mockResolvedValueOnce(buildConnectorResponse({ data: { data: {} } }))

      await expect(
        service.authenticate('https://wazuh.local:55000', 'admin', 'secret')
      ).rejects.toThrow('Wazuh authentication returned no token')

      expect(mockAppLogger.warn).toHaveBeenCalled()
    })

    it('should cache the token and reuse it on subsequent calls', async () => {
      mockAxiosService.fetch.mockResolvedValueOnce(
        buildConnectorResponse({ data: { data: { token: 'cached-token' } } })
      )

      const token1 = await service.authenticate('https://wazuh.local:55000', 'admin', 'secret')
      const token2 = await service.authenticate('https://wazuh.local:55000', 'admin', 'secret')

      expect(token1).toBe('cached-token')
      expect(token2).toBe('cached-token')
      // fetch should only have been called once due to caching
      expect(mockAxiosService.fetch).toHaveBeenCalledTimes(1)
    })

    it('should use different cache keys for different manager URLs', async () => {
      mockAxiosService.fetch.mockResolvedValueOnce(
        buildConnectorResponse({ data: { data: { token: 'token-a' } } })
      )
      mockAxiosService.fetch.mockResolvedValueOnce(
        buildConnectorResponse({ data: { data: { token: 'token-b' } } })
      )

      const tokenA = await service.authenticate('https://wazuh-a.local:55000', 'admin', 'secret')
      const tokenB = await service.authenticate('https://wazuh-b.local:55000', 'admin', 'secret')

      expect(tokenA).toBe('token-a')
      expect(tokenB).toBe('token-b')
      expect(mockAxiosService.fetch).toHaveBeenCalledTimes(2)
    })

    it('should use different cache keys for different usernames', async () => {
      mockAxiosService.fetch.mockResolvedValueOnce(
        buildConnectorResponse({ data: { data: { token: 'token-user1' } } })
      )
      mockAxiosService.fetch.mockResolvedValueOnce(
        buildConnectorResponse({ data: { data: { token: 'token-user2' } } })
      )

      const token1 = await service.authenticate('https://wazuh.local:55000', 'user1', 'secret')
      const token2 = await service.authenticate('https://wazuh.local:55000', 'user2', 'secret')

      expect(token1).toBe('token-user1')
      expect(token2).toBe('token-user2')
      expect(mockAxiosService.fetch).toHaveBeenCalledTimes(2)
    })

    it('should pass verifyTls config to rejectUnauthorized', async () => {
      mockAxiosService.fetch.mockResolvedValueOnce(
        buildConnectorResponse({ data: { data: { token: 'tok' } } })
      )

      await service.authenticate('https://wazuh.local:55000', 'admin', 'secret', {
        verifyTls: false,
      })

      expect(mockAxiosService.fetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ rejectUnauthorized: false })
      )
    })
  })

  /* ------------------------------------------------------------------ */
  /* getAgents                                                            */
  /* ------------------------------------------------------------------ */

  describe('getAgents', () => {
    it('should return agent list on success', async () => {
      // authenticate call
      mockAxiosService.fetch.mockResolvedValueOnce(
        buildConnectorResponse({ data: { data: { token: 'jwt-token' } } })
      )
      // getAgents call
      const agents = [
        { id: '001', name: 'agent-1', status: 'active' },
        { id: '002', name: 'agent-2', status: 'active' },
      ]
      mockAxiosService.fetch.mockResolvedValueOnce(
        buildConnectorResponse({ data: { data: { affected_items: agents } } })
      )

      const result = await service.getAgents(VALID_CONFIG)

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ id: '001', name: 'agent-1', status: 'active' })
      expect(mockAxiosService.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/agents?status=active&limit=500'),
        expect.objectContaining({
          headers: { Authorization: 'Bearer jwt-token' },
        })
      )
      expect(mockAppLogger.info).toHaveBeenCalled()
    })

    it('should return empty array when no agents found', async () => {
      mockAxiosService.fetch.mockResolvedValueOnce(
        buildConnectorResponse({ data: { data: { token: 'jwt-token' } } })
      )
      mockAxiosService.fetch.mockResolvedValueOnce(buildConnectorResponse({ data: { data: {} } }))

      const result = await service.getAgents(VALID_CONFIG)

      expect(result).toHaveLength(0)
    })

    it('should throw when agents endpoint returns non-200', async () => {
      mockAxiosService.fetch.mockResolvedValueOnce(
        buildConnectorResponse({ data: { data: { token: 'jwt-token' } } })
      )
      mockAxiosService.fetch.mockResolvedValueOnce(
        buildConnectorResponse({ status: 500, data: { error: 'internal' } })
      )

      await expect(service.getAgents(VALID_CONFIG)).rejects.toThrow('returned status 500')
      expect(mockAppLogger.warn).toHaveBeenCalled()
    })

    it('should propagate authentication errors', async () => {
      mockAxiosService.fetch.mockResolvedValueOnce(
        buildConnectorResponse({ status: 401, data: {} })
      )

      await expect(service.getAgents(VALID_CONFIG)).rejects.toThrow('returned status 401')
    })
  })

  /* ------------------------------------------------------------------ */
  /* searchAlerts                                                         */
  /* ------------------------------------------------------------------ */

  describe('searchAlerts', () => {
    const dslQuery = { query: { match_all: {} }, size: 10 }

    it('should return hits and total on success with object total', async () => {
      const hitItems = [
        { _id: '1', _source: { rule: { level: 12 } } },
        { _id: '2', _source: { rule: { level: 5 } } },
      ]
      mockAxiosService.fetch.mockResolvedValueOnce(
        buildConnectorResponse({
          data: {
            hits: {
              total: { value: 42, relation: 'eq' },
              hits: hitItems,
            },
          },
        })
      )

      const result = await service.searchAlerts(VALID_CONFIG, dslQuery)

      expect(result.total).toBe(42)
      expect(result.hits).toHaveLength(2)
      expect(result.hits[0]).toEqual(hitItems[0])
      expect(mockAxiosService.fetch).toHaveBeenCalledWith(
        'https://wazuh-indexer.local:9200/wazuh-alerts-*/_search',
        expect.objectContaining({
          method: 'POST',
          body: dslQuery,
        })
      )
      expect(mockAppLogger.info).toHaveBeenCalled()
    })

    it('should handle numeric total value', async () => {
      mockAxiosService.fetch.mockResolvedValueOnce(
        buildConnectorResponse({
          data: {
            hits: {
              total: 99,
              hits: [{ _id: '1' }],
            },
          },
        })
      )

      const result = await service.searchAlerts(VALID_CONFIG, dslQuery)

      expect(result.total).toBe(99)
      expect(result.hits).toHaveLength(1)
    })

    it('should use custom index name', async () => {
      mockAxiosService.fetch.mockResolvedValueOnce(
        buildConnectorResponse({
          data: { hits: { total: { value: 0 }, hits: [] } },
        })
      )

      await service.searchAlerts(VALID_CONFIG, dslQuery, 'custom-index-*')

      expect(mockAxiosService.fetch).toHaveBeenCalledWith(
        'https://wazuh-indexer.local:9200/custom-index-*/_search',
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('should use default index wazuh-alerts-* when not specified', async () => {
      mockAxiosService.fetch.mockResolvedValueOnce(
        buildConnectorResponse({
          data: { hits: { total: { value: 0 }, hits: [] } },
        })
      )

      await service.searchAlerts(VALID_CONFIG, dslQuery)

      expect(mockAxiosService.fetch).toHaveBeenCalledWith(
        expect.stringContaining('wazuh-alerts-*/_search'),
        expect.objectContaining({})
      )
    })

    it('should throw when indexerUrl is not configured', async () => {
      const config = { ...VALID_CONFIG, indexerUrl: undefined, opensearchUrl: undefined }

      await expect(service.searchAlerts(config, dslQuery)).rejects.toThrow(
        'Wazuh Indexer URL not configured'
      )
      expect(mockAppLogger.warn).toHaveBeenCalled()
    })

    it('should use opensearchUrl as fallback when indexerUrl is missing', async () => {
      const config = {
        ...VALID_CONFIG,
        indexerUrl: undefined,
        opensearchUrl: 'https://opensearch.local:9200',
      }
      mockAxiosService.fetch.mockResolvedValueOnce(
        buildConnectorResponse({
          data: { hits: { total: { value: 0 }, hits: [] } },
        })
      )

      await service.searchAlerts(config, dslQuery)

      expect(mockAxiosService.fetch).toHaveBeenCalledWith(
        'https://opensearch.local:9200/wazuh-alerts-*/_search',
        expect.objectContaining({})
      )
    })

    it('should throw on invalid index name to prevent path traversal', async () => {
      await expect(service.searchAlerts(VALID_CONFIG, dslQuery, '../etc/passwd')).rejects.toThrow(
        'Invalid index name'
      )
      expect(mockAppLogger.warn).toHaveBeenCalled()
    })

    it('should throw when search returns non-200 status', async () => {
      mockAxiosService.fetch.mockResolvedValueOnce(
        buildConnectorResponse({ status: 400, data: { error: 'bad request' } })
      )

      await expect(service.searchAlerts(VALID_CONFIG, dslQuery)).rejects.toThrow(
        'returned status 400'
      )
      expect(mockAppLogger.warn).toHaveBeenCalled()
    })

    it('should use indexerUsername/indexerPassword for basic auth', async () => {
      mockAxiosService.fetch.mockResolvedValueOnce(
        buildConnectorResponse({
          data: { hits: { total: { value: 0 }, hits: [] } },
        })
      )

      await service.searchAlerts(VALID_CONFIG, dslQuery)

      expect(mockAxiosService.basicAuth).toHaveBeenCalledWith('indexer-admin', 'indexer-secret')
    })

    it('should fall back to username/password when indexer credentials are absent', async () => {
      const config = {
        ...VALID_CONFIG,
        indexerUsername: undefined,
        indexerPassword: undefined,
      }
      mockAxiosService.fetch.mockResolvedValueOnce(
        buildConnectorResponse({
          data: { hits: { total: { value: 0 }, hits: [] } },
        })
      )

      await service.searchAlerts(config, dslQuery)

      expect(mockAxiosService.basicAuth).toHaveBeenCalledWith('admin', 'secret')
    })

    it('should return empty hits array when hits.hits is absent', async () => {
      mockAxiosService.fetch.mockResolvedValueOnce(
        buildConnectorResponse({
          data: { hits: { total: { value: 0 } } },
        })
      )

      const result = await service.searchAlerts(VALID_CONFIG, dslQuery)

      expect(result.hits).toHaveLength(0)
      expect(result.total).toBe(0)
    })

    it('should propagate fetch errors', async () => {
      mockAxiosService.fetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(service.searchAlerts(VALID_CONFIG, dslQuery)).rejects.toThrow('Network error')
    })
  })
})
