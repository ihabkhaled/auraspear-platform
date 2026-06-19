import { InfluxDBService } from '../../src/modules/connectors/services/influxdb.service'
import type { AxiosResponseData } from '../../src/common/modules/axios'
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

function createService(): InfluxDBService {
  return new InfluxDBService(mockAppLogger as never, mockAxiosService as unknown as AxiosService)
}

function buildResponse(overrides: Partial<AxiosResponseData> = {}): AxiosResponseData {
  return {
    status: 200,
    data: {},
    headers: {},
    latencyMs: 35,
    ...overrides,
  }
}

describe('InfluxDBService', () => {
  let service: InfluxDBService

  beforeEach(() => {
    jest.clearAllMocks()
    service = createService()
  })

  /* ------------------------------------------------------------------ */
  /* testConnection                                                       */
  /* ------------------------------------------------------------------ */

  describe('testConnection', () => {
    it('should return ok: true with version from response headers (status 204)', async () => {
      mockAxiosService.fetch.mockResolvedValue(
        buildResponse({
          status: 204,
          data: '',
          headers: { 'x-influxdb-version': '2.7.1' },
        })
      )

      const result = await service.testConnection({
        baseUrl: 'https://influxdb.local:8086',
        token: 'my-secret-token',
      })

      expect(result.ok).toBe(true)
      expect(result.details).toContain('InfluxDB v2.7.1')
      expect(result.details).toContain('https://influxdb.local:8086')
      expect(mockAxiosService.fetch).toHaveBeenCalledWith(
        'https://influxdb.local:8086/ping',
        expect.objectContaining({
          headers: { Authorization: 'Token my-secret-token' },
          allowPrivateNetwork: true,
        })
      )
      expect(mockAppLogger.info).toHaveBeenCalled()
    })

    it('should return ok: true with version from response headers (status 200)', async () => {
      mockAxiosService.fetch.mockResolvedValue(
        buildResponse({
          status: 200,
          data: '',
          headers: { 'x-influxdb-version': '2.6.0' },
        })
      )

      const result = await service.testConnection({
        baseUrl: 'https://influxdb.local:8086',
        token: 'tok',
      })

      expect(result.ok).toBe(true)
      expect(result.details).toContain('InfluxDB v2.6.0')
    })

    it('should return ok: false when baseUrl is missing', async () => {
      const result = await service.testConnection({ token: 'abc' })

      expect(result.ok).toBe(false)
      expect(result.details).toBe('InfluxDB base URL not configured')
      expect(mockAxiosService.fetch).not.toHaveBeenCalled()
    })

    it('should return ok: false when token is missing', async () => {
      const result = await service.testConnection({
        baseUrl: 'https://influxdb.local:8086',
      })

      expect(result.ok).toBe(false)
      expect(result.details).toBe('InfluxDB token not configured')
      expect(mockAxiosService.fetch).not.toHaveBeenCalled()
    })

    it('should return ok: false when ping returns non-200/204', async () => {
      mockAxiosService.fetch.mockResolvedValue(buildResponse({ status: 401 }))

      const result = await service.testConnection({
        baseUrl: 'https://influxdb.local:8086',
        token: 'bad-token',
      })

      expect(result.ok).toBe(false)
      expect(result.details).toContain('returned status 401')
    })

    it('should return ok: false when fetch throws', async () => {
      mockAxiosService.fetch.mockRejectedValue(new Error('ECONNREFUSED'))

      const result = await service.testConnection({
        baseUrl: 'https://influxdb.local:8086',
        token: 'tok',
      })

      expect(result.ok).toBe(false)
      expect(result.details).toBe('ECONNREFUSED')
      expect(mockAppLogger.error).toHaveBeenCalled()
    })

    it('should return "Connection failed" when non-Error is thrown', async () => {
      mockAxiosService.fetch.mockRejectedValue({ code: 'UNKNOWN' })

      const result = await service.testConnection({
        baseUrl: 'https://influxdb.local:8086',
        token: 'tok',
      })

      expect(result.ok).toBe(false)
      expect(result.details).toBe('Connection failed')
    })

    it('should use "unknown" version when header is absent', async () => {
      mockAxiosService.fetch.mockResolvedValue(buildResponse({ status: 204, headers: {} }))

      const result = await service.testConnection({
        baseUrl: 'https://influxdb.local:8086',
        token: 'tok',
      })

      expect(result.ok).toBe(true)
      expect(result.details).toContain('InfluxDB vunknown')
    })

    it('should respect verifyTls setting', async () => {
      mockAxiosService.fetch.mockResolvedValue(buildResponse({ status: 204 }))

      await service.testConnection({
        baseUrl: 'https://influxdb.local:8086',
        token: 'tok',
        verifyTls: false,
      })

      expect(mockAxiosService.fetch).toHaveBeenCalledWith(
        'https://influxdb.local:8086/ping',
        expect.objectContaining({
          rejectUnauthorized: false,
        })
      )
    })
  })

  /* ------------------------------------------------------------------ */
  /* query                                                                */
  /* ------------------------------------------------------------------ */

  describe('query', () => {
    it('should execute a Flux query and return CSV data', async () => {
      const csvData = ',result,table,_time,_value\n,,0,2024-01-01T00:00:00Z,42'
      mockAxiosService.fetch.mockResolvedValue(buildResponse({ status: 200, data: csvData }))

      const fluxQuery = 'from(bucket: "metrics") |> range(start: -1h)'
      const result = await service.query(
        {
          baseUrl: 'https://influxdb.local:8086',
          token: 'tok',
          org: 'my-org',
        },
        fluxQuery
      )

      expect(result).toBe(csvData)
      expect(mockAxiosService.fetch).toHaveBeenCalledWith(
        'https://influxdb.local:8086/api/v2/query?org=my-org',
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: 'Token tok',
            'Content-Type': 'application/vnd.flux',
            Accept: 'application/csv',
          },
          body: fluxQuery,
          allowPrivateNetwork: true,
        })
      )
      expect(mockAppLogger.info).toHaveBeenCalled()
    })

    it('should use organization field when org is absent', async () => {
      mockAxiosService.fetch.mockResolvedValue(buildResponse({ status: 200, data: 'csv' }))

      await service.query(
        {
          baseUrl: 'https://influxdb.local:8086',
          token: 'tok',
          organization: 'alt-org',
        },
        'from(bucket: "b")'
      )

      expect(mockAxiosService.fetch).toHaveBeenCalledWith(
        'https://influxdb.local:8086/api/v2/query?org=alt-org',
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('should use empty string for org when neither org nor organization is provided', async () => {
      mockAxiosService.fetch.mockResolvedValue(buildResponse({ status: 200, data: 'csv' }))

      await service.query(
        {
          baseUrl: 'https://influxdb.local:8086',
          token: 'tok',
        },
        'from(bucket: "b")'
      )

      expect(mockAxiosService.fetch).toHaveBeenCalledWith(
        'https://influxdb.local:8086/api/v2/query?org=',
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('should throw when query returns non-200', async () => {
      mockAxiosService.fetch.mockResolvedValue(buildResponse({ status: 400 }))

      await expect(
        service.query(
          {
            baseUrl: 'https://influxdb.local:8086',
            token: 'tok',
            org: 'my-org',
          },
          'invalid flux'
        )
      ).rejects.toThrow('returned status 400')

      expect(mockAppLogger.warn).toHaveBeenCalled()
    })

    it('should propagate fetch errors', async () => {
      mockAxiosService.fetch.mockRejectedValue(new Error('timeout'))

      await expect(
        service.query(
          {
            baseUrl: 'https://influxdb.local:8086',
            token: 'tok',
            org: 'org',
          },
          'from(bucket: "b")'
        )
      ).rejects.toThrow('timeout')
    })

    it('should URL-encode the org parameter', async () => {
      mockAxiosService.fetch.mockResolvedValue(buildResponse({ status: 200, data: 'csv' }))

      await service.query(
        {
          baseUrl: 'https://influxdb.local:8086',
          token: 'tok',
          org: 'my org/special',
        },
        'from(bucket: "b")'
      )

      expect(mockAxiosService.fetch).toHaveBeenCalledWith(
        'https://influxdb.local:8086/api/v2/query?org=my%20org%2Fspecial',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  /* ------------------------------------------------------------------ */
  /* getBuckets                                                           */
  /* ------------------------------------------------------------------ */

  describe('getBuckets', () => {
    it('should return buckets array on success', async () => {
      const buckets = [
        { id: '1', name: 'metrics', retentionRules: [] },
        { id: '2', name: 'logs', retentionRules: [] },
      ]
      mockAxiosService.fetch.mockResolvedValue(buildResponse({ status: 200, data: { buckets } }))

      const result = await service.getBuckets({
        baseUrl: 'https://influxdb.local:8086',
        token: 'tok',
      })

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual(buckets[0])
      expect(result[1]).toEqual(buckets[1])
      expect(mockAxiosService.fetch).toHaveBeenCalledWith(
        'https://influxdb.local:8086/api/v2/buckets',
        expect.objectContaining({
          headers: { Authorization: 'Token tok' },
          allowPrivateNetwork: true,
        })
      )
      expect(mockAppLogger.info).toHaveBeenCalled()
    })

    it('should return empty array when buckets field is absent', async () => {
      mockAxiosService.fetch.mockResolvedValue(buildResponse({ status: 200, data: {} }))

      const result = await service.getBuckets({
        baseUrl: 'https://influxdb.local:8086',
        token: 'tok',
      })

      expect(result).toEqual([])
    })

    it('should throw when API returns non-200', async () => {
      mockAxiosService.fetch.mockResolvedValue(buildResponse({ status: 403 }))

      await expect(
        service.getBuckets({
          baseUrl: 'https://influxdb.local:8086',
          token: 'bad-tok',
        })
      ).rejects.toThrow('returned status 403')

      expect(mockAppLogger.warn).toHaveBeenCalled()
    })

    it('should propagate fetch errors', async () => {
      mockAxiosService.fetch.mockRejectedValue(new Error('DNS resolution failed'))

      await expect(
        service.getBuckets({
          baseUrl: 'https://influxdb.local:8086',
          token: 'tok',
        })
      ).rejects.toThrow('DNS resolution failed')
    })
  })
})
