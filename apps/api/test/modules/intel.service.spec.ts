import { BusinessException } from '../../src/common/exceptions/business.exception'
import { toDay, nowDate } from '../../src/common/utils/date-time.utility'
import { IntelService } from '../../src/modules/intel/intel.service'

const TENANT_ID = 'tenant-001'

const mockAppLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}

function createMockRepository() {
  return {
    groupActiveIOCsByType: jest.fn(),
    findDistinctOrganizations: jest.fn(),
    findManyMispEvents: jest.fn(),
    countMispEvents: jest.fn(),
    findManyIOCs: jest.fn(),
    countIOCs: jest.fn(),
    findAlertsByIds: jest.fn(),
    findActiveIOCsByValues: jest.fn(),
    upsertMispEvent: jest.fn(),
    upsertIOC: jest.fn(),
  }
}

function createMockConnectorsService() {
  return {
    getDecryptedConfig: jest.fn(),
    getEnabledConnectors: jest.fn(),
    testConnection: jest.fn(),
  }
}

function createMockMispService() {
  return {
    getEvents: jest.fn(),
    searchAttributes: jest.fn(),
  }
}

function createService(
  repository: ReturnType<typeof createMockRepository>,
  connectorsService: ReturnType<typeof createMockConnectorsService>,
  mispService: ReturnType<typeof createMockMispService>
) {
  return new IntelService(
    repository as never,
    connectorsService as never,
    mispService as never,
    {
      extractFromIOC: jest.fn().mockResolvedValue(undefined),
      extractFromMispIoc: jest.fn().mockResolvedValue(undefined),
    } as never,
    mockAppLogger as never
  )
}

