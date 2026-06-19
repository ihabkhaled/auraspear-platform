import { BusinessException } from '../../src/common/exceptions/business.exception'
import { toDay, nowDate } from '../../src/common/utils/date-time.utility'
import { DataExplorerService } from '../../src/modules/data-explorer/data-explorer.service'

const TENANT_ID = 'tenant-001'

const mockAppLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}

function createMockRepository() {
  return {
    findConnectorConfigs: jest.fn(),
    groupBySyncJobStatus: jest.fn(),
    createSyncJob: jest.fn(),
    findSyncJobById: jest.fn(),
    updateSyncJob: jest.fn(),
    findManySyncJobs: jest.fn(),
    countSyncJobs: jest.fn(),
    findManyGrafanaDashboards: jest.fn(),
    countGrafanaDashboards: jest.fn(),
    upsertGrafanaDashboard: jest.fn(),
    findManyVelociraptorEndpoints: jest.fn(),
    countVelociraptorEndpoints: jest.fn(),
    upsertVelociraptorEndpoint: jest.fn(),
    findManyVelociraptorHunts: jest.fn(),
    countVelociraptorHunts: jest.fn(),
    upsertVelociraptorHunt: jest.fn(),
    findManyLogstashLogs: jest.fn(),
    countLogstashLogs: jest.fn(),
    createLogstashLog: jest.fn(),
    findManyShuffleWorkflows: jest.fn(),
    countShuffleWorkflows: jest.fn(),
    upsertShuffleWorkflow: jest.fn(),
  }
}

function createMockConnectorServices() {
  return {
    connectorsService: {
      getDecryptedConfig: jest.fn(),
    },
    graylog: {
      searchEvents: jest.fn(),
      getEventDefinitions: jest.fn(),
    },
    grafana: {
      getDashboards: jest.fn(),
    },
    influxdb: {
      query: jest.fn(),
      getBuckets: jest.fn(),
    },
    misp: {
      getEvents: jest.fn(),
      searchAttributes: jest.fn(),
      getEvent: jest.fn(),
    },
    velociraptor: {
      getClients: jest.fn(),
      runVQL: jest.fn(),
    },
    shuffle: {
      getWorkflows: jest.fn(),
    },
    logstash: {
      getPipelineStats: jest.fn(),
    },
  }
}

function createService(
  repository: ReturnType<typeof createMockRepository>,
  services: ReturnType<typeof createMockConnectorServices>
) {
  return new DataExplorerService(
    repository as never,
    services.connectorsService as never,
    services.graylog as never,
    services.grafana as never,
    services.influxdb as never,
    services.misp as never,
    services.velociraptor as never,
    services.shuffle as never,
    services.logstash as never,
    mockAppLogger as never
  )
}

