import { LogstashService } from '../../src/modules/connectors/services/logstash.service'
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

function createService(): LogstashService {
  return new LogstashService(mockAppLogger as never, mockAxiosService as unknown as AxiosService)
}

function buildResponse(overrides: Partial<AxiosResponseData> = {}): AxiosResponseData {
  return {
    status: 200,
    data: {},
    headers: {},
    latencyMs: 28,
    ...overrides,
  }
}

describe('LogstashService', () => {
  let service: LogstashService

  beforeEach(() => {
    jest.clearAllMocks()
    mockAxiosService.basicAuth.mockImplementation(
      (username: string, password: string) =>
        `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
    )
    service = createService()
  })

  /* ------------------------------------------------------------------ */
  /* testConnection                                                       */
  /* ------------------------------------------------------------------ */

  describe('testConnection', () => {
    it('should return ok: true with version and status when root endpoint succeeds', async () => {
      mockAxiosService.fetch.mockResolvedValue(
        buildResponse({
          status: 200,
          data: {
            host: 'logstash-node-1',
            version: '8.12.1',
            status: 'green',
            http_address: '0.0.0.0:9600',
          },
        })
      )

      const result = await service.testConnection({
        baseUrl: 'http://logstash.local:9600',
      })

      expect(result.ok).toBe(true)
      expect(result.details).toContain('Logstash reachable at http://logstash.local:9600')
      expect(result.details).toContain('Version: 8.12.1')
      expect(result.details).toContain('Status: green')
      expect(mockAxiosService.fetch).toHaveBeenCalledWith(
        'http://logstash.local:9600/',
        expect.objectContaining({
          headers: {},
          allowPrivateNetwork: true,
        })
      )
      expect(mockAppLogger.info).toHaveBeenCalled()
    })

    it('should return ok: false when baseUrl is missing', async () => {
      const result = await service.testConnection({})

      expect(result.ok).toBe(false)
      expect(result.details).toBe('Logstash base URL not configured')
      expect(mockAxiosService.fetch).not.toHaveBeenCalled()
    })

    it('should return ok: false when root endpoint returns non-200', async () => {
      mockAxiosService.fetch.mockResolvedValue(buildResponse({ status: 500 }))

      const result = await service.testConnection({
        baseUrl: 'http://logstash.local:9600',
      })

      expect(result.ok).toBe(false)
      expect(result.details).toContain('returned status 500')
    })

    it('should return ok: false when fetch throws', async () => {
      mockAxiosService.fetch.mockRejectedValue(new Error('ECONNREFUSED'))

      const result = await service.testConnection({
        baseUrl: 'http://logstash.local:9600',
      })

      expect(result.ok).toBe(false)
      expect(result.details).toBe('ECONNREFUSED')
      expect(mockAppLogger.error).toHaveBeenCalled()
    })

    it('should return "Connection failed" when non-Error is thrown', async () => {
      mockAxiosService.fetch.mockRejectedValue(42)

      const result = await service.testConnection({
        baseUrl: 'http://logstash.local:9600',
      })

      expect(result.ok).toBe(false)
      expect(result.details).toBe('Connection failed')
    })

    it('should use "unknown" for version and status when fields are absent', async () => {
      mockAxiosService.fetch.mockResolvedValue(
        buildResponse({ status: 200, data: { host: 'node-1' } })
      )

      const result = await service.testConnection({
        baseUrl: 'http://logstash.local:9600',
      })

      expect(result.ok).toBe(true)
      expect(result.details).toContain('Version: unknown')
      expect(result.details).toContain('Status: unknown')
    })

    it('should include basic auth headers when username and password are provided', async () => {
      mockAxiosService.fetch.mockResolvedValue(
        buildResponse({ status: 200, data: { version: '8.12.1', status: 'green' } })
      )

      await service.testConnection({
        baseUrl: 'http://logstash.local:9600',
        username: 'elastic',
        password: 'changeme',
      })

      const expectedBasic = `Basic ${Buffer.from('elastic:changeme').toString('base64')}`
      expect(mockAxiosService.fetch).toHaveBeenCalledWith(
        'http://logstash.local:9600/',
        expect.objectContaining({
          headers: { Authorization: expectedBasic },
        })
      )
    })

    it('should not include auth headers when only username is provided (no password)', async () => {
      mockAxiosService.fetch.mockResolvedValue(
        buildResponse({ status: 200, data: { version: '8.12.1', status: 'green' } })
      )

      await service.testConnection({
        baseUrl: 'http://logstash.local:9600',
        username: 'elastic',
      })

      expect(mockAxiosService.fetch).toHaveBeenCalledWith(
        'http://logstash.local:9600/',
        expect.objectContaining({
          headers: {},
        })
      )
    })

    it('should respect verifyTls setting', async () => {
      mockAxiosService.fetch.mockResolvedValue(
        buildResponse({ status: 200, data: { version: '8.12.1', status: 'green' } })
      )

      await service.testConnection({
        baseUrl: 'https://logstash.local:9600',
        verifyTls: false,
      })

      expect(mockAxiosService.fetch).toHaveBeenCalledWith(
        'https://logstash.local:9600/',
        expect.objectContaining({
          rejectUnauthorized: false,
        })
      )
    })
  })

  /* ------------------------------------------------------------------ */
  /* getPipelines                                                         */
  /* ------------------------------------------------------------------ */

  describe('getPipelines', () => {
    it('should return pipelines object on success', async () => {
      const pipelines = {
        main: {
          workers: 4,
          batch_size: 125,
          batch_delay: 50,
        },
        secondary: {
          workers: 2,
          batch_size: 100,
          batch_delay: 50,
        },
      }
      mockAxiosService.fetch.mockResolvedValue(buildResponse({ status: 200, data: { pipelines } }))

      const result = await service.getPipelines({
        baseUrl: 'http://logstash.local:9600',
      })

      expect(result.pipelines).toEqual(pipelines)
      expect(Object.keys(result.pipelines)).toHaveLength(2)
      expect(mockAxiosService.fetch).toHaveBeenCalledWith(
        'http://logstash.local:9600/_node/pipelines',
        expect.objectContaining({
          headers: {},
          allowPrivateNetwork: true,
        })
      )
      expect(mockAppLogger.info).toHaveBeenCalled()
    })

    it('should return empty pipelines object when pipelines field is absent', async () => {
      mockAxiosService.fetch.mockResolvedValue(
        buildResponse({ status: 200, data: { host: 'node-1' } })
      )

      const result = await service.getPipelines({
        baseUrl: 'http://logstash.local:9600',
      })

      expect(result.pipelines).toEqual({})
    })

    it('should throw when API returns non-200', async () => {
      mockAxiosService.fetch.mockResolvedValue(buildResponse({ status: 503 }))

      await expect(
        service.getPipelines({
          baseUrl: 'http://logstash.local:9600',
        })
      ).rejects.toThrow('returned status 503')

      expect(mockAppLogger.warn).toHaveBeenCalled()
    })

    it('should propagate fetch errors', async () => {
      mockAxiosService.fetch.mockRejectedValue(new Error('Connection timed out'))

      await expect(
        service.getPipelines({
          baseUrl: 'http://logstash.local:9600',
        })
      ).rejects.toThrow('Connection timed out')
    })

    it('should include auth headers when credentials are provided', async () => {
      mockAxiosService.fetch.mockResolvedValue(
        buildResponse({ status: 200, data: { pipelines: {} } })
      )

      await service.getPipelines({
        baseUrl: 'http://logstash.local:9600',
        username: 'elastic',
        password: 'changeme',
      })

      const expectedBasic = `Basic ${Buffer.from('elastic:changeme').toString('base64')}`
      expect(mockAxiosService.fetch).toHaveBeenCalledWith(
        'http://logstash.local:9600/_node/pipelines',
        expect.objectContaining({
          headers: { Authorization: expectedBasic },
        })
      )
    })
  })

  /* ------------------------------------------------------------------ */
  /* getPipelineStats                                                      */
  /* ------------------------------------------------------------------ */

  describe('getPipelineStats', () => {
    it('should return pipeline stats on success', async () => {
      const pipelines = {
        main: {
          events: { in: 1000, out: 950, filtered: 50 },
          queue: { type: 'memory', events_count: 10 },
        },
      }
      mockAxiosService.fetch.mockResolvedValue(buildResponse({ status: 200, data: { pipelines } }))

      const result = await service.getPipelineStats({
        baseUrl: 'http://logstash.local:9600',
      })

      expect(result.pipelines).toEqual(pipelines)
      expect(mockAxiosService.fetch).toHaveBeenCalledWith(
        'http://logstash.local:9600/_node/stats/pipelines',
        expect.objectContaining({
          headers: {},
          allowPrivateNetwork: true,
        })
      )
      expect(mockAppLogger.info).toHaveBeenCalled()
    })

    it('should return empty pipelines object when pipelines field is absent', async () => {
      mockAxiosService.fetch.mockResolvedValue(buildResponse({ status: 200, data: {} }))

      const result = await service.getPipelineStats({
        baseUrl: 'http://logstash.local:9600',
      })

      expect(result.pipelines).toEqual({})
    })

    it('should throw when API returns non-200', async () => {
      mockAxiosService.fetch.mockResolvedValue(buildResponse({ status: 500 }))

      await expect(
        service.getPipelineStats({
          baseUrl: 'http://logstash.local:9600',
        })
      ).rejects.toThrow('returned status 500')

      expect(mockAppLogger.warn).toHaveBeenCalled()
    })

    it('should propagate fetch errors', async () => {
      mockAxiosService.fetch.mockRejectedValue(new Error('EHOSTUNREACH'))

      await expect(
        service.getPipelineStats({
          baseUrl: 'http://logstash.local:9600',
        })
      ).rejects.toThrow('EHOSTUNREACH')
    })

    it('should include auth headers when credentials are provided', async () => {
      mockAxiosService.fetch.mockResolvedValue(
        buildResponse({ status: 200, data: { pipelines: {} } })
      )

      await service.getPipelineStats({
        baseUrl: 'http://logstash.local:9600',
        username: 'admin',
        password: 'secret',
      })

      const expectedBasic = `Basic ${Buffer.from('admin:secret').toString('base64')}`
      expect(mockAxiosService.fetch).toHaveBeenCalledWith(
        'http://logstash.local:9600/_node/stats/pipelines',
        expect.objectContaining({
          headers: { Authorization: expectedBasic },
        })
      )
    })
  })

  /* ------------------------------------------------------------------ */
  /* getHotThreads                                                        */
  /* ------------------------------------------------------------------ */

  describe('getHotThreads', () => {
    it('should return hot threads data on success', async () => {
      const hotThreadsData = {
        hot_threads: {
          time: '2024-01-15T10:00:00Z',
          busiest_threads: 3,
          threads: [
            {
              name: 'LogStash::Runner',
              thread_id: 1,
              percent_of_cpu_time: 5.2,
              state: 'timed_waiting',
            },
          ],
        },
      }
      mockAxiosService.fetch.mockResolvedValue(buildResponse({ status: 200, data: hotThreadsData }))

      const result = await service.getHotThreads({
        baseUrl: 'http://logstash.local:9600',
      })

      expect(result).toEqual(hotThreadsData)
      expect(mockAxiosService.fetch).toHaveBeenCalledWith(
        'http://logstash.local:9600/_node/hot_threads?human=true',
        expect.objectContaining({
          headers: {},
          allowPrivateNetwork: true,
        })
      )
      expect(mockAppLogger.info).toHaveBeenCalled()
    })

    it('should throw when API returns non-200', async () => {
      mockAxiosService.fetch.mockResolvedValue(buildResponse({ status: 503 }))

      await expect(
        service.getHotThreads({
          baseUrl: 'http://logstash.local:9600',
        })
      ).rejects.toThrow('returned status 503')

      expect(mockAppLogger.warn).toHaveBeenCalled()
    })

    it('should propagate fetch errors', async () => {
      mockAxiosService.fetch.mockRejectedValue(new Error('Socket hang up'))

      await expect(
        service.getHotThreads({
          baseUrl: 'http://logstash.local:9600',
        })
      ).rejects.toThrow('Socket hang up')
    })

    it('should include auth headers when credentials are provided', async () => {
      mockAxiosService.fetch.mockResolvedValue(
        buildResponse({ status: 200, data: { hot_threads: {} } })
      )

      await service.getHotThreads({
        baseUrl: 'http://logstash.local:9600',
        username: 'elastic',
        password: 'changeme',
      })

      const expectedBasic = `Basic ${Buffer.from('elastic:changeme').toString('base64')}`
      expect(mockAxiosService.fetch).toHaveBeenCalledWith(
        'http://logstash.local:9600/_node/hot_threads?human=true',
        expect.objectContaining({
          headers: { Authorization: expectedBasic },
        })
      )
    })

    it('should return string data when response is not JSON', async () => {
      const plainText = '::: {Logstash}\nHot threads at 2024-01-15\n   5.2% cpu usage'
      mockAxiosService.fetch.mockResolvedValue(buildResponse({ status: 200, data: plainText }))

      const result = await service.getHotThreads({
        baseUrl: 'http://logstash.local:9600',
      })

      expect(result).toBe(plainText)
    })
  })
})
