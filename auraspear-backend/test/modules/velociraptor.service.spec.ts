import { VelociraptorService } from '../../src/modules/connectors/services/velociraptor.service'
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

function createService(): VelociraptorService {
  return new VelociraptorService(
    mockAppLogger as never,
    mockAxiosService as unknown as AxiosService
  )
}

/** Config using basic auth (username + password) */
const BASIC_AUTH_CONFIG: Record<string, unknown> = {
  apiUrl: 'https://velociraptor.local:8889',
  username: 'admin',
  password: 'admin',
  verifyTls: true,
}

/** Config using mTLS (clientCert + clientKey) */
const MTLS_CONFIG: Record<string, unknown> = {
  apiUrl: 'https://velociraptor.local:8001',
  clientCert: '-----BEGIN CERTIFICATE-----\nfake\n-----END CERTIFICATE-----',
  clientKey: '-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----',
  verifyTls: true,
}

describe('VelociraptorService', () => {
  let service: VelociraptorService

  beforeEach(() => {
    jest.clearAllMocks()
    mockAxiosService.basicAuth.mockReturnValue('Basic YWRtaW46YWRtaW4=')
    service = createService()
  })

  /* ------------------------------------------------------------------ */
  /* testConnection                                                      */
  /* ------------------------------------------------------------------ */

  describe('testConnection', () => {
    it('should return ok: true with basic auth when reachable', async () => {
      mockAxiosService.fetch.mockResolvedValue({
        status: 200,
        data: { metadata: {} },
        headers: {},
        latencyMs: 25,
      })

      const result = await service.testConnection(BASIC_AUTH_CONFIG)

      expect(result.ok).toBe(true)
      expect(result.details).toContain('Velociraptor server reachable')
      expect(result.details).toContain('velociraptor.local')
      expect(mockAxiosService.fetch).toHaveBeenCalledWith(
        'https://velociraptor.local:8889/api/v1/GetUserUITraits',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Basic YWRtaW46YWRtaW4=',
          }),
          rejectUnauthorized: true,
          allowPrivateNetwork: true,
        })
      )
    })

    it('should return ok: true with mTLS auth when reachable', async () => {
      mockAxiosService.fetch.mockResolvedValue({
        status: 200,
        data: {},
        headers: {},
        latencyMs: 15,
      })

      const result = await service.testConnection(MTLS_CONFIG)

      expect(result.ok).toBe(true)
      expect(result.details).toContain('Velociraptor server reachable')
      expect(mockAxiosService.fetch).toHaveBeenCalledWith(
        'https://velociraptor.local:8001/api/v1/GetUserUITraits',
        expect.objectContaining({
          clientCert: MTLS_CONFIG.clientCert,
          clientKey: MTLS_CONFIG.clientKey,
        })
      )
    })

    it('should use basicAuth helper for username/password', async () => {
      mockAxiosService.fetch.mockResolvedValue({
        status: 200,
        data: {},
        headers: {},
        latencyMs: 10,
      })

      await service.testConnection(BASIC_AUTH_CONFIG)

      expect(mockAxiosService.basicAuth).toHaveBeenCalledWith('admin', 'admin')
    })

    it('should fall back to baseUrl when apiUrl is missing', async () => {
      mockAxiosService.fetch.mockResolvedValue({
        status: 200,
        data: {},
        headers: {},
        latencyMs: 10,
      })

      await service.testConnection({ baseUrl: 'https://vr.local', username: 'u', password: 'p' })

      expect(mockAxiosService.fetch).toHaveBeenCalledWith(
        'https://vr.local/api/v1/GetUserUITraits',
        expect.anything()
      )
    })

    it('should return error when base URL is not configured', async () => {
      const result = await service.testConnection({ username: 'admin', password: 'admin' })

      expect(result.ok).toBe(false)
      expect(result.details).toBe('Velociraptor URL not configured')
      expect(mockAxiosService.fetch).not.toHaveBeenCalled()
    })

    it('should return error when no auth is configured', async () => {
      const result = await service.testConnection({ apiUrl: 'https://vr.local' })

      expect(result.ok).toBe(false)
      expect(result.details).toContain('authentication not configured')
      expect(mockAxiosService.fetch).not.toHaveBeenCalled()
    })

    it('should return error when Velociraptor returns non-200 status', async () => {
      mockAxiosService.fetch.mockResolvedValue({
        status: 403,
        data: {},
        headers: {},
        latencyMs: 10,
      })

      const result = await service.testConnection(BASIC_AUTH_CONFIG)

      expect(result.ok).toBe(false)
      expect(result.details).toContain('returned status 403')
    })

    it('should handle network errors gracefully', async () => {
      mockAxiosService.fetch.mockRejectedValue(new Error('self-signed certificate'))

      const result = await service.testConnection(BASIC_AUTH_CONFIG)

      expect(result.ok).toBe(false)
      expect(result.details).toBe('self-signed certificate')
      expect(mockAppLogger.error).toHaveBeenCalled()
    })

    it('should handle non-Error thrown values', async () => {
      mockAxiosService.fetch.mockRejectedValue({ code: 'UNKNOWN' })

      const result = await service.testConnection(BASIC_AUTH_CONFIG)

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

      await service.testConnection(BASIC_AUTH_CONFIG)

      expect(mockAppLogger.info).toHaveBeenCalledWith(
        'Velociraptor testConnection succeeded',
        expect.objectContaining({
          metadata: expect.objectContaining({ connectorType: 'velociraptor' }),
        })
      )
    })

    it('should log error on failed connection', async () => {
      mockAxiosService.fetch.mockRejectedValue(new Error('ETIMEDOUT'))

      await service.testConnection(BASIC_AUTH_CONFIG)

      expect(mockAppLogger.error).toHaveBeenCalledWith(
        'Velociraptor connection test failed',
        expect.objectContaining({
          metadata: expect.objectContaining({ connectorType: 'velociraptor' }),
          stackTrace: expect.stringContaining('ETIMEDOUT'),
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

      await service.testConnection({ ...BASIC_AUTH_CONFIG, verifyTls: false })

      expect(mockAxiosService.fetch).toHaveBeenCalledWith(
        expect.stringContaining('velociraptor.local'),
        expect.objectContaining({ rejectUnauthorized: false })
      )
    })

    it('should include caCert in mTLS options when provided', async () => {
      mockAxiosService.fetch.mockResolvedValue({
        status: 200,
        data: {},
        headers: {},
        latencyMs: 10,
      })

      const config = {
        ...MTLS_CONFIG,
        caCert: '-----BEGIN CERTIFICATE-----\nCA\n-----END CERTIFICATE-----',
      }
      await service.testConnection(config)

      expect(mockAxiosService.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          caCert: config.caCert,
        })
      )
    })
  })

  /* ------------------------------------------------------------------ */
  /* runVQL                                                              */
  /* ------------------------------------------------------------------ */

  describe('runVQL', () => {
    it('should execute VQL query and return rows and columns', async () => {
      const mockRows = [{ ClientId: 'C.123', Hostname: 'server01' }]
      const mockColumns = ['ClientId', 'Hostname']
      mockAxiosService.fetch.mockResolvedValue({
        status: 200,
        data: { rows: mockRows, columns: mockColumns },
        headers: {},
        latencyMs: 200,
      })

      const vql = 'SELECT * FROM clients()'
      const result = await service.runVQL(BASIC_AUTH_CONFIG, vql)

      expect(result.rows).toEqual(mockRows)
      expect(result.columns).toEqual(mockColumns)
      expect(mockAxiosService.fetch).toHaveBeenCalledWith(
        'https://velociraptor.local:8889/api/v1/CreateNotebook',
        expect.objectContaining({
          method: 'POST',
          body: { query: vql },
        })
      )
    })

    it('should return empty arrays when rows and columns are missing', async () => {
      mockAxiosService.fetch.mockResolvedValue({
        status: 200,
        data: {},
        headers: {},
        latencyMs: 10,
      })

      const result = await service.runVQL(BASIC_AUTH_CONFIG, 'SELECT 1')

      expect(result.rows).toEqual([])
      expect(result.columns).toEqual([])
    })

    it('should throw when status is not 200', async () => {
      mockAxiosService.fetch.mockResolvedValue({
        status: 400,
        data: { error: 'Bad query' },
        headers: {},
        latencyMs: 10,
      })

      await expect(service.runVQL(BASIC_AUTH_CONFIG, 'INVALID VQL')).rejects.toThrow(
        'returned status 400'
      )
      expect(mockAppLogger.warn).toHaveBeenCalled()
    })

    it('should log success after VQL execution', async () => {
      mockAxiosService.fetch.mockResolvedValue({
        status: 200,
        data: { rows: [{ a: 1 }, { a: 2 }], columns: ['a'] },
        headers: {},
        latencyMs: 10,
      })

      await service.runVQL(BASIC_AUTH_CONFIG, 'SELECT a FROM test()')

      expect(mockAppLogger.info).toHaveBeenCalledWith(
        'Velociraptor runVQL succeeded',
        expect.objectContaining({
          metadata: expect.objectContaining({ rowCount: 2, columnCount: 1 }),
        })
      )
    })

    it('should use basic auth header for VQL queries', async () => {
      mockAxiosService.fetch.mockResolvedValue({
        status: 200,
        data: { rows: [], columns: [] },
        headers: {},
        latencyMs: 10,
      })

      await service.runVQL(BASIC_AUTH_CONFIG, 'SELECT 1')

      const callArguments = mockAxiosService.fetch.mock.calls[0]
      const options = callArguments?.[1] as Record<string, unknown> | undefined
      const headers = options?.headers as Record<string, string> | undefined

      expect(headers?.Authorization).toBe('Basic YWRtaW46YWRtaW4=')
    })
  })

  /* ------------------------------------------------------------------ */
  /* getClients                                                          */
  /* ------------------------------------------------------------------ */

  describe('getClients', () => {
    it('should return clients from Velociraptor', async () => {
      const mockClients = [
        { client_id: 'C.123', os_info: { hostname: 'server01' } },
        { client_id: 'C.456', os_info: { hostname: 'server02' } },
      ]
      mockAxiosService.fetch.mockResolvedValue({
        status: 200,
        data: { items: mockClients },
        headers: {},
        latencyMs: 80,
      })

      const clients = await service.getClients(BASIC_AUTH_CONFIG)

      expect(clients).toEqual(mockClients)
      expect(mockAxiosService.fetch).toHaveBeenCalledWith(
        'https://velociraptor.local:8889/api/v1/SearchClients?query=all&limit=500',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Basic YWRtaW46YWRtaW4=',
          }),
        })
      )
    })

    it('should return empty array when items key is missing', async () => {
      mockAxiosService.fetch.mockResolvedValue({
        status: 200,
        data: {},
        headers: {},
        latencyMs: 10,
      })

      const clients = await service.getClients(BASIC_AUTH_CONFIG)

      expect(clients).toEqual([])
    })

    it('should throw when status is not 200', async () => {
      mockAxiosService.fetch.mockResolvedValue({
        status: 503,
        data: {},
        headers: {},
        latencyMs: 10,
      })

      await expect(service.getClients(BASIC_AUTH_CONFIG)).rejects.toThrow(
        'Velociraptor returned status 503'
      )
      expect(mockAppLogger.warn).toHaveBeenCalled()
    })

    it('should log success after retrieving clients', async () => {
      mockAxiosService.fetch.mockResolvedValue({
        status: 200,
        data: { items: [{ client_id: 'C.1' }] },
        headers: {},
        latencyMs: 10,
      })

      await service.getClients(BASIC_AUTH_CONFIG)

      expect(mockAppLogger.info).toHaveBeenCalledWith(
        'Velociraptor getClients succeeded',
        expect.objectContaining({
          metadata: expect.objectContaining({ count: 1 }),
        })
      )
    })

    it('should use mTLS options for client queries', async () => {
      mockAxiosService.fetch.mockResolvedValue({
        status: 200,
        data: { items: [] },
        headers: {},
        latencyMs: 10,
      })

      await service.getClients(MTLS_CONFIG)

      expect(mockAxiosService.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          clientCert: MTLS_CONFIG.clientCert,
          clientKey: MTLS_CONFIG.clientKey,
        })
      )
    })
  })
})
