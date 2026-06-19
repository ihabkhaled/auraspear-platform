import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
// Mock the api module before importing any service
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    put: vi.fn(),
  },
}))
// Mock the services module before importing hooks
vi.mock('@/services', () => ({
  explorerService: {
    getOverview: vi.fn(),
    searchGraylogLogs: vi.fn(),
    getGraylogEventDefinitions: vi.fn(),
    getGrafanaDashboards: vi.fn(),
    syncGrafana: vi.fn(),
    queryInfluxDB: vi.fn(),
    getInfluxDBBuckets: vi.fn(),
    searchMispEvents: vi.fn(),
    getMispEventDetail: vi.fn(),
    getVelociraptorEndpoints: vi.fn(),
    getVelociraptorHunts: vi.fn(),
    runVelociraptorVQL: vi.fn(),
    syncVelociraptor: vi.fn(),
    getLogstashLogs: vi.fn(),
    syncLogstash: vi.fn(),
    getShuffleWorkflows: vi.fn(),
    syncShuffle: vi.fn(),
    getSyncJobs: vi.fn(),
    triggerSync: vi.fn(),
  },
}))
// Mock the stores
vi.mock('@/stores', () => ({
  useTenantStore: vi.fn((selector: (s: { currentTenantId: string | null }) => unknown) =>
    selector({ currentTenantId: 'test-tenant-id' })
  ),
  useAuthStore: vi.fn((selector: (s: { permissions: string[] }) => unknown) =>
    selector({ permissions: ['explorer.query', 'connectors.sync'] })
  ),
}))
// Mock @tanstack/react-query to capture mutation/query configs
const mockInvalidateQueries = vi.fn()
vi.mock('@tanstack/react-query', () => {
  const keepPreviousData = Symbol('keepPreviousData')
  return {
    keepPreviousData,
    useQueryClient: () => ({
      invalidateQueries: mockInvalidateQueries,
    }),
    useQuery: vi.fn((opts: Record<string, unknown>) => ({
      queryKey: opts['queryKey'],
      queryFn: opts['queryFn'],
      _opts: opts,
    })),
    useMutation: vi.fn((opts: Record<string, unknown>) => {
      return {
        mutationFn: opts['mutationFn'],
        onSuccess: opts['onSuccess'],
        _opts: opts,
      }
    }),
  }
})
import {
  useExplorerOverview,
  useGraylogLogs,
  useGraylogEventDefinitions,
  useGrafanaDashboards,
  useSyncGrafana,
  useInfluxDBQuery,
  useInfluxDBBuckets,
  useMispExplorerEvents,
  useMispEventDetail,
  useVelociraptorEndpoints,
  useVelociraptorHunts,
  useRunVelociraptorVQL,
  useSyncVelociraptor,
  useLogstashLogs,
  useSyncLogstash,
  useShuffleWorkflows,
  useSyncShuffle,
  useSyncJobs,
  useTriggerSync,
} from '@/hooks/useExplorer'
import api from '@/lib/api'
import { explorerService as explorerServiceFromBarrel } from '@/services'
import { explorerService } from '@/services/explorer.service'

const mockGet = api.get as Mock
const mockPost = api.post as Mock

