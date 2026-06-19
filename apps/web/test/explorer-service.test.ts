import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))
import api from '@/lib/api'
import { explorerService } from '@/services/explorer.service'

const mockGet = api.get as Mock
const mockPost = api.post as Mock

beforeEach(() => {
  vi.clearAllMocks()
})

describe('explorerService', () => {
  // ── Overview ──────────────────────────────────────────────────────
  describe('getOverview', () => {
    it('should call GET /data-explorer/overview', async () => {
      const mockData = { data: { connectors: [], syncJobs: { total: 0 } } }
      mockGet.mockResolvedValue({ data: mockData })

      const result = await explorerService.getOverview()

      expect(mockGet).toHaveBeenCalledWith('/data-explorer/overview')
      expect(result).toEqual(mockData)
    })
  })

  // ── Graylog ───────────────────────────────────────────────────────
  describe('searchGraylogLogs', () => {
    it('should call GET /data-explorer/graylog/logs with params', async () => {
      const params = { query: 'error', page: 1, limit: 20 }
      mockGet.mockResolvedValue({ data: { data: [] } })

      await explorerService.searchGraylogLogs(params)

      expect(mockGet).toHaveBeenCalledWith('/data-explorer/graylog/logs', { params })
    })

    it('should work without params', async () => {
      mockGet.mockResolvedValue({ data: { data: [] } })

      await explorerService.searchGraylogLogs()

      expect(mockGet).toHaveBeenCalledWith('/data-explorer/graylog/logs', { params: undefined })
    })
  })

  describe('getGraylogEventDefinitions', () => {
    it('should call GET /data-explorer/graylog/event-definitions', async () => {
      mockGet.mockResolvedValue({ data: { data: [{ id: 'ed1' }] } })

      const result = await explorerService.getGraylogEventDefinitions()

      expect(mockGet).toHaveBeenCalledWith('/data-explorer/graylog/event-definitions')
      expect(result.data).toHaveLength(1)
    })
  })

  // ── Grafana ───────────────────────────────────────────────────────
  describe('getGrafanaDashboards', () => {
    it('should call GET /data-explorer/grafana/dashboards with params', async () => {
      const params = { search: 'cpu' }
      mockGet.mockResolvedValue({ data: { data: [] } })

      await explorerService.getGrafanaDashboards(params)

      expect(mockGet).toHaveBeenCalledWith('/data-explorer/grafana/dashboards', { params })
    })
  })

  describe('syncGrafana', () => {
    it('should call POST /data-explorer/grafana/sync', async () => {
      mockPost.mockResolvedValue({ data: { data: { synced: 5 } } })

      const result = await explorerService.syncGrafana()

      expect(mockPost).toHaveBeenCalledWith('/data-explorer/grafana/sync')
      expect(result.data.synced).toBe(5)
    })
  })

  // ── InfluxDB ──────────────────────────────────────────────────────
  describe('queryInfluxDB', () => {
    it('should call GET /data-explorer/influxdb/query with params', async () => {
      const params = { query: 'from(bucket: "test")', bucket: 'test' }
      mockGet.mockResolvedValue({ data: { data: { rows: [] } } })

      await explorerService.queryInfluxDB(params as never)

      expect(mockGet).toHaveBeenCalledWith('/data-explorer/influxdb/query', { params })
    })
  })

  describe('getInfluxDBBuckets', () => {
    it('should call GET /data-explorer/influxdb/buckets', async () => {
      mockGet.mockResolvedValue({ data: { data: [{ name: 'default' }] } })

      const result = await explorerService.getInfluxDBBuckets()

      expect(mockGet).toHaveBeenCalledWith('/data-explorer/influxdb/buckets')
      expect(result.data).toHaveLength(1)
    })
  })

  // ── MISP ──────────────────────────────────────────────────────────
  describe('searchMispEvents', () => {
    it('should call GET /data-explorer/misp/events with params', async () => {
      mockGet.mockResolvedValue({ data: { data: [] } })

      await explorerService.searchMispEvents({ page: 1, limit: 10 } as never)

      expect(mockGet).toHaveBeenCalledWith('/data-explorer/misp/events', {
        params: { page: 1, limit: 10 },
      })
    })
  })

  describe('getMispEventDetail', () => {
    it('should call GET /data-explorer/misp/events/:id', async () => {
      mockGet.mockResolvedValue({ data: { data: { id: 'misp-1' } } })

      const result = await explorerService.getMispEventDetail('misp-1')

      expect(mockGet).toHaveBeenCalledWith('/data-explorer/misp/events/misp-1')
      expect((result.data as { id: string }).id).toBe('misp-1')
    })
  })

  // ── Logstash ────────────────────────────────────────────────────────
  describe('getLogstashLogs', () => {
    it('should call GET /data-explorer/logstash/logs', async () => {
      mockGet.mockResolvedValue({ data: { data: [] } })

      await explorerService.getLogstashLogs({ page: 1 } as never)

      expect(mockGet).toHaveBeenCalledWith('/data-explorer/logstash/logs', {
        params: { page: 1 },
      })
    })
  })

  describe('syncLogstash', () => {
    it('should call POST /data-explorer/logstash/sync', async () => {
      mockPost.mockResolvedValue({ data: { data: { synced: 3 } } })

      await explorerService.syncLogstash()

      expect(mockPost).toHaveBeenCalledWith('/data-explorer/logstash/sync')
    })
  })

  // ── Velociraptor ──────────────────────────────────────────────────
  describe('getVelociraptorEndpoints', () => {
    it('should call GET /data-explorer/velociraptor/endpoints', async () => {
      mockGet.mockResolvedValue({ data: { data: [] } })

      await explorerService.getVelociraptorEndpoints({ page: 1 } as never)

      expect(mockGet).toHaveBeenCalledWith('/data-explorer/velociraptor/endpoints', {
        params: { page: 1 },
      })
    })
  })

  describe('getVelociraptorHunts', () => {
    it('should call GET /data-explorer/velociraptor/hunts', async () => {
      mockGet.mockResolvedValue({ data: { data: [] } })

      await explorerService.getVelociraptorHunts()

      expect(mockGet).toHaveBeenCalledWith('/data-explorer/velociraptor/hunts', {
        params: undefined,
      })
    })
  })

  describe('runVelociraptorVQL', () => {
    it('should call POST /data-explorer/velociraptor/vql', async () => {
      mockPost.mockResolvedValue({ data: { data: { rows: [] } } })

      await explorerService.runVelociraptorVQL('SELECT * FROM info()')

      expect(mockPost).toHaveBeenCalledWith('/data-explorer/velociraptor/vql', {
        vql: 'SELECT * FROM info()',
      })
    })
  })

  describe('syncVelociraptor', () => {
    it('should call POST /data-explorer/velociraptor/sync', async () => {
      mockPost.mockResolvedValue({ data: { data: { endpoints: 10, hunts: 5 } } })

      const result = await explorerService.syncVelociraptor()

      expect(mockPost).toHaveBeenCalledWith('/data-explorer/velociraptor/sync')
      expect(result.data.endpoints).toBe(10)
    })
  })

  // ── Shuffle ───────────────────────────────────────────────────────
  describe('getShuffleWorkflows', () => {
    it('should call GET /data-explorer/shuffle/workflows', async () => {
      mockGet.mockResolvedValue({ data: { data: [] } })

      await explorerService.getShuffleWorkflows()

      expect(mockGet).toHaveBeenCalledWith('/data-explorer/shuffle/workflows', {
        params: undefined,
      })
    })
  })

  describe('syncShuffle', () => {
    it('should call POST /data-explorer/shuffle/sync', async () => {
      mockPost.mockResolvedValue({ data: { data: { synced: 2 } } })

      await explorerService.syncShuffle()

      expect(mockPost).toHaveBeenCalledWith('/data-explorer/shuffle/sync')
    })
  })

  // ── Sync Jobs ─────────────────────────────────────────────────────
  describe('getSyncJobs', () => {
    it('should call GET /data-explorer/sync-jobs with params', async () => {
      mockGet.mockResolvedValue({ data: { data: [] } })

      await explorerService.getSyncJobs({ page: 1, limit: 10 } as never)

      expect(mockGet).toHaveBeenCalledWith('/data-explorer/sync-jobs', {
        params: { page: 1, limit: 10 },
      })
    })
  })

  describe('triggerSync', () => {
    it('should call POST /data-explorer/sync-jobs/trigger', async () => {
      const input = { connectorType: 'graylog' }
      mockPost.mockResolvedValue({ data: { data: { jobId: 'job-1' } } })

      const result = await explorerService.triggerSync(input as never)

      expect(mockPost).toHaveBeenCalledWith('/data-explorer/sync-jobs/trigger', input)
      expect(result.data.jobId).toBe('job-1')
    })
  })

  // ── Error handling ────────────────────────────────────────────────
  describe('error handling', () => {
    it('should propagate API errors from GET', async () => {
      mockGet.mockRejectedValue(new Error('Network error'))

      await expect(explorerService.getOverview()).rejects.toThrow('Network error')
    })

    it('should propagate API errors from POST', async () => {
      mockPost.mockRejectedValue(new Error('Unauthorized'))

      await expect(explorerService.syncGrafana()).rejects.toThrow('Unauthorized')
    })
  })
})