describe('IntelService', () => {
  let repository: ReturnType<typeof createMockRepository>
  let connectorsService: ReturnType<typeof createMockConnectorsService>
  let mispService: ReturnType<typeof createMockMispService>
  let service: IntelService

  beforeEach(() => {
    jest.clearAllMocks()
    repository = createMockRepository()
    connectorsService = createMockConnectorsService()
    mispService = createMockMispService()
    service = createService(repository, connectorsService, mispService)
  })

  /* ------------------------------------------------------------------ */
  /* getStats                                                            */
  /* ------------------------------------------------------------------ */

  describe('getStats', () => {
    it('should return aggregated IOC counts and threat actor count', async () => {
      repository.groupActiveIOCsByType.mockResolvedValue([
        { iocType: 'ip-src', _count: { id: 15 } },
        { iocType: 'ip-dst', _count: { id: 10 } },
        { iocType: 'md5', _count: { id: 8 } },
        { iocType: 'sha1', _count: { id: 4 } },
        { iocType: 'sha256', _count: { id: 3 } },
        { iocType: 'domain', _count: { id: 12 } },
        { iocType: 'hostname', _count: { id: 5 } },
        { iocType: 'url', _count: { id: 7 } },
      ])
      repository.findDistinctOrganizations.mockResolvedValue([
        { organization: 'APT28' },
        { organization: 'Lazarus Group' },
        { organization: 'Turla' },
      ])

      const result = await service.getStats(TENANT_ID)

      expect(result.totalIOCs).toBe(64)
      expect(result.ipIOCs).toBe(25)
      expect(result.fileHashes).toBe(15)
      expect(result.activeDomains).toBe(17)
      expect(result.threatActors).toBe(3)
    })

    it('should handle empty data', async () => {
      repository.groupActiveIOCsByType.mockResolvedValue([])
      repository.findDistinctOrganizations.mockResolvedValue([])

      const result = await service.getStats(TENANT_ID)

      expect(result.totalIOCs).toBe(0)
      expect(result.ipIOCs).toBe(0)
      expect(result.fileHashes).toBe(0)
      expect(result.activeDomains).toBe(0)
      expect(result.threatActors).toBe(0)
    })
  })

  /* ------------------------------------------------------------------ */
  /* getRecentEvents                                                     */
  /* ------------------------------------------------------------------ */

  describe('getRecentEvents', () => {
    it('should return paginated events sorted by date DESC', async () => {
      const mockEvents = [
        {
          id: 'ev-1',
          mispEventId: '100',
          tenantId: TENANT_ID,
          organization: 'APT28',
          threatLevel: 'high',
          info: 'Phishing campaign',
          date: toDay('2025-06-01T00:00:00.000Z').toDate(),
          tags: [],
          attributeCount: 15,
          published: true,
        },
        {
          id: 'ev-2',
          mispEventId: '101',
          tenantId: TENANT_ID,
          organization: 'Turla',
          threatLevel: 'medium',
          info: 'Watering hole',
          date: toDay('2025-05-15T00:00:00.000Z').toDate(),
          tags: [],
          attributeCount: 8,
          published: true,
        },
      ]
      repository.findManyMispEvents.mockResolvedValue(mockEvents)
      repository.countMispEvents.mockResolvedValue(25)

      const result = await service.getRecentEvents(TENANT_ID, 1, 20)

      expect(result.data).toHaveLength(2)
      expect(result.data[0]).toEqual(mockEvents[0])
      expect(result.pagination.page).toBe(1)
      expect(result.pagination.limit).toBe(20)
      expect(result.pagination.total).toBe(25)
      expect(result.pagination.totalPages).toBe(2)
      expect(result.pagination.hasNext).toBe(true)
      expect(result.pagination.hasPrev).toBe(false)
    })

    it('should handle empty list', async () => {
      repository.findManyMispEvents.mockResolvedValue([])
      repository.countMispEvents.mockResolvedValue(0)

      const result = await service.getRecentEvents(TENANT_ID, 1, 20)

      expect(result.data).toHaveLength(0)
      expect(result.pagination.total).toBe(0)
      expect(result.pagination.totalPages).toBe(0)
      expect(result.pagination.hasNext).toBe(false)
      expect(result.pagination.hasPrev).toBe(false)
    })

    it('should compute correct pagination for page 2', async () => {
      repository.findManyMispEvents.mockResolvedValue([])
      repository.countMispEvents.mockResolvedValue(50)

      const result = await service.getRecentEvents(TENANT_ID, 2, 10)

      expect(result.pagination.page).toBe(2)
      expect(result.pagination.totalPages).toBe(5)
      expect(result.pagination.hasNext).toBe(true)
      expect(result.pagination.hasPrev).toBe(true)
    })
  })

  /* ------------------------------------------------------------------ */
  /* searchIOCs                                                          */
  /* ------------------------------------------------------------------ */

  describe('searchIOCs', () => {
    it('should filter by query (case-insensitive iocValue contains)', async () => {
      repository.findManyIOCs.mockResolvedValue([])
      repository.countIOCs.mockResolvedValue(0)

      await service.searchIOCs(TENANT_ID, '192.168', undefined, 1, 20)

      expect(repository.findManyIOCs).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            active: true,
            iocValue: { contains: '192.168', mode: 'insensitive' },
          }),
        })
      )
    })

    it('should expand type "ip" to ["ip-src", "ip-dst"]', async () => {
      repository.findManyIOCs.mockResolvedValue([])
      repository.countIOCs.mockResolvedValue(0)

      await service.searchIOCs(TENANT_ID, undefined, 'ip', 1, 20)

      expect(repository.findManyIOCs).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            iocType: { in: ['ip-src', 'ip-dst'] },
          }),
        })
      )
    })

    it('should expand type "hash" to ["md5", "sha1", "sha256"]', async () => {
      repository.findManyIOCs.mockResolvedValue([])
      repository.countIOCs.mockResolvedValue(0)

      await service.searchIOCs(TENANT_ID, undefined, 'hash', 1, 20)

      expect(repository.findManyIOCs).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            iocType: { in: ['md5', 'sha1', 'sha256'] },
          }),
        })
      )
    })

    it('should pass a single type directly when no expansion exists', async () => {
      repository.findManyIOCs.mockResolvedValue([])
      repository.countIOCs.mockResolvedValue(0)

      await service.searchIOCs(TENANT_ID, undefined, 'domain', 1, 20)

      expect(repository.findManyIOCs).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            iocType: 'domain',
          }),
        })
      )
    })

    it('should filter by source', async () => {
      repository.findManyIOCs.mockResolvedValue([])
      repository.countIOCs.mockResolvedValue(0)

      await service.searchIOCs(
        TENANT_ID,
        undefined,
        undefined,
        1,
        20,
        undefined,
        undefined,
        'MISP-100'
      )

      expect(repository.findManyIOCs).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            source: { contains: 'MISP-100', mode: 'insensitive' },
          }),
        })
      )
    })

    it('should return paginated results', async () => {
      const mockIOCs = [
        {
          id: 'ioc-1',
          tenantId: TENANT_ID,
          iocValue: '10.0.0.1',
          iocType: 'ip-src',
          source: 'MISP-100',
          severity: 'high',
          hitCount: 3,
          firstSeen: nowDate(),
          lastSeen: nowDate(),
          tags: [],
          active: true,
        },
      ]
      repository.findManyIOCs.mockResolvedValue(mockIOCs)
      repository.countIOCs.mockResolvedValue(1)

      const result = await service.searchIOCs(TENANT_ID, '10.0.0', 'ip', 1, 20)

      expect(result.data).toHaveLength(1)
      expect(result.data[0]).toEqual(mockIOCs[0])
      expect(result.pagination.total).toBe(1)
    })

    it('should not set iocValue filter when query is empty string', async () => {
      repository.findManyIOCs.mockResolvedValue([])
      repository.countIOCs.mockResolvedValue(0)

      await service.searchIOCs(TENANT_ID, '', undefined, 1, 20)

      expect(repository.findManyIOCs).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID, active: true },
        })
      )
    })

    it('should not set iocValue filter when query is whitespace only', async () => {
      repository.findManyIOCs.mockResolvedValue([])
      repository.countIOCs.mockResolvedValue(0)

      await service.searchIOCs(TENANT_ID, '   ', undefined, 1, 20)

      expect(repository.findManyIOCs).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID, active: true },
        })
      )
    })
  })

  /* ------------------------------------------------------------------ */
  /* matchIOCsAgainstAlerts                                              */
  /* ------------------------------------------------------------------ */

  describe('matchIOCsAgainstAlerts', () => {
    it('should match alert sourceIp/destinationIp against IOCs', async () => {
      repository.findAlertsByIds.mockResolvedValue([
        { id: 'alert-1', sourceIp: '10.0.0.1', destinationIp: '192.168.1.1' },
        { id: 'alert-2', sourceIp: '172.16.0.5', destinationIp: null },
      ])
      repository.findActiveIOCsByValues.mockResolvedValue([
        { iocValue: '10.0.0.1', iocType: 'ip-src', source: 'MISP-100', severity: 'high' },
        { iocValue: '172.16.0.5', iocType: 'ip-dst', source: 'MISP-200', severity: 'critical' },
      ])

      const result = await service.matchIOCsAgainstAlerts(TENANT_ID, ['alert-1', 'alert-2'])

      expect(result).toHaveLength(2)

      const alert1Result = result.find(r => r.alertId === 'alert-1')
      expect(alert1Result).toBeDefined()
      expect(alert1Result?.matchCount).toBe(1)
      expect(alert1Result?.matchedIOCs[0]?.iocValue).toBe('10.0.0.1')

      const alert2Result = result.find(r => r.alertId === 'alert-2')
      expect(alert2Result).toBeDefined()
      expect(alert2Result?.matchCount).toBe(1)
      expect(alert2Result?.matchedIOCs[0]?.iocValue).toBe('172.16.0.5')
    })

    it('should return matches per alert with deduplication', async () => {
      // Same IP appears as both sourceIp and destinationIp for an alert
      repository.findAlertsByIds.mockResolvedValue([
        { id: 'alert-1', sourceIp: '10.0.0.1', destinationIp: '10.0.0.1' },
      ])
      repository.findActiveIOCsByValues.mockResolvedValue([
        { iocValue: '10.0.0.1', iocType: 'ip-src', source: 'MISP-100', severity: 'high' },
      ])

      const result = await service.matchIOCsAgainstAlerts(TENANT_ID, ['alert-1'])

      expect(result).toHaveLength(1)
      // Should be deduplicated — same iocValue + iocType should appear only once
      expect(result[0]?.matchCount).toBe(1)
      expect(result[0]?.matchedIOCs).toHaveLength(1)
    })

    it('should handle alerts with no matching IOCs', async () => {
      repository.findAlertsByIds.mockResolvedValue([
        { id: 'alert-1', sourceIp: '10.0.0.1', destinationIp: '10.0.0.2' },
      ])
      repository.findActiveIOCsByValues.mockResolvedValue([])

      const result = await service.matchIOCsAgainstAlerts(TENANT_ID, ['alert-1'])

      expect(result).toHaveLength(1)
      expect(result[0]?.matchCount).toBe(0)
      expect(result[0]?.matchedIOCs).toHaveLength(0)
    })

    it('should handle alert IDs not found in the database', async () => {
      repository.findAlertsByIds.mockResolvedValue([])
      repository.findActiveIOCsByValues.mockResolvedValue([])

      const result = await service.matchIOCsAgainstAlerts(TENANT_ID, ['nonexistent-alert'])

      expect(result).toHaveLength(1)
      expect(result[0]?.alertId).toBe('nonexistent-alert')
      expect(result[0]?.matchCount).toBe(0)
      expect(result[0]?.matchedIOCs).toHaveLength(0)
    })

    it('should handle alerts with no IPs', async () => {
      repository.findAlertsByIds.mockResolvedValue([
        { id: 'alert-1', sourceIp: null, destinationIp: null },
      ])

      const result = await service.matchIOCsAgainstAlerts(TENANT_ID, ['alert-1'])

      expect(result).toHaveLength(1)
      expect(result[0]?.matchCount).toBe(0)
      // findActiveIOCsByValues should not be called since ips array is empty
      expect(repository.findActiveIOCsByValues).not.toHaveBeenCalled()
    })

    it('should collect unique IPs across all alerts', async () => {
      repository.findAlertsByIds.mockResolvedValue([
        { id: 'alert-1', sourceIp: '10.0.0.1', destinationIp: '10.0.0.2' },
        { id: 'alert-2', sourceIp: '10.0.0.1', destinationIp: '10.0.0.3' },
      ])
      repository.findActiveIOCsByValues.mockResolvedValue([])

      await service.matchIOCsAgainstAlerts(TENANT_ID, ['alert-1', 'alert-2'])

      expect(repository.findActiveIOCsByValues).toHaveBeenCalledWith(
        TENANT_ID,
        expect.arrayContaining(['10.0.0.1', '10.0.0.2', '10.0.0.3'])
      )
    })
  })

  /* ------------------------------------------------------------------ */
  /* syncFromMisp                                                        */
  /* ------------------------------------------------------------------ */

  describe('syncFromMisp', () => {
    it('should sync events and IOCs and return counts', async () => {
      connectorsService.getDecryptedConfig.mockResolvedValue({
        baseUrl: 'https://misp.local',
        apiKey: 'test-key',
      })

      mispService.getEvents.mockResolvedValue([
        {
          id: '100',
          info: 'Phishing campaign',
          date: '2025-06-01',
          threat_level_id: 1,
          Orgc: { name: 'APT28' },
          Tag: [{ name: 'tlp:white' }],
          attribute_count: 15,
          published: true,
        },
        {
          id: '101',
          info: 'Malware distribution',
          date: '2025-05-20',
          threat_level_id: 2,
          Orgc: { name: 'Turla' },
          Tag: [],
          attribute_count: 8,
          published: false,
        },
      ])

      mispService.searchAttributes.mockResolvedValue([
        {
          value: '10.0.0.1',
          type: 'ip-src',
          event_id: '100',
          to_ids: true,
          category: 'Network activity',
          Tag: [{ name: 'malware' }],
          first_seen: '2025-06-01T00:00:00Z',
          last_seen: '2025-06-01T12:00:00Z',
        },
        {
          value: 'abc123def456',
          type: 'md5',
          event_id: '101',
          to_ids: true,
          category: 'Payload delivery',
          Tag: [],
          first_seen: '2025-05-20T00:00:00Z',
          last_seen: '2025-05-20T08:00:00Z',
        },
      ])

      repository.upsertMispEvent.mockResolvedValue({})
      repository.upsertIOC.mockResolvedValue({})

      const result = await service.syncFromMisp(TENANT_ID)

      expect(result.eventsUpserted).toBe(2)
      expect(result.iocsUpserted).toBe(2)
      expect(mispService.getEvents).toHaveBeenCalledWith(
        expect.objectContaining({ baseUrl: 'https://misp.local' }),
        50
      )
      expect(mispService.searchAttributes).toHaveBeenCalledWith(
        expect.objectContaining({ baseUrl: 'https://misp.local' }),
        expect.objectContaining({
          limit: 500,
          page: 1,
          type: ['ip-src', 'ip-dst', 'domain', 'hostname', 'md5', 'sha1', 'sha256', 'url'],
        })
      )
    })

    it('should throw 400 when MISP connector not configured', async () => {
      connectorsService.getDecryptedConfig.mockResolvedValue(null)

      await expect(service.syncFromMisp(TENANT_ID)).rejects.toThrow(BusinessException)

      try {
        await service.syncFromMisp(TENANT_ID)
      } catch (error) {
        expect((error as BusinessException).getStatus()).toBe(400)
        expect((error as BusinessException).messageKey).toBe('errors.intel.mispNotConfigured')
      }
    })

    it('should throw 502 when MISP service fails', async () => {
      connectorsService.getDecryptedConfig.mockResolvedValue({
        baseUrl: 'https://misp.local',
        apiKey: 'test-key',
      })
      mispService.getEvents.mockRejectedValue(new Error('MISP server unreachable'))

      await expect(service.syncFromMisp(TENANT_ID)).rejects.toThrow(BusinessException)

      try {
        await service.syncFromMisp(TENANT_ID)
      } catch (error) {
        expect((error as BusinessException).getStatus()).toBe(502)
        expect((error as BusinessException).messageKey).toBe('errors.intel.syncFailed')
      }
    })

    it('should handle partial failures (some upserts fail via Promise.allSettled)', async () => {
      connectorsService.getDecryptedConfig.mockResolvedValue({
        baseUrl: 'https://misp.local',
        apiKey: 'test-key',
      })

      mispService.getEvents.mockResolvedValue([
        {
          id: '100',
          info: 'Event 1',
          date: '2025-06-01',
          threat_level_id: 1,
          Orgc: { name: 'Org1' },
          Tag: [],
          attribute_count: 5,
          published: true,
        },
        {
          id: '101',
          info: 'Event 2',
          date: '2025-05-20',
          threat_level_id: 2,
          Orgc: { name: 'Org2' },
          Tag: [],
          attribute_count: 3,
          published: false,
        },
      ])

      mispService.searchAttributes.mockResolvedValue([
        {
          value: '10.0.0.1',
          type: 'ip-src',
          event_id: '100',
          to_ids: true,
          category: 'Network activity',
          Tag: [],
        },
      ])

      // First event upsert succeeds, second fails
      repository.upsertMispEvent
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('Unique constraint violation'))

      // IOC upsert succeeds
      repository.upsertIOC.mockResolvedValue({})

      const result = await service.syncFromMisp(TENANT_ID)

      // Only 1 event should be counted as upserted (the other failed)
      expect(result.eventsUpserted).toBe(1)
      expect(result.iocsUpserted).toBe(1)
    })

    it('should re-throw BusinessException as-is from catch block', async () => {
      connectorsService.getDecryptedConfig.mockResolvedValue({
        baseUrl: 'https://misp.local',
        apiKey: 'test-key',
      })

      const businessError = new BusinessException(429, 'Rate limited', 'errors.intel.rateLimited')
      mispService.getEvents.mockRejectedValue(businessError)

      try {
        await service.syncFromMisp(TENANT_ID)
        // Should not reach here
        expect(true).toBe(false)
      } catch (error) {
        expect(error).toBe(businessError)
        expect((error as BusinessException).getStatus()).toBe(429)
      }
    })

    it('should skip events without an id', async () => {
      connectorsService.getDecryptedConfig.mockResolvedValue({
        baseUrl: 'https://misp.local',
        apiKey: 'test-key',
      })

      mispService.getEvents.mockResolvedValue([
        {
          // No id field — should be skipped
          info: 'Event with no ID',
          date: '2025-06-01',
          Orgc: { name: 'Org1' },
          Tag: [],
          attribute_count: 0,
          published: false,
        },
        {
          id: '200',
          info: 'Valid event',
          date: '2025-06-01',
          Orgc: { name: 'Org2' },
          Tag: [],
          attribute_count: 5,
          published: true,
        },
      ])

      mispService.searchAttributes.mockResolvedValue([])
      repository.upsertMispEvent.mockResolvedValue({})

      const result = await service.syncFromMisp(TENANT_ID)

      // Only 1 event should be upserted (the one with id)
      expect(result.eventsUpserted).toBe(1)
    })
  })
})