beforeEach(() => {
  vi.clearAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────
// Explorer Service
// ─────────────────────────────────────────────────────────────────────────────
describe('explorerService', () => {
  // ── Overview ──────────────────────────────────────────────────────────

  describe('getOverview', () => {
    it('should call GET /data-explorer/overview', async () => {
      const mockResponse = { graylog: { total: 10 }, grafana: { total: 5 } }
      mockGet.mockResolvedValue({ data: mockResponse })

      const result = await explorerService.getOverview()

      expect(mockGet).toHaveBeenCalledWith('/data-explorer/overview')
      expect(result).toEqual(mockResponse)
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Network error'))

      await expect(explorerService.getOverview()).rejects.toThrow('Network error')
    })
  })

  // ── Graylog ───────────────────────────────────────────────────────────

  describe('searchGraylogLogs', () => {
    it('should call GET /data-explorer/graylog/logs without params', async () => {
      const mockResponse = [{ id: 'log-1', message: 'test log' }]
      mockGet.mockResolvedValue({ data: mockResponse })

      const result = await explorerService.searchGraylogLogs()

      expect(mockGet).toHaveBeenCalledWith('/data-explorer/graylog/logs', { params: undefined })
      expect(result).toEqual(mockResponse)
    })

    it('should call GET /data-explorer/graylog/logs with search params', async () => {
      const params = { query: 'error', limit: 50 }
      const mockResponse = [{ id: 'log-2', message: 'error log' }]
      mockGet.mockResolvedValue({ data: mockResponse })

      const result = await explorerService.searchGraylogLogs(params as never)

      expect(mockGet).toHaveBeenCalledWith('/data-explorer/graylog/logs', { params })
      expect(result).toEqual(mockResponse)
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Graylog unavailable'))

      await expect(explorerService.searchGraylogLogs()).rejects.toThrow('Graylog unavailable')
    })
  })

  describe('getGraylogEventDefinitions', () => {
    it('should call GET /data-explorer/graylog/event-definitions', async () => {
      const mockResponse = [{ id: 'evt-1', title: 'SSH Brute Force' }]
      mockGet.mockResolvedValue({ data: mockResponse })

      const result = await explorerService.getGraylogEventDefinitions()

      expect(mockGet).toHaveBeenCalledWith('/data-explorer/graylog/event-definitions')
      expect(result).toEqual(mockResponse)
    })
  })

  // ── Grafana ───────────────────────────────────────────────────────────

  describe('getGrafanaDashboards', () => {
    it('should call GET /data-explorer/grafana/dashboards without params', async () => {
      const mockResponse = [{ uid: 'dash-1', title: 'Overview' }]
      mockGet.mockResolvedValue({ data: mockResponse })

      const result = await explorerService.getGrafanaDashboards()

      expect(mockGet).toHaveBeenCalledWith('/data-explorer/grafana/dashboards', {
        params: undefined,
      })
      expect(result).toEqual(mockResponse)
    })

    it('should call GET /data-explorer/grafana/dashboards with search params', async () => {
      const params = { search: 'network' }
      const mockResponse = [{ uid: 'dash-2', title: 'Network Dashboard' }]
      mockGet.mockResolvedValue({ data: mockResponse })

      const result = await explorerService.getGrafanaDashboards(params as never)

      expect(mockGet).toHaveBeenCalledWith('/data-explorer/grafana/dashboards', { params })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('syncGrafana', () => {
    it('should call POST /data-explorer/grafana/sync', async () => {
      const mockResponse = { synced: 12 }
      mockPost.mockResolvedValue({ data: mockResponse })

      const result = await explorerService.syncGrafana()

      expect(mockPost).toHaveBeenCalledWith('/data-explorer/grafana/sync')
      expect(result).toEqual(mockResponse)
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Sync failed'))

      await expect(explorerService.syncGrafana()).rejects.toThrow('Sync failed')
    })
  })

  // ── InfluxDB ──────────────────────────────────────────────────────────

  describe('queryInfluxDB', () => {
    it('should call GET /data-explorer/influxdb/query with params', async () => {
      const params = { bucket: 'telegraf', query: 'from(bucket: "telegraf")' }
      const mockResponse = { records: [{ time: '2025-01-01', value: 42 }] }
      mockGet.mockResolvedValue({ data: mockResponse })

      const result = await explorerService.queryInfluxDB(params as never)

      expect(mockGet).toHaveBeenCalledWith('/data-explorer/influxdb/query', { params })
      expect(result).toEqual(mockResponse)
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Query timeout'))

      await expect(
        explorerService.queryInfluxDB({ bucket: 'test', query: 'bad' } as never)
      ).rejects.toThrow('Query timeout')
    })
  })

  describe('getInfluxDBBuckets', () => {
    it('should call GET /data-explorer/influxdb/buckets', async () => {
      const mockResponse = [{ name: 'telegraf' }, { name: 'system' }]
      mockGet.mockResolvedValue({ data: mockResponse })

      const result = await explorerService.getInfluxDBBuckets()

      expect(mockGet).toHaveBeenCalledWith('/data-explorer/influxdb/buckets')
      expect(result).toEqual(mockResponse)
    })
  })

  // ── MISP ──────────────────────────────────────────────────────────────

  describe('searchMispEvents', () => {
    it('should call GET /data-explorer/misp/events without params', async () => {
      const mockResponse = [{ id: 'misp-1', info: 'Phishing Campaign' }]
      mockGet.mockResolvedValue({ data: mockResponse })

      const result = await explorerService.searchMispEvents()

      expect(mockGet).toHaveBeenCalledWith('/data-explorer/misp/events', { params: undefined })
      expect(result).toEqual(mockResponse)
    })

    it('should call GET /data-explorer/misp/events with search params', async () => {
      const params = { search: 'phishing' }
      const mockResponse = [{ id: 'misp-2', info: 'Phishing IOC' }]
      mockGet.mockResolvedValue({ data: mockResponse })

      const result = await explorerService.searchMispEvents(params as never)

      expect(mockGet).toHaveBeenCalledWith('/data-explorer/misp/events', { params })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('getMispEventDetail', () => {
    it('should call GET /data-explorer/misp/events/:eventId', async () => {
      const mockResponse = { id: 'misp-1', info: 'Phishing Campaign', attributes: [] }
      mockGet.mockResolvedValue({ data: mockResponse })

      const result = await explorerService.getMispEventDetail('misp-1')

      expect(mockGet).toHaveBeenCalledWith('/data-explorer/misp/events/misp-1')
      expect(result).toEqual(mockResponse)
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Event not found'))

      await expect(explorerService.getMispEventDetail('bad-id')).rejects.toThrow('Event not found')
    })
  })

  // ── Velociraptor ──────────────────────────────────────────────────────

  describe('getVelociraptorEndpoints', () => {
    it('should call GET /data-explorer/velociraptor/endpoints without params', async () => {
      const mockResponse = [{ clientId: 'C.1234', hostname: 'workstation-1' }]
      mockGet.mockResolvedValue({ data: mockResponse })

      const result = await explorerService.getVelociraptorEndpoints()

      expect(mockGet).toHaveBeenCalledWith('/data-explorer/velociraptor/endpoints', {
        params: undefined,
      })
      expect(result).toEqual(mockResponse)
    })

    it('should call GET /data-explorer/velociraptor/endpoints with search params', async () => {
      const params = { search: 'workstation' }
      const mockResponse = [{ clientId: 'C.1234', hostname: 'workstation-1' }]
      mockGet.mockResolvedValue({ data: mockResponse })

      const result = await explorerService.getVelociraptorEndpoints(params as never)

      expect(mockGet).toHaveBeenCalledWith('/data-explorer/velociraptor/endpoints', { params })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('getVelociraptorHunts', () => {
    it('should call GET /data-explorer/velociraptor/hunts without params', async () => {
      const mockResponse = [{ huntId: 'H.001', description: 'Malware scan' }]
      mockGet.mockResolvedValue({ data: mockResponse })

      const result = await explorerService.getVelociraptorHunts()

      expect(mockGet).toHaveBeenCalledWith('/data-explorer/velociraptor/hunts', {
        params: undefined,
      })
      expect(result).toEqual(mockResponse)
    })

    it('should call GET /data-explorer/velociraptor/hunts with search params', async () => {
      const params = { search: 'malware' }
      const mockResponse = [{ huntId: 'H.001', description: 'Malware scan' }]
      mockGet.mockResolvedValue({ data: mockResponse })

      const result = await explorerService.getVelociraptorHunts(params as never)

      expect(mockGet).toHaveBeenCalledWith('/data-explorer/velociraptor/hunts', { params })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('runVelociraptorVQL', () => {
    it('should call POST /data-explorer/velociraptor/vql with VQL query', async () => {
      const vql = 'SELECT * FROM info()'
      const mockResponse = { rows: [{ OS: 'Linux', Hostname: 'server-1' }] }
      mockPost.mockResolvedValue({ data: mockResponse })

      const result = await explorerService.runVelociraptorVQL(vql)

      expect(mockPost).toHaveBeenCalledWith('/data-explorer/velociraptor/vql', { vql })
      expect(result).toEqual(mockResponse)
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('VQL syntax error'))

      await expect(explorerService.runVelociraptorVQL('BAD VQL')).rejects.toThrow(
        'VQL syntax error'
      )
    })
  })

  describe('syncVelociraptor', () => {
    it('should call POST /data-explorer/velociraptor/sync', async () => {
      const mockResponse = { endpoints: 50, hunts: 10 }
      mockPost.mockResolvedValue({ data: mockResponse })

      const result = await explorerService.syncVelociraptor()

      expect(mockPost).toHaveBeenCalledWith('/data-explorer/velociraptor/sync')
      expect(result).toEqual(mockResponse)
    })
  })

  // ── Shuffle ───────────────────────────────────────────────────────────

  describe('getShuffleWorkflows', () => {
    it('should call GET /data-explorer/shuffle/workflows without params', async () => {
      const mockResponse = [{ id: 'wf-1', name: 'Alert Enrichment' }]
      mockGet.mockResolvedValue({ data: mockResponse })

      const result = await explorerService.getShuffleWorkflows()

      expect(mockGet).toHaveBeenCalledWith('/data-explorer/shuffle/workflows', {
        params: undefined,
      })
      expect(result).toEqual(mockResponse)
    })

    it('should call GET /data-explorer/shuffle/workflows with search params', async () => {
      const params = { search: 'enrichment' }
      const mockResponse = [{ id: 'wf-1', name: 'Alert Enrichment' }]
      mockGet.mockResolvedValue({ data: mockResponse })

      const result = await explorerService.getShuffleWorkflows(params as never)

      expect(mockGet).toHaveBeenCalledWith('/data-explorer/shuffle/workflows', { params })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('syncShuffle', () => {
    it('should call POST /data-explorer/shuffle/sync', async () => {
      const mockResponse = { synced: 8 }
      mockPost.mockResolvedValue({ data: mockResponse })

      const result = await explorerService.syncShuffle()

      expect(mockPost).toHaveBeenCalledWith('/data-explorer/shuffle/sync')
      expect(result).toEqual(mockResponse)
    })
  })

  // ── Sync Jobs ─────────────────────────────────────────────────────────

  describe('getSyncJobs', () => {
    it('should call GET /data-explorer/sync-jobs without params', async () => {
      const mockResponse = [{ id: 'job-1', status: 'completed' }]
      mockGet.mockResolvedValue({ data: mockResponse })

      const result = await explorerService.getSyncJobs()

      expect(mockGet).toHaveBeenCalledWith('/data-explorer/sync-jobs', { params: undefined })
      expect(result).toEqual(mockResponse)
    })

    it('should call GET /data-explorer/sync-jobs with search params', async () => {
      const params = { status: 'failed' }
      const mockResponse = [{ id: 'job-2', status: 'failed' }]
      mockGet.mockResolvedValue({ data: mockResponse })

      const result = await explorerService.getSyncJobs(params as never)

      expect(mockGet).toHaveBeenCalledWith('/data-explorer/sync-jobs', { params })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('triggerSync', () => {
    it('should call POST /data-explorer/sync-jobs/trigger with input', async () => {
      const input = { connector: 'grafana' }
      const mockResponse = { jobId: 'job-3' }
      mockPost.mockResolvedValue({ data: mockResponse })

      const result = await explorerService.triggerSync(input as never)

      expect(mockPost).toHaveBeenCalledWith('/data-explorer/sync-jobs/trigger', input)
      expect(result).toEqual(mockResponse)
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Sync already in progress'))

      await expect(explorerService.triggerSync({ connector: 'grafana' } as never)).rejects.toThrow(
        'Sync already in progress'
      )
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Explorer Hooks
// ─────────────────────────────────────────────────────────────────────────────
describe('useExplorer hooks', () => {
  const mockGetOverview = explorerServiceFromBarrel.getOverview as Mock
  const mockSearchGraylogLogs = explorerServiceFromBarrel.searchGraylogLogs as Mock
  const mockGetGraylogEventDefs = explorerServiceFromBarrel.getGraylogEventDefinitions as Mock
  const mockGetGrafanaDashboards = explorerServiceFromBarrel.getGrafanaDashboards as Mock
  const mockSyncGrafana = explorerServiceFromBarrel.syncGrafana as Mock
  const mockQueryInfluxDB = explorerServiceFromBarrel.queryInfluxDB as Mock
  const mockGetInfluxDBBuckets = explorerServiceFromBarrel.getInfluxDBBuckets as Mock
  const mockSearchMispEvents = explorerServiceFromBarrel.searchMispEvents as Mock
  const mockGetMispEventDetail = explorerServiceFromBarrel.getMispEventDetail as Mock
  const mockGetVelociraptorEndpoints = explorerServiceFromBarrel.getVelociraptorEndpoints as Mock
  const mockGetVelociraptorHunts = explorerServiceFromBarrel.getVelociraptorHunts as Mock
  const mockRunVelociraptorVQL = explorerServiceFromBarrel.runVelociraptorVQL as Mock
  const mockSyncVelociraptor = explorerServiceFromBarrel.syncVelociraptor as Mock
  const mockGetShuffleWorkflows = explorerServiceFromBarrel.getShuffleWorkflows as Mock
  const mockSyncShuffle = explorerServiceFromBarrel.syncShuffle as Mock
  const mockGetSyncJobs = explorerServiceFromBarrel.getSyncJobs as Mock
  const mockTriggerSync = explorerServiceFromBarrel.triggerSync as Mock

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ── Overview ──────────────────────────────────────────────────────────

  describe('useExplorerOverview', () => {
    it('should use correct query key', () => {
      const hook = useExplorerOverview() as unknown as { queryKey: unknown[] }

      expect(hook.queryKey).toEqual(['explorer', 'test-tenant-id', 'overview'])
    })

    it('should call explorerService.getOverview via queryFn', async () => {
      mockGetOverview.mockResolvedValue({ data: { graylog: { total: 5 } } })

      const hook = useExplorerOverview() as unknown as { queryFn: () => Promise<unknown> }
      await hook.queryFn()

      expect(mockGetOverview).toHaveBeenCalled()
    })
  })

  // ── Graylog ───────────────────────────────────────────────────────────

  describe('useGraylogLogs', () => {
    it('should use correct query key without params', () => {
      const hook = useGraylogLogs() as unknown as { queryKey: unknown[] }

      expect(hook.queryKey).toEqual(['explorer', 'test-tenant-id', 'graylog', 'logs', undefined])
    })

    it('should include params in query key', () => {
      const params = { query: 'error' } as never
      const hook = useGraylogLogs(params) as unknown as { queryKey: unknown[] }

      expect(hook.queryKey).toEqual(['explorer', 'test-tenant-id', 'graylog', 'logs', params])
    })

    it('should call explorerService.searchGraylogLogs via queryFn', async () => {
      mockSearchGraylogLogs.mockResolvedValue({ data: [] })

      const hook = useGraylogLogs() as unknown as { queryFn: () => Promise<unknown> }
      await hook.queryFn()

      expect(mockSearchGraylogLogs).toHaveBeenCalled()
    })
  })

  describe('useGraylogEventDefinitions', () => {
    it('should use correct query key', () => {
      const hook = useGraylogEventDefinitions() as unknown as { queryKey: unknown[] }

      expect(hook.queryKey).toEqual(['explorer', 'test-tenant-id', 'graylog', 'event-definitions'])
    })

    it('should call explorerService.getGraylogEventDefinitions via queryFn', async () => {
      mockGetGraylogEventDefs.mockResolvedValue({ data: [] })

      const hook = useGraylogEventDefinitions() as unknown as { queryFn: () => Promise<unknown> }
      await hook.queryFn()

      expect(mockGetGraylogEventDefs).toHaveBeenCalled()
    })
  })

  // ── Grafana ───────────────────────────────────────────────────────────

  describe('useGrafanaDashboards', () => {
    it('should use correct query key without params', () => {
      const hook = useGrafanaDashboards() as unknown as { queryKey: unknown[] }

      expect(hook.queryKey).toEqual([
        'explorer',
        'test-tenant-id',
        'grafana',
        'dashboards',
        undefined,
      ])
    })

    it('should include params in query key', () => {
      const params = { search: 'network' } as never
      const hook = useGrafanaDashboards(params) as unknown as { queryKey: unknown[] }

      expect(hook.queryKey).toEqual(['explorer', 'test-tenant-id', 'grafana', 'dashboards', params])
    })

    it('should call explorerService.getGrafanaDashboards via queryFn', async () => {
      mockGetGrafanaDashboards.mockResolvedValue({ data: [] })

      const hook = useGrafanaDashboards() as unknown as { queryFn: () => Promise<unknown> }
      await hook.queryFn()

      expect(mockGetGrafanaDashboards).toHaveBeenCalled()
    })
  })

  describe('useSyncGrafana', () => {
    it('should call explorerService.syncGrafana via mutationFn', async () => {
      mockSyncGrafana.mockResolvedValue({ data: { synced: 5 } })

      const hook = useSyncGrafana() as unknown as {
        mutationFn: () => Promise<unknown>
      }
      await hook.mutationFn()

      expect(mockSyncGrafana).toHaveBeenCalled()
    })

    it('should invalidate grafana and overview query keys on success', () => {
      const hook = useSyncGrafana() as unknown as {
        onSuccess: () => void
      }
      hook.onSuccess()

      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ['explorer', 'test-tenant-id', 'grafana'],
      })
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ['explorer', 'test-tenant-id', 'overview'],
      })
    })
  })

  // ── InfluxDB ──────────────────────────────────────────────────────────

  describe('useInfluxDBQuery', () => {
    it('should use correct query key with params', () => {
      const params = { bucket: 'telegraf', query: 'from(bucket: "telegraf")' } as never
      const hook = useInfluxDBQuery(params) as unknown as { queryKey: unknown[] }

      expect(hook.queryKey).toEqual(['explorer', 'test-tenant-id', 'influxdb', 'query', params])
    })

    it('should call explorerService.queryInfluxDB via queryFn', async () => {
      mockQueryInfluxDB.mockResolvedValue({ data: { records: [] } })
      const params = { bucket: 'telegraf', query: 'test' } as never

      const hook = useInfluxDBQuery(params) as unknown as { queryFn: () => Promise<unknown> }
      await hook.queryFn()

      expect(mockQueryInfluxDB).toHaveBeenCalled()
    })

    it('should support enabled parameter', () => {
      const params = { bucket: 'telegraf', query: 'test' } as never
      const hook = useInfluxDBQuery(params, false) as unknown as {
        _opts: Record<string, unknown>
      }

      expect(hook._opts['enabled']).toBe(false)
    })
  })

  describe('useInfluxDBBuckets', () => {
    it('should use correct query key', () => {
      const hook = useInfluxDBBuckets() as unknown as { queryKey: unknown[] }

      expect(hook.queryKey).toEqual(['explorer', 'test-tenant-id', 'influxdb', 'buckets'])
    })

    it('should call explorerService.getInfluxDBBuckets via queryFn', async () => {
      mockGetInfluxDBBuckets.mockResolvedValue({ data: [] })

      const hook = useInfluxDBBuckets() as unknown as { queryFn: () => Promise<unknown> }
      await hook.queryFn()

      expect(mockGetInfluxDBBuckets).toHaveBeenCalled()
    })
  })

  // ── MISP ──────────────────────────────────────────────────────────────

  describe('useMispExplorerEvents', () => {
    it('should use correct query key without params', () => {
      const hook = useMispExplorerEvents() as unknown as { queryKey: unknown[] }

      expect(hook.queryKey).toEqual(['explorer', 'test-tenant-id', 'misp', 'events', undefined])
    })

    it('should include params in query key', () => {
      const params = { search: 'phishing' } as never
      const hook = useMispExplorerEvents(params) as unknown as { queryKey: unknown[] }

      expect(hook.queryKey).toEqual(['explorer', 'test-tenant-id', 'misp', 'events', params])
    })

    it('should call explorerService.searchMispEvents via queryFn', async () => {
      mockSearchMispEvents.mockResolvedValue({ data: [] })

      const hook = useMispExplorerEvents() as unknown as { queryFn: () => Promise<unknown> }
      await hook.queryFn()

      expect(mockSearchMispEvents).toHaveBeenCalled()
    })
  })

  describe('useMispEventDetail', () => {
    it('should use correct query key with eventId', () => {
      const hook = useMispEventDetail('misp-1') as unknown as { queryKey: unknown[] }

      expect(hook.queryKey).toEqual(['explorer', 'test-tenant-id', 'misp', 'events', 'misp-1'])
    })

    it('should call explorerService.getMispEventDetail via queryFn', async () => {
      mockGetMispEventDetail.mockResolvedValue({ data: { id: 'misp-1' } })

      const hook = useMispEventDetail('misp-1') as unknown as { queryFn: () => Promise<unknown> }
      await hook.queryFn()

      expect(mockGetMispEventDetail).toHaveBeenCalled()
    })

    it('should support enabled parameter', () => {
      const hook = useMispEventDetail('misp-1', false) as unknown as {
        _opts: Record<string, unknown>
      }

      expect(hook._opts['enabled']).toBe(false)
    })

    it('should disable when eventId is empty', () => {
      const hook = useMispEventDetail('') as unknown as {
        _opts: Record<string, unknown>
      }

      expect(hook._opts['enabled']).toBe(false)
    })
  })

  // ── Velociraptor ──────────────────────────────────────────────────────

  describe('useVelociraptorEndpoints', () => {
    it('should use correct query key without params', () => {
      const hook = useVelociraptorEndpoints() as unknown as { queryKey: unknown[] }

      expect(hook.queryKey).toEqual([
        'explorer',
        'test-tenant-id',
        'velociraptor',
        'endpoints',
        undefined,
      ])
    })

    it('should include params in query key', () => {
      const params = { search: 'server' } as never
      const hook = useVelociraptorEndpoints(params) as unknown as { queryKey: unknown[] }

      expect(hook.queryKey).toEqual([
        'explorer',
        'test-tenant-id',
        'velociraptor',
        'endpoints',
        params,
      ])
    })

    it('should call explorerService.getVelociraptorEndpoints via queryFn', async () => {
      mockGetVelociraptorEndpoints.mockResolvedValue({ data: [] })

      const hook = useVelociraptorEndpoints() as unknown as { queryFn: () => Promise<unknown> }
      await hook.queryFn()

      expect(mockGetVelociraptorEndpoints).toHaveBeenCalled()
    })
  })

  describe('useVelociraptorHunts', () => {
    it('should use correct query key without params', () => {
      const hook = useVelociraptorHunts() as unknown as { queryKey: unknown[] }

      expect(hook.queryKey).toEqual([
        'explorer',
        'test-tenant-id',
        'velociraptor',
        'hunts',
        undefined,
      ])
    })

    it('should include params in query key', () => {
      const params = { search: 'malware' } as never
      const hook = useVelociraptorHunts(params) as unknown as { queryKey: unknown[] }

      expect(hook.queryKey).toEqual(['explorer', 'test-tenant-id', 'velociraptor', 'hunts', params])
    })

    it('should call explorerService.getVelociraptorHunts via queryFn', async () => {
      mockGetVelociraptorHunts.mockResolvedValue({ data: [] })

      const hook = useVelociraptorHunts() as unknown as { queryFn: () => Promise<unknown> }
      await hook.queryFn()

      expect(mockGetVelociraptorHunts).toHaveBeenCalled()
    })
  })

  describe('useRunVelociraptorVQL', () => {
    it('should call explorerService.runVelociraptorVQL via mutationFn', async () => {
      mockRunVelociraptorVQL.mockResolvedValue({ data: { rows: [] } })

      const hook = useRunVelociraptorVQL() as unknown as {
        mutationFn: (vql: string) => Promise<unknown>
      }
      await hook.mutationFn('SELECT * FROM info()')

      expect(mockRunVelociraptorVQL).toHaveBeenCalledWith('SELECT * FROM info()')
    })
  })

  describe('useSyncVelociraptor', () => {
    it('should call explorerService.syncVelociraptor via mutationFn', async () => {
      mockSyncVelociraptor.mockResolvedValue({ data: { endpoints: 10, hunts: 5 } })

      const hook = useSyncVelociraptor() as unknown as {
        mutationFn: () => Promise<unknown>
      }
      await hook.mutationFn()

      expect(mockSyncVelociraptor).toHaveBeenCalled()
    })

    it('should invalidate velociraptor and overview query keys on success', () => {
      const hook = useSyncVelociraptor() as unknown as {
        onSuccess: () => void
      }
      hook.onSuccess()

      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ['explorer', 'test-tenant-id', 'velociraptor'],
      })
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ['explorer', 'test-tenant-id', 'overview'],
      })
    })
  })

  // ── Shuffle ───────────────────────────────────────────────────────────

  describe('useShuffleWorkflows', () => {
    it('should use correct query key without params', () => {
      const hook = useShuffleWorkflows() as unknown as { queryKey: unknown[] }

      expect(hook.queryKey).toEqual([
        'explorer',
        'test-tenant-id',
        'shuffle',
        'workflows',
        undefined,
      ])
    })

    it('should include params in query key', () => {
      const params = { search: 'enrichment' } as never
      const hook = useShuffleWorkflows(params) as unknown as { queryKey: unknown[] }

      expect(hook.queryKey).toEqual(['explorer', 'test-tenant-id', 'shuffle', 'workflows', params])
    })

    it('should call explorerService.getShuffleWorkflows via queryFn', async () => {
      mockGetShuffleWorkflows.mockResolvedValue({ data: [] })

      const hook = useShuffleWorkflows() as unknown as { queryFn: () => Promise<unknown> }
      await hook.queryFn()

      expect(mockGetShuffleWorkflows).toHaveBeenCalled()
    })
  })

  describe('useSyncShuffle', () => {
    it('should call explorerService.syncShuffle via mutationFn', async () => {
      mockSyncShuffle.mockResolvedValue({ data: { synced: 3 } })

      const hook = useSyncShuffle() as unknown as {
        mutationFn: () => Promise<unknown>
      }
      await hook.mutationFn()

      expect(mockSyncShuffle).toHaveBeenCalled()
    })

    it('should invalidate shuffle and overview query keys on success', () => {
      const hook = useSyncShuffle() as unknown as {
        onSuccess: () => void
      }
      hook.onSuccess()

      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ['explorer', 'test-tenant-id', 'shuffle'],
      })
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ['explorer', 'test-tenant-id', 'overview'],
      })
    })
  })

  // ── Sync Jobs ─────────────────────────────────────────────────────────

  describe('useSyncJobs', () => {
    it('should use correct query key without params', () => {
      const hook = useSyncJobs() as unknown as { queryKey: unknown[] }

      expect(hook.queryKey).toEqual(['explorer', 'test-tenant-id', 'sync-jobs', undefined])
    })

    it('should include params in query key', () => {
      const params = { status: 'failed' } as never
      const hook = useSyncJobs(params) as unknown as { queryKey: unknown[] }

      expect(hook.queryKey).toEqual(['explorer', 'test-tenant-id', 'sync-jobs', params])
    })

    it('should call explorerService.getSyncJobs via queryFn', async () => {
      mockGetSyncJobs.mockResolvedValue({ data: [] })

      const hook = useSyncJobs() as unknown as { queryFn: () => Promise<unknown> }
      await hook.queryFn()

      expect(mockGetSyncJobs).toHaveBeenCalled()
    })
  })

  describe('useTriggerSync', () => {
    it('should call explorerService.triggerSync via mutationFn', async () => {
      const input = { connector: 'grafana' } as never
      mockTriggerSync.mockResolvedValue({ data: { jobId: 'job-1' } })

      const hook = useTriggerSync() as unknown as {
        mutationFn: (input: unknown) => Promise<unknown>
      }
      await hook.mutationFn(input)

      expect(mockTriggerSync).toHaveBeenCalledWith(input)
    })

    it('should invalidate sync-jobs and overview query keys on success', () => {
      const hook = useTriggerSync() as unknown as {
        onSuccess: () => void
      }
      hook.onSuccess()

      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ['explorer', 'test-tenant-id', 'sync-jobs'],
      })
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ['explorer', 'test-tenant-id', 'overview'],
      })
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Logstash Explorer Service
// ─────────────────────────────────────────────────────────────────────────────
describe('explorerService — Logstash', () => {
  describe('getLogstashLogs', () => {
    it('should call GET /data-explorer/logstash/logs without params', async () => {
      const mockResponse = [{ id: 'log-1', pipelineId: 'main', message: 'test', level: 'info' }]
      mockGet.mockResolvedValue({ data: mockResponse })

      const result = await explorerService.getLogstashLogs()

      expect(mockGet).toHaveBeenCalledWith('/data-explorer/logstash/logs', { params: undefined })
      expect(result).toEqual(mockResponse)
    })

    it('should call GET /data-explorer/logstash/logs with search params', async () => {
      const params = { search: 'error', level: 'warn', page: 1, limit: 20 }
      const mockResponse = { data: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } }
      mockGet.mockResolvedValue({ data: mockResponse })

      const result = await explorerService.getLogstashLogs(params as never)

      expect(mockGet).toHaveBeenCalledWith('/data-explorer/logstash/logs', { params })
      expect(result).toEqual(mockResponse)
    })

    it('should call GET with pipelineId filter', async () => {
      const params = { pipelineId: 'beats-input' }
      mockGet.mockResolvedValue({ data: { data: [], pagination: { total: 0 } } })

      await explorerService.getLogstashLogs(params as never)

      expect(mockGet).toHaveBeenCalledWith('/data-explorer/logstash/logs', { params })
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Logstash unavailable'))

      await expect(explorerService.getLogstashLogs()).rejects.toThrow('Logstash unavailable')
    })
  })

  describe('syncLogstash', () => {
    it('should call POST /data-explorer/logstash/sync', async () => {
      const mockResponse = { data: { synced: 5 } }
      mockPost.mockResolvedValue({ data: mockResponse })

      const result = await explorerService.syncLogstash()

      expect(mockPost).toHaveBeenCalledWith('/data-explorer/logstash/sync')
      expect(result).toEqual(mockResponse)
    })

    it('should propagate sync errors', async () => {
      mockPost.mockRejectedValue(new Error('Sync failed'))

      await expect(explorerService.syncLogstash()).rejects.toThrow('Sync failed')
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Logstash Explorer Hooks
// ─────────────────────────────────────────────────────────────────────────────
describe('Logstash hooks', () => {
  const mockGetLogstashLogs = explorerServiceFromBarrel.getLogstashLogs as Mock
  const mockSyncLogstash = explorerServiceFromBarrel.syncLogstash as Mock

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('useLogstashLogs', () => {
    it('should create a query with correct query key', () => {
      const params = { page: 1, limit: 20, search: 'test' } as never
      const result = useLogstashLogs(params) as unknown as {
        queryKey: unknown[]
        queryFn: () => Promise<unknown>
      }

      expect(result.queryKey).toEqual(['explorer', 'test-tenant-id', 'logstash', 'logs', params])
    })

    it('should call explorerService.getLogstashLogs in queryFn', async () => {
      const params = { page: 1, limit: 20 } as never
      mockGetLogstashLogs.mockResolvedValue({ data: [], pagination: { total: 0 } })

      const result = useLogstashLogs(params) as unknown as {
        queryFn: () => Promise<unknown>
      }
      await result.queryFn()

      expect(mockGetLogstashLogs).toHaveBeenCalledWith(params)
    })

    it('should call without params when none provided', async () => {
      mockGetLogstashLogs.mockResolvedValue({ data: [] })

      const result = useLogstashLogs() as unknown as {
        queryFn: () => Promise<unknown>
        queryKey: unknown[]
      }
      await result.queryFn()

      expect(result.queryKey).toEqual(['explorer', 'test-tenant-id', 'logstash', 'logs', undefined])
      expect(mockGetLogstashLogs).toHaveBeenCalledWith(undefined)
    })

    it('should include level filter in query key', () => {
      const params = { level: 'error' } as never
      const result = useLogstashLogs(params) as unknown as { queryKey: unknown[] }

      expect(result.queryKey).toEqual(['explorer', 'test-tenant-id', 'logstash', 'logs', params])
    })
  })

  describe('useSyncLogstash', () => {
    it('should call explorerService.syncLogstash in mutationFn', async () => {
      mockSyncLogstash.mockResolvedValue({ data: { synced: 3 } })

      const hook = useSyncLogstash() as unknown as {
        mutationFn: () => Promise<unknown>
      }
      await hook.mutationFn()

      expect(mockSyncLogstash).toHaveBeenCalled()
    })

    it('should invalidate logstash and overview query keys on success', () => {
      const hook = useSyncLogstash() as unknown as {
        onSuccess: () => void
      }
      hook.onSuccess()

      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ['explorer', 'test-tenant-id', 'logstash'],
      })
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ['explorer', 'test-tenant-id', 'overview'],
      })
    })
  })
})