describe('DataExplorerService', () => {
  let repository: ReturnType<typeof createMockRepository>
  let services: ReturnType<typeof createMockConnectorServices>
  let service: DataExplorerService

  beforeEach(() => {
    jest.clearAllMocks()
    repository = createMockRepository()
    services = createMockConnectorServices()
    service = createService(repository, services)
  })

  /* ------------------------------------------------------------------ */
  /* getOverview                                                          */
  /* ------------------------------------------------------------------ */

  describe('getOverview', () => {
    it('should return connectors and sync job summary', async () => {
      repository.findConnectorConfigs.mockResolvedValue([
        {
          type: 'graylog',
          enabled: true,
          lastTestOk: true,
          lastSyncAt: toDay('2025-01-01T00:00:00.000Z').toDate(),
        },
        { type: 'grafana', enabled: false, lastTestOk: false, lastSyncAt: null },
      ])
      repository.groupBySyncJobStatus.mockResolvedValue([
        { status: 'running', connectorType: 'grafana', _count: 2 },
        { status: 'completed', connectorType: 'graylog', _count: 10 },
        { status: 'failed', connectorType: 'logstash', _count: 1 },
      ])

      const result = await service.getOverview(TENANT_ID)

      expect(result.connectors).toHaveLength(2)
      expect(result.connectors[0]).toEqual({
        type: 'graylog',
        enabled: true,
        configured: true,
        lastSyncAt: '2025-01-01T00:00:00.000Z',
      })
      expect(result.connectors[1]).toEqual({
        type: 'grafana',
        enabled: false,
        configured: false,
        lastSyncAt: null,
      })
      expect(result.syncJobsSummary).toEqual({
        running: { count: 2, connectors: ['grafana'] },
        completed: { count: 10, connectors: ['graylog'] },
        failed: { count: 1, connectors: ['logstash'] },
      })
    })

    it('should handle empty connectors and sync jobs', async () => {
      repository.findConnectorConfigs.mockResolvedValue([])
      repository.groupBySyncJobStatus.mockResolvedValue([])

      const result = await service.getOverview(TENANT_ID)

      expect(result.connectors).toHaveLength(0)
      expect(result.syncJobsSummary).toEqual({
        running: { count: 0, connectors: [] },
        completed: { count: 0, connectors: [] },
        failed: { count: 0, connectors: [] },
      })
    })
  })

  /* ------------------------------------------------------------------ */
  /* Graylog                                                              */
  /* ------------------------------------------------------------------ */

  describe('searchGraylogLogs', () => {
    it('should fetch logs from graylog service', async () => {
      services.connectorsService.getDecryptedConfig.mockResolvedValue({ baseUrl: 'http://graylog' })
      services.graylog.searchEvents.mockResolvedValue({
        events: [{ id: 'e1', message: 'test' }],
        total: 1,
      })

      const result = await service.searchGraylogLogs(TENANT_ID, {
        query: 'error',
        timeRange: 86400,
        page: 1,
        limit: 20,
        sortOrder: 'desc',
      })

      expect(services.connectorsService.getDecryptedConfig).toHaveBeenCalledWith(
        TENANT_ID,
        'graylog'
      )
      expect(services.graylog.searchEvents).toHaveBeenCalledWith(
        { baseUrl: 'http://graylog' },
        expect.objectContaining({ query: 'error', page: 1, per_page: 20 })
      )
      expect(result.data).toHaveLength(1)
      expect(result.pagination.total).toBe(1)
    })

    it('should throw if graylog not configured', async () => {
      services.connectorsService.getDecryptedConfig.mockResolvedValue(null)

      await expect(
        service.searchGraylogLogs(TENANT_ID, {
          query: '*',
          timeRange: 86400,
          page: 1,
          limit: 20,
          sortOrder: 'desc',
        })
      ).rejects.toThrow(BusinessException)
    })

    it('should throw BusinessException 502 when graylog is unreachable', async () => {
      services.connectorsService.getDecryptedConfig.mockResolvedValue({ baseUrl: 'http://graylog' })
      services.graylog.searchEvents.mockRejectedValue(new Error('ECONNREFUSED'))

      await expect(
        service.searchGraylogLogs(TENANT_ID, {
          query: '*',
          timeRange: 86400,
          page: 1,
          limit: 20,
          sortOrder: 'desc',
        })
      ).rejects.toThrow(BusinessException)
    })
  })

  describe('getGraylogEventDefinitions', () => {
    it('should return event definitions', async () => {
      services.connectorsService.getDecryptedConfig.mockResolvedValue({ baseUrl: 'http://graylog' })
      services.graylog.getEventDefinitions.mockResolvedValue([{ id: 'ed1', title: 'Test' }])

      const result = await service.getGraylogEventDefinitions(TENANT_ID)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({ id: 'ed1', title: 'Test' })
    })
  })

  /* ------------------------------------------------------------------ */
  /* Grafana                                                              */
  /* ------------------------------------------------------------------ */

  describe('getGrafanaDashboards', () => {
    it('should return paginated dashboards from DB', async () => {
      const dashboards = [{ id: 'd1', uid: 'abc', title: 'Dashboard 1', tags: ['prod'] }]
      repository.findManyGrafanaDashboards.mockResolvedValue(dashboards)
      repository.countGrafanaDashboards.mockResolvedValue(1)

      const result = await service.getGrafanaDashboards(TENANT_ID, {
        page: 1,
        limit: 20,
        sortOrder: 'asc',
      })

      expect(result.data).toHaveLength(1)
      expect(result.pagination.total).toBe(1)
      expect(result.pagination.page).toBe(1)
    })

    it('should apply search filter', async () => {
      repository.findManyGrafanaDashboards.mockResolvedValue([])
      repository.countGrafanaDashboards.mockResolvedValue(0)

      await service.getGrafanaDashboards(TENANT_ID, {
        page: 1,
        limit: 20,
        search: 'api',
        sortOrder: 'asc',
      })

      expect(repository.findManyGrafanaDashboards).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            title: { contains: 'api', mode: 'insensitive' },
          }),
        })
      )
    })

    it('should filter by tag', async () => {
      repository.findManyGrafanaDashboards.mockResolvedValue([])
      repository.countGrafanaDashboards.mockResolvedValue(0)

      await service.getGrafanaDashboards(TENANT_ID, {
        page: 1,
        limit: 20,
        tag: 'production',
        sortOrder: 'asc',
      })

      expect(repository.findManyGrafanaDashboards).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tags: { has: 'production' },
          }),
        })
      )
    })

    it('should filter by folder', async () => {
      repository.findManyGrafanaDashboards.mockResolvedValue([])
      repository.countGrafanaDashboards.mockResolvedValue(0)

      await service.getGrafanaDashboards(TENANT_ID, {
        page: 1,
        limit: 20,
        folder: 'SOC',
        sortOrder: 'asc',
      })

      expect(repository.findManyGrafanaDashboards).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            folderTitle: { contains: 'SOC', mode: 'insensitive' },
          }),
        })
      )
    })

    it('should filter by starred', async () => {
      repository.findManyGrafanaDashboards.mockResolvedValue([])
      repository.countGrafanaDashboards.mockResolvedValue(0)

      await service.getGrafanaDashboards(TENANT_ID, {
        page: 1,
        limit: 20,
        starred: true,
        sortOrder: 'asc',
      })

      expect(repository.findManyGrafanaDashboards).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isStarred: true,
          }),
        })
      )
    })

    it('should handle pagination correctly', async () => {
      repository.findManyGrafanaDashboards.mockResolvedValue([])
      repository.countGrafanaDashboards.mockResolvedValue(50)

      const result = await service.getGrafanaDashboards(TENANT_ID, {
        page: 3,
        limit: 10,
        sortOrder: 'asc',
      })

      expect(result.pagination.total).toBe(50)
      expect(result.pagination.page).toBe(3)
      expect(repository.findManyGrafanaDashboards).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 })
      )
    })
  })

  describe('syncGrafanaDashboards', () => {
    it('should sync dashboards from grafana service to DB', async () => {
      services.connectorsService.getDecryptedConfig.mockResolvedValue({ baseUrl: 'http://grafana' })
      services.grafana.getDashboards.mockResolvedValue([
        {
          uid: 'abc',
          title: 'Dashboard 1',
          url: '/d/abc',
          tags: ['prod'],
          type: 'dash-db',
          isStarred: false,
        },
      ])
      repository.createSyncJob.mockResolvedValue({ id: 'job-1', startedAt: nowDate() })
      repository.upsertGrafanaDashboard.mockResolvedValue({})
      repository.findSyncJobById.mockResolvedValue({ id: 'job-1', startedAt: nowDate() })
      repository.updateSyncJob.mockResolvedValue({})

      const result = await service.syncGrafanaDashboards(TENANT_ID)

      expect(result.synced).toBe(1)
      expect(repository.upsertGrafanaDashboard).toHaveBeenCalledTimes(1)
      expect(repository.updateSyncJob).toHaveBeenCalledWith(
        'job-1',
        TENANT_ID,
        expect.objectContaining({ status: 'completed', recordsSynced: 1 })
      )
    })

    it('should throw BusinessException when Grafana is unreachable', async () => {
      services.connectorsService.getDecryptedConfig.mockResolvedValue({ baseUrl: 'http://grafana' })
      services.grafana.getDashboards.mockRejectedValue(new Error('ECONNREFUSED'))

      await expect(service.syncGrafanaDashboards(TENANT_ID)).rejects.toThrow(BusinessException)
    })

    it('should throw BusinessException when Grafana not configured', async () => {
      services.connectorsService.getDecryptedConfig.mockResolvedValue(null)

      await expect(service.syncGrafanaDashboards(TENANT_ID)).rejects.toThrow(BusinessException)
    })

    it('should handle dashboards with missing uid', async () => {
      services.connectorsService.getDecryptedConfig.mockResolvedValue({ baseUrl: 'http://grafana' })
      services.grafana.getDashboards.mockResolvedValue([
        { title: 'No UID' }, // uid missing
      ])
      repository.createSyncJob.mockResolvedValue({ id: 'job-1', startedAt: nowDate() })
      repository.findSyncJobById.mockResolvedValue({ id: 'job-1', startedAt: nowDate() })
      repository.updateSyncJob.mockResolvedValue({})

      const result = await service.syncGrafanaDashboards(TENANT_ID)

      expect(result.synced).toBe(0)
      expect(repository.upsertGrafanaDashboard).not.toHaveBeenCalled()
    })
  })

  /* ------------------------------------------------------------------ */
  /* InfluxDB                                                             */
  /* ------------------------------------------------------------------ */

  describe('queryInfluxDB', () => {
    it('should query influxdb with sanitized flux', async () => {
      services.connectorsService.getDecryptedConfig.mockResolvedValue({ url: 'http://influx' })
      services.influxdb.query.mockResolvedValue('csv-data-here')

      const result = await service.queryInfluxDB(TENANT_ID, {
        bucket: 'telemetry',
        range: '-1h',
        limit: 100,
      })

      expect(result.data).toBe('csv-data-here')
      expect(result.bucket).toBe('telemetry')
      expect(services.influxdb.query).toHaveBeenCalledWith(
        { url: 'http://influx' },
        expect.stringContaining('from(bucket: "telemetry")')
      )
    })

    it('should include measurement filter when provided', async () => {
      services.connectorsService.getDecryptedConfig.mockResolvedValue({ url: 'http://influx' })
      services.influxdb.query.mockResolvedValue('')

      await service.queryInfluxDB(TENANT_ID, {
        bucket: 'telemetry',
        measurement: 'cpu',
        range: '-1h',
        limit: 100,
      })

      expect(services.influxdb.query).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('r._measurement == "cpu"')
      )
    })

    it('should throw BusinessException 502 when InfluxDB is unreachable', async () => {
      services.connectorsService.getDecryptedConfig.mockResolvedValue({ url: 'http://influx' })
      services.influxdb.query.mockRejectedValue(new Error('ECONNREFUSED'))

      await expect(
        service.queryInfluxDB(TENANT_ID, { bucket: 'test', range: '-1h', limit: 100 })
      ).rejects.toThrow(BusinessException)
    })

    it('should sanitize unsafe flux duration', async () => {
      services.connectorsService.getDecryptedConfig.mockResolvedValue({ url: 'http://influx' })
      services.influxdb.query.mockResolvedValue('')

      await service.queryInfluxDB(TENANT_ID, {
        bucket: 'test',
        range: 'DROP TABLE;',
        limit: 100,
      })

      // Should fallback to -1h for invalid duration
      expect(services.influxdb.query).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('range(start: -1h)')
      )
    })
  })

  describe('getInfluxDBBuckets', () => {
    it('should throw BusinessException 502 when InfluxDB is unreachable', async () => {
      services.connectorsService.getDecryptedConfig.mockResolvedValue({ url: 'http://influx' })
      services.influxdb.getBuckets.mockRejectedValue(new Error('ECONNREFUSED'))

      await expect(service.getInfluxDBBuckets(TENANT_ID)).rejects.toThrow(BusinessException)
    })

    it('should return buckets list', async () => {
      services.connectorsService.getDecryptedConfig.mockResolvedValue({ url: 'http://influx' })
      services.influxdb.getBuckets.mockResolvedValue([{ name: 'default' }, { name: 'telemetry' }])

      const result = await service.getInfluxDBBuckets(TENANT_ID)

      expect(result).toHaveLength(2)
    })
  })

  /* ------------------------------------------------------------------ */
  /* MISP                                                                 */
  /* ------------------------------------------------------------------ */

  describe('searchMispEvents', () => {
    it('should list events when no filters', async () => {
      services.connectorsService.getDecryptedConfig.mockResolvedValue({ url: 'http://misp' })
      services.misp.getEvents.mockResolvedValue([{ id: '1', info: 'Event 1' }])

      const result = await service.searchMispEvents(TENANT_ID, {
        page: 1,
        limit: 20,
        sortOrder: 'desc',
      })

      expect(services.misp.getEvents).toHaveBeenCalled()
      expect(result.data).toHaveLength(1)
    })

    it('should throw BusinessException 502 when MISP is unreachable', async () => {
      services.connectorsService.getDecryptedConfig.mockResolvedValue({ url: 'http://misp' })
      services.misp.getEvents.mockRejectedValue(new Error('ECONNREFUSED'))

      await expect(
        service.searchMispEvents(TENANT_ID, { page: 1, limit: 20, sortOrder: 'desc' })
      ).rejects.toThrow(BusinessException)
    })

    it('should search attributes when value filter provided', async () => {
      services.connectorsService.getDecryptedConfig.mockResolvedValue({ url: 'http://misp' })
      services.misp.searchAttributes.mockResolvedValue([{ id: 'a1', value: '192.168.1.1' }])

      const result = await service.searchMispEvents(TENANT_ID, {
        page: 1,
        limit: 20,
        value: '192.168.1.1',
        sortOrder: 'desc',
      })

      expect(services.misp.searchAttributes).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ value: '192.168.1.1' })
      )
      expect(result.data).toHaveLength(1)
    })
  })

  describe('getMispEventDetail', () => {
    it('should fetch single event', async () => {
      services.connectorsService.getDecryptedConfig.mockResolvedValue({ url: 'http://misp' })
      services.misp.getEvent.mockResolvedValue({ id: '42', info: 'Detailed event' })

      const result = await service.getMispEventDetail(TENANT_ID, '42')

      expect(services.misp.getEvent).toHaveBeenCalledWith({ url: 'http://misp' }, '42')
      expect(result).toEqual({ id: '42', info: 'Detailed event' })
    })
  })

  /* ------------------------------------------------------------------ */
  /* Velociraptor                                                         */
  /* ------------------------------------------------------------------ */

  describe('getVelociraptorEndpoints', () => {
    it('should return paginated endpoints from DB', async () => {
      repository.findManyVelociraptorEndpoints.mockResolvedValue([
        { id: 'e1', hostname: 'host1', os: 'Windows' },
      ])
      repository.countVelociraptorEndpoints.mockResolvedValue(1)

      const result = await service.getVelociraptorEndpoints(TENANT_ID, {
        page: 1,
        limit: 20,
        sortOrder: 'asc',
      })

      expect(result.data).toHaveLength(1)
      expect(result.pagination.total).toBe(1)
    })

    it('should filter by hostname search', async () => {
      repository.findManyVelociraptorEndpoints.mockResolvedValue([])
      repository.countVelociraptorEndpoints.mockResolvedValue(0)

      await service.getVelociraptorEndpoints(TENANT_ID, {
        page: 1,
        limit: 20,
        search: 'server',
        sortOrder: 'asc',
      })

      expect(repository.findManyVelociraptorEndpoints).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            hostname: { contains: 'server', mode: 'insensitive' },
          }),
        })
      )
    })

    it('should filter by OS', async () => {
      repository.findManyVelociraptorEndpoints.mockResolvedValue([])
      repository.countVelociraptorEndpoints.mockResolvedValue(0)

      await service.getVelociraptorEndpoints(TENANT_ID, {
        page: 1,
        limit: 20,
        os: 'Windows',
        sortOrder: 'asc',
      })

      expect(repository.findManyVelociraptorEndpoints).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            os: { contains: 'Windows', mode: 'insensitive' },
          }),
        })
      )
    })

    it('should filter by label', async () => {
      repository.findManyVelociraptorEndpoints.mockResolvedValue([])
      repository.countVelociraptorEndpoints.mockResolvedValue(0)

      await service.getVelociraptorEndpoints(TENANT_ID, {
        page: 1,
        limit: 20,
        label: 'production',
        sortOrder: 'asc',
      })

      expect(repository.findManyVelociraptorEndpoints).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            labels: { has: 'production' },
          }),
        })
      )
    })

    it('should handle pagination correctly', async () => {
      repository.findManyVelociraptorEndpoints.mockResolvedValue([])
      repository.countVelociraptorEndpoints.mockResolvedValue(200)

      const result = await service.getVelociraptorEndpoints(TENANT_ID, {
        page: 5,
        limit: 10,
        sortOrder: 'asc',
      })

      expect(result.pagination.total).toBe(200)
      expect(result.pagination.page).toBe(5)
      expect(repository.findManyVelociraptorEndpoints).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 40, take: 10 })
      )
    })
  })

  describe('getVelociraptorHunts', () => {
    it('should return paginated hunts from DB', async () => {
      repository.findManyVelociraptorHunts.mockResolvedValue([
        { id: 'h1', huntId: 'H.1234', description: 'Test hunt' },
      ])
      repository.countVelociraptorHunts.mockResolvedValue(1)

      const result = await service.getVelociraptorHunts(TENANT_ID, {
        page: 1,
        limit: 20,
        sortOrder: 'desc',
      })

      expect(result.data).toHaveLength(1)
      expect(result.pagination.total).toBe(1)
    })

    it('should filter by description search', async () => {
      repository.findManyVelociraptorHunts.mockResolvedValue([])
      repository.countVelociraptorHunts.mockResolvedValue(0)

      await service.getVelociraptorHunts(TENANT_ID, {
        page: 1,
        limit: 20,
        search: 'malware',
        sortOrder: 'desc',
      })

      expect(repository.findManyVelociraptorHunts).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            description: { contains: 'malware', mode: 'insensitive' },
          }),
        })
      )
    })

    it('should filter by state', async () => {
      repository.findManyVelociraptorHunts.mockResolvedValue([])
      repository.countVelociraptorHunts.mockResolvedValue(0)

      await service.getVelociraptorHunts(TENANT_ID, {
        page: 1,
        limit: 20,
        state: 'RUNNING',
        sortOrder: 'desc',
      })

      expect(repository.findManyVelociraptorHunts).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            state: 'RUNNING',
          }),
        })
      )
    })
  })

  describe('runVelociraptorVQL', () => {
    it('should execute VQL and return results', async () => {
      services.connectorsService.getDecryptedConfig.mockResolvedValue({ apiUrl: 'http://vr' })
      services.velociraptor.runVQL.mockResolvedValue({
        rows: [{ ClientId: 'C.123' }],
        columns: ['ClientId'],
      })

      const result = await service.runVelociraptorVQL(TENANT_ID, 'SELECT * FROM info()')

      expect(services.velociraptor.runVQL).toHaveBeenCalledWith(
        { apiUrl: 'http://vr' },
        'SELECT * FROM info()'
      )
      expect(result.rows).toHaveLength(1)
      expect(result.columns).toEqual(['ClientId'])
    })
  })

  /* ------------------------------------------------------------------ */
  /* Shuffle                                                              */
  /* ------------------------------------------------------------------ */

  describe('getShuffleWorkflows', () => {
    it('should return paginated workflows from DB', async () => {
      repository.findManyShuffleWorkflows.mockResolvedValue([
        { id: 'w1', name: 'Workflow 1', isValid: true },
      ])
      repository.countShuffleWorkflows.mockResolvedValue(1)

      const result = await service.getShuffleWorkflows(TENANT_ID, {
        page: 1,
        limit: 20,
        sortOrder: 'asc',
      })

      expect(result.data).toHaveLength(1)
      expect(result.pagination.total).toBe(1)
    })

    it('should filter by valid status', async () => {
      repository.findManyShuffleWorkflows.mockResolvedValue([])
      repository.countShuffleWorkflows.mockResolvedValue(0)

      await service.getShuffleWorkflows(TENANT_ID, {
        page: 1,
        limit: 20,
        status: 'valid',
        sortOrder: 'asc',
      })

      expect(repository.findManyShuffleWorkflows).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isValid: true }),
        })
      )
    })

    it('should filter by invalid status', async () => {
      repository.findManyShuffleWorkflows.mockResolvedValue([])
      repository.countShuffleWorkflows.mockResolvedValue(0)

      await service.getShuffleWorkflows(TENANT_ID, {
        page: 1,
        limit: 20,
        status: 'invalid',
        sortOrder: 'asc',
      })

      expect(repository.findManyShuffleWorkflows).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isValid: false }),
        })
      )
    })

    it('should filter by name search', async () => {
      repository.findManyShuffleWorkflows.mockResolvedValue([])
      repository.countShuffleWorkflows.mockResolvedValue(0)

      await service.getShuffleWorkflows(TENANT_ID, {
        page: 1,
        limit: 20,
        search: 'alert',
        sortOrder: 'asc',
      })

      expect(repository.findManyShuffleWorkflows).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { contains: 'alert', mode: 'insensitive' },
          }),
        })
      )
    })

    it('should handle pagination correctly', async () => {
      repository.findManyShuffleWorkflows.mockResolvedValue([])
      repository.countShuffleWorkflows.mockResolvedValue(75)

      const result = await service.getShuffleWorkflows(TENANT_ID, {
        page: 4,
        limit: 10,
        sortOrder: 'asc',
      })

      expect(result.pagination.total).toBe(75)
      expect(result.pagination.page).toBe(4)
      expect(repository.findManyShuffleWorkflows).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 30, take: 10 })
      )
    })
  })

  describe('syncShuffleWorkflows', () => {
    it('should sync workflows from shuffle to DB', async () => {
      services.connectorsService.getDecryptedConfig.mockResolvedValue({ url: 'http://shuffle' })
      services.shuffle.getWorkflows.mockResolvedValue([
        { id: 'wf1', name: 'Alert Handler', is_valid: true, tags: ['alert'] },
      ])
      repository.createSyncJob.mockResolvedValue({ id: 'job-1', startedAt: nowDate() })
      repository.upsertShuffleWorkflow.mockResolvedValue({})
      repository.findSyncJobById.mockResolvedValue({ id: 'job-1', startedAt: nowDate() })
      repository.updateSyncJob.mockResolvedValue({})

      const result = await service.syncShuffleWorkflows(TENANT_ID)

      expect(result.synced).toBe(1)
      expect(repository.upsertShuffleWorkflow).toHaveBeenCalledTimes(1)
    })

    it('should throw BusinessException when Shuffle is unreachable', async () => {
      services.connectorsService.getDecryptedConfig.mockResolvedValue({ url: 'http://shuffle' })
      services.shuffle.getWorkflows.mockRejectedValue(new Error('ECONNREFUSED'))

      await expect(service.syncShuffleWorkflows(TENANT_ID)).rejects.toThrow(BusinessException)
    })

    it('should throw BusinessException when Shuffle not configured', async () => {
      services.connectorsService.getDecryptedConfig.mockResolvedValue(null)

      await expect(service.syncShuffleWorkflows(TENANT_ID)).rejects.toThrow(BusinessException)
    })

    it('should skip workflows with missing id', async () => {
      services.connectorsService.getDecryptedConfig.mockResolvedValue({ url: 'http://shuffle' })
      services.shuffle.getWorkflows.mockResolvedValue([{ name: 'No ID Workflow' }])
      repository.createSyncJob.mockResolvedValue({ id: 'job-1', startedAt: nowDate() })
      repository.findSyncJobById.mockResolvedValue({ id: 'job-1', startedAt: nowDate() })
      repository.updateSyncJob.mockResolvedValue({})

      const result = await service.syncShuffleWorkflows(TENANT_ID)

      expect(result.synced).toBe(0)
      expect(repository.upsertShuffleWorkflow).not.toHaveBeenCalled()
    })
  })

  /* ------------------------------------------------------------------ */
  /* syncVelociraptorMetadata                                             */
  /* ------------------------------------------------------------------ */

  describe('syncVelociraptorMetadata', () => {
    it('should sync endpoints and hunts from velociraptor', async () => {
      services.connectorsService.getDecryptedConfig.mockResolvedValue({ apiUrl: 'http://vr' })
      services.velociraptor.getClients.mockResolvedValue([
        {
          client_id: 'C.123',
          os_info: { fqdn: 'server-1', system: 'Linux' },
          labels: ['prod'],
          last_ip: '10.0.0.1',
        },
      ])
      services.velociraptor.runVQL.mockResolvedValue({
        rows: [
          {
            hunt_id: 'H.001',
            hunt_description: 'Test',
            state: 'COMPLETED',
            artifacts: ['Generic.Client.Info'],
            stats: { total_clients_scheduled: 50, total_clients_with_results: 50 },
          },
        ],
        columns: ['hunt_id'],
      })
      repository.createSyncJob.mockResolvedValue({ id: 'job-1', startedAt: nowDate() })
      repository.upsertVelociraptorEndpoint.mockResolvedValue({})
      repository.upsertVelociraptorHunt.mockResolvedValue({})
      repository.findSyncJobById.mockResolvedValue({ id: 'job-1', startedAt: nowDate() })
      repository.updateSyncJob.mockResolvedValue({})

      const result = await service.syncVelociraptorMetadata(TENANT_ID)

      expect(result.endpoints).toBe(1)
      expect(result.hunts).toBe(1)
      expect(repository.upsertVelociraptorEndpoint).toHaveBeenCalledTimes(1)
      expect(repository.upsertVelociraptorHunt).toHaveBeenCalledTimes(1)
    })

    it('should throw when velociraptor not configured', async () => {
      services.connectorsService.getDecryptedConfig.mockResolvedValue(null)

      await expect(service.syncVelociraptorMetadata(TENANT_ID)).rejects.toThrow(BusinessException)
    })

    it('should skip clients with missing client_id', async () => {
      services.connectorsService.getDecryptedConfig.mockResolvedValue({ apiUrl: 'http://vr' })
      services.velociraptor.getClients.mockResolvedValue([
        { os_info: { fqdn: 'no-id', system: 'Linux' } },
      ])
      services.velociraptor.runVQL.mockResolvedValue({ rows: [], columns: [] })
      repository.createSyncJob.mockResolvedValue({ id: 'job-1', startedAt: nowDate() })
      repository.findSyncJobById.mockResolvedValue({ id: 'job-1', startedAt: nowDate() })
      repository.updateSyncJob.mockResolvedValue({})

      const result = await service.syncVelociraptorMetadata(TENANT_ID)

      expect(result.endpoints).toBe(0)
      expect(repository.upsertVelociraptorEndpoint).not.toHaveBeenCalled()
    })
  })

  /* ------------------------------------------------------------------ */
  /* Sync Jobs                                                            */
  /* ------------------------------------------------------------------ */

  describe('getSyncJobs', () => {
    it('should return paginated sync jobs', async () => {
      repository.findManySyncJobs.mockResolvedValue([
        { id: 'j1', connectorType: 'grafana', status: 'completed', recordsSynced: 5 },
      ])
      repository.countSyncJobs.mockResolvedValue(1)

      const result = await service.getSyncJobs(TENANT_ID, {
        page: 1,
        limit: 20,
        sortOrder: 'desc',
      })

      expect(result.data).toHaveLength(1)
      expect(result.pagination.total).toBe(1)
    })

    it('should filter by connector type', async () => {
      repository.findManySyncJobs.mockResolvedValue([])
      repository.countSyncJobs.mockResolvedValue(0)

      await service.getSyncJobs(TENANT_ID, {
        page: 1,
        limit: 20,
        connectorType: 'grafana' as never,
        sortOrder: 'desc',
      })

      expect(repository.findManySyncJobs).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ connectorType: 'grafana' }),
        })
      )
    })
  })

  describe('triggerSync', () => {
    it('should create a sync job and return job ID', async () => {
      services.connectorsService.getDecryptedConfig.mockResolvedValue({ url: 'http://grafana' })
      repository.createSyncJob.mockResolvedValue({ id: 'job-99', startedAt: nowDate() })

      // Mock the background sync methods to prevent unhandled rejections
      services.grafana.getDashboards.mockResolvedValue([])
      repository.findSyncJobById.mockResolvedValue({ id: 'job-99', startedAt: nowDate() })
      repository.updateSyncJob.mockResolvedValue({})

      const result = await service.triggerSync(TENANT_ID, 'grafana' as never, 'admin@test.com')

      expect(result.jobId).toBe('job-99')
      expect(repository.createSyncJob).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT_ID,
          connectorType: 'grafana',
          initiatedBy: 'admin@test.com',
        })
      )
    })

    it('should throw if connector not configured', async () => {
      services.connectorsService.getDecryptedConfig.mockResolvedValue(null)

      await expect(
        service.triggerSync(TENANT_ID, 'grafana' as never, 'admin@test.com')
      ).rejects.toThrow(BusinessException)
    })
  })

  /* ------------------------------------------------------------------ */
  /* Error handling: connector not configured                             */
  /* ------------------------------------------------------------------ */

  describe('connector not configured', () => {
    it('should throw BusinessException 404 for all connectors', async () => {
      services.connectorsService.getDecryptedConfig.mockResolvedValue(null)

      await expect(
        service.searchGraylogLogs(TENANT_ID, {
          query: '*',
          timeRange: 86400,
          page: 1,
          limit: 20,
          sortOrder: 'desc',
        })
      ).rejects.toThrow(BusinessException)

      await expect(service.getGraylogEventDefinitions(TENANT_ID)).rejects.toThrow(BusinessException)

      await expect(
        service.queryInfluxDB(TENANT_ID, { bucket: 'test', range: '-1h', limit: 100 })
      ).rejects.toThrow(BusinessException)

      await expect(service.getInfluxDBBuckets(TENANT_ID)).rejects.toThrow(BusinessException)

      await expect(
        service.searchMispEvents(TENANT_ID, { page: 1, limit: 20, sortOrder: 'desc' })
      ).rejects.toThrow(BusinessException)

      await expect(service.runVelociraptorVQL(TENANT_ID, 'SELECT * FROM info()')).rejects.toThrow(
        BusinessException
      )

      // getLogstashLogs reads from DB, not external service, so it doesn't throw
    })
  })

  /* ------------------------------------------------------------------ */
  /* getLogstashLogs                                                      */
  /* ------------------------------------------------------------------ */

  describe('getLogstashLogs', () => {
    it('should return paginated pipeline logs', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          tenantId: TENANT_ID,
          pipelineId: 'main',
          timestamp: nowDate(),
          level: 'info',
          message: 'Pipeline processing events',
          source: 'logstash-node-01',
          eventsIn: 1000,
          eventsOut: 950,
          eventsFiltered: 50,
          durationMs: 200,
          metadata: {},
        },
      ]
      repository.findManyLogstashLogs.mockResolvedValue(mockLogs)
      repository.countLogstashLogs.mockResolvedValue(1)

      const result = await service.getLogstashLogs(TENANT_ID, {
        page: 1,
        limit: 20,
        sortOrder: 'desc',
      })

      expect(result.data).toEqual(mockLogs)
      expect(result.pagination.total).toBe(1)
      expect(result.pagination.page).toBe(1)
      expect(repository.findManyLogstashLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID },
          skip: 0,
          take: 20,
        })
      )
    })

    it('should filter by search term', async () => {
      repository.findManyLogstashLogs.mockResolvedValue([])
      repository.countLogstashLogs.mockResolvedValue(0)

      await service.getLogstashLogs(TENANT_ID, {
        page: 1,
        limit: 20,
        search: 'error',
        sortOrder: 'desc',
      })

      expect(repository.findManyLogstashLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: TENANT_ID,
            message: { contains: 'error', mode: 'insensitive' },
          },
        })
      )
    })

    it('should filter by level', async () => {
      repository.findManyLogstashLogs.mockResolvedValue([])
      repository.countLogstashLogs.mockResolvedValue(0)

      await service.getLogstashLogs(TENANT_ID, {
        page: 1,
        limit: 20,
        level: 'warn',
        sortOrder: 'desc',
      })

      expect(repository.findManyLogstashLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: TENANT_ID,
            level: 'warn',
          },
        })
      )
    })

    it('should filter by pipelineId', async () => {
      repository.findManyLogstashLogs.mockResolvedValue([])
      repository.countLogstashLogs.mockResolvedValue(0)

      await service.getLogstashLogs(TENANT_ID, {
        page: 1,
        limit: 20,
        pipelineId: 'main',
        sortOrder: 'desc',
      })

      expect(repository.findManyLogstashLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: TENANT_ID,
            pipelineId: { contains: 'main', mode: 'insensitive' },
          },
        })
      )
    })

    it('should handle pagination correctly', async () => {
      repository.findManyLogstashLogs.mockResolvedValue([])
      repository.countLogstashLogs.mockResolvedValue(100)

      const result = await service.getLogstashLogs(TENANT_ID, {
        page: 3,
        limit: 10,
        sortOrder: 'desc',
      })

      expect(result.pagination.total).toBe(100)
      expect(result.pagination.page).toBe(3)
      expect(repository.findManyLogstashLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        })
      )
    })
  })

  /* ------------------------------------------------------------------ */
  /* syncLogstashLogs                                                     */
  /* ------------------------------------------------------------------ */

  describe('syncLogstashLogs', () => {
    it('should sync pipeline stats from Logstash', async () => {
      services.connectorsService.getDecryptedConfig.mockResolvedValue({
        baseUrl: 'http://logstash:9600',
      })
      services.logstash.getPipelineStats.mockResolvedValue({
        pipelines: {
          main: {
            events: { in: 5000, out: 4800, filtered: 200, duration_in_millis: 1500 },
          },
          syslog: {
            events: { in: 3000, out: 2900, filtered: 100, duration_in_millis: 800 },
          },
        },
      })
      repository.createSyncJob.mockResolvedValue({ id: 'job-1', startedAt: nowDate() })
      repository.findSyncJobById.mockResolvedValue({ id: 'job-1', startedAt: nowDate() })
      repository.updateSyncJob.mockResolvedValue({})
      repository.createLogstashLog.mockResolvedValue({})

      const result = await service.syncLogstashLogs(TENANT_ID)

      expect(result.synced).toBe(2)
      expect(repository.createLogstashLog).toHaveBeenCalledTimes(2)
      expect(repository.createLogstashLog).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT_ID,
          pipelineId: 'main',
          eventsIn: 5000,
          eventsOut: 4800,
          eventsFiltered: 200,
          durationMs: 1500,
        })
      )
    })

    it('should throw BusinessException when Logstash is unreachable', async () => {
      services.connectorsService.getDecryptedConfig.mockResolvedValue({
        baseUrl: 'http://logstash:9600',
      })
      services.logstash.getPipelineStats.mockRejectedValue(new Error('ECONNREFUSED'))

      await expect(service.syncLogstashLogs(TENANT_ID)).rejects.toThrow(BusinessException)
    })

    it('should throw BusinessException when connector not configured', async () => {
      services.connectorsService.getDecryptedConfig.mockResolvedValue(null)

      await expect(service.syncLogstashLogs(TENANT_ID)).rejects.toThrow(BusinessException)
    })

    it('should handle partial sync failures gracefully', async () => {
      services.connectorsService.getDecryptedConfig.mockResolvedValue({
        baseUrl: 'http://logstash:9600',
      })
      services.logstash.getPipelineStats.mockResolvedValue({
        pipelines: {
          main: { events: { in: 100, out: 90, filtered: 10, duration_in_millis: 50 } },
          broken: { events: { in: 0, out: 0, filtered: 0, duration_in_millis: 0 } },
        },
      })
      repository.createSyncJob.mockResolvedValue({ id: 'job-2', startedAt: nowDate() })
      repository.findSyncJobById.mockResolvedValue({ id: 'job-2', startedAt: nowDate() })
      repository.updateSyncJob.mockResolvedValue({})
      repository.createLogstashLog
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('DB error'))

      const result = await service.syncLogstashLogs(TENANT_ID)

      // 1 succeeded, 1 failed
      expect(result.synced).toBe(1)
    })
  })
})
