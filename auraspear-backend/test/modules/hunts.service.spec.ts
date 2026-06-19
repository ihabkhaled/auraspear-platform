import { ConnectorType } from '../../src/common/enums'
import { BusinessException } from '../../src/common/exceptions/business.exception'
import { nowDate } from '../../src/common/utils/date-time.utility'
import { HuntsService } from '../../src/modules/hunts/hunts.service'

const mockAppLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}

function createMockRepository() {
  return {
    createSession: jest.fn(),
    updateSessionStatus: jest.fn(),
    updateSessionCompletedWithEvents: jest.fn(),
    createManyEvents: jest.fn(),
    findSessionsPaginated: jest.fn(),
    countSessions: jest.fn(),
    findSessionByIdAndTenant: jest.fn(),
    findSessionExistsByIdAndTenant: jest.fn(),
    findEventsPaginated: jest.fn(),
    countEvents: jest.fn(),
  }
}

function createMockConnectorsService() {
  return {
    getDecryptedConfig: jest.fn(),
  }
}

function createMockWazuhService() {
  return {
    searchAllAlerts: jest.fn(),
  }
}

const TENANT_ID = 'tenant-001'
const USER_EMAIL = 'analyst@auraspear.com'

describe('HuntsService', () => {
  let service: HuntsService
  let repository: ReturnType<typeof createMockRepository>
  let connectorsService: ReturnType<typeof createMockConnectorsService>
  let wazuhService: ReturnType<typeof createMockWazuhService>

  beforeEach(() => {
    repository = createMockRepository()
    connectorsService = createMockConnectorsService()
    wazuhService = createMockWazuhService()
    service = new HuntsService(
      repository as never,
      connectorsService as never,
      wazuhService as never,
      mockAppLogger as never
    )
    jest.clearAllMocks()
  })

  /* ------------------------------------------------------------------ */
  /* runHunt                                                              */
  /* ------------------------------------------------------------------ */

  describe('runHunt', () => {
    const dto = { query: 'failed login', timeRange: '24h' as const }
    const sessionId = 'session-001'

    const mockSession = {
      id: sessionId,
      tenantId: TENANT_ID,
      query: dto.query,
      status: 'running' as const,
      startedBy: USER_EMAIL,
      reasoning: ['Querying Wazuh Indexer for matching events'],
      startedAt: nowDate(),
      completedAt: null,
      eventsFound: null,
    }

    it('should create session, query Wazuh, extract events, and update status to completed', async () => {
      repository.createSession.mockResolvedValueOnce(mockSession)
      connectorsService.getDecryptedConfig.mockResolvedValueOnce({
        indexerUrl: 'https://wazuh.local:9200',
        indexerUsername: 'admin',
        indexerPassword: 'secret',
      })

      const wazuhHits = [
        {
          _id: 'event-001',
          _source: {
            timestamp: '2026-03-10T12:00:00Z',
            'rule.level': 12,
            'rule.description': 'Multiple failed SSH logins',
            src_ip: '192.168.1.100',
            'data.dstuser': 'root',
          },
        },
        {
          _id: 'event-002',
          _source: {
            timestamp: '2026-03-10T12:05:00Z',
            'rule.level': 6,
            message: 'Failed password for user admin',
            'agent.ip': '10.0.0.5',
            'data.srcuser': 'admin',
          },
        },
      ]

      wazuhService.searchAllAlerts.mockResolvedValueOnce({
        hits: wazuhHits,
        total: 2,
      })

      repository.createManyEvents.mockResolvedValueOnce(undefined)

      const updatedSession = {
        ...mockSession,
        status: 'completed',
        completedAt: nowDate(),
        eventsFound: 2,
        events: [],
      }
      repository.updateSessionCompletedWithEvents.mockResolvedValueOnce(updatedSession)

      const result = await service.runHunt(TENANT_ID, dto, USER_EMAIL)

      // Verify session creation
      expect(repository.createSession).toHaveBeenCalledWith({
        tenantId: TENANT_ID,
        query: dto.query,
        status: 'running',
        startedBy: USER_EMAIL,
        timeRange: dto.timeRange,
        reasoning: ['Querying Wazuh Indexer for matching events'],
      })

      // Verify Wazuh connector config was fetched
      expect(connectorsService.getDecryptedConfig).toHaveBeenCalledWith(
        TENANT_ID,
        ConnectorType.WAZUH
      )

      // Verify Wazuh was queried
      expect(wazuhService.searchAllAlerts).toHaveBeenCalled()

      // Verify events were stored
      expect(repository.createManyEvents).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            huntSessionId: sessionId,
            eventId: 'event-001',
            severity: 'critical',
            sourceIp: '192.168.1.100',
            user: 'root',
            description: 'Multiple failed SSH logins',
          }),
          expect.objectContaining({
            huntSessionId: sessionId,
            eventId: 'event-002',
            severity: 'medium',
            sourceIp: '10.0.0.5',
            user: 'admin',
          }),
        ])
      )

      // Verify session was updated to completed
      expect(repository.updateSessionCompletedWithEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          id: sessionId,
          status: 'completed',
          eventsFound: 2,
        })
      )

      expect(result.status).toBe('completed')
    })

    it('should throw 422 when Wazuh connector is not configured', async () => {
      repository.createSession.mockResolvedValueOnce(mockSession)
      connectorsService.getDecryptedConfig.mockResolvedValueOnce(null)
      repository.updateSessionStatus.mockResolvedValueOnce(undefined)

      try {
        await service.runHunt(TENANT_ID, dto, USER_EMAIL)
        // Should not reach here
        expect(true).toBe(false)
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        const bizError = error as BusinessException
        expect(bizError.getStatus()).toBe(422)
        expect(bizError.messageKey).toBe('errors.hunts.searchConnectorNotConfigured')
      }

      // Verify session was updated to error before throwing
      expect(repository.updateSessionStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
        })
      )
    })

    it('should update session to ERROR when Wazuh query fails', async () => {
      repository.createSession.mockResolvedValueOnce(mockSession)
      connectorsService.getDecryptedConfig.mockResolvedValueOnce({
        indexerUrl: 'https://wazuh.local:9200',
        indexerUsername: 'admin',
        indexerPassword: 'secret',
      })
      wazuhService.searchAllAlerts.mockRejectedValueOnce(
        new Error('Wazuh Indexer search failed: status 503')
      )
      repository.updateSessionStatus.mockResolvedValueOnce(undefined)

      await expect(service.runHunt(TENANT_ID, dto, USER_EMAIL)).rejects.toThrow(BusinessException)

      expect(repository.updateSessionStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          reasoning: expect.arrayContaining([expect.stringContaining('Query failed')]),
        })
      )
    })

    it('should sanitize dangerous queries with script injection patterns', async () => {
      const maliciousDto = { query: 'script alert("xss")', timeRange: '24h' as const }

      repository.createSession.mockResolvedValueOnce({
        ...mockSession,
        query: maliciousDto.query,
      })
      connectorsService.getDecryptedConfig.mockResolvedValueOnce({
        indexerUrl: 'https://wazuh.local:9200',
        indexerUsername: 'admin',
        indexerPassword: 'secret',
      })
      wazuhService.searchAllAlerts.mockResolvedValueOnce({
        hits: [],
        total: 0,
      })
      repository.updateSessionCompletedWithEvents.mockResolvedValueOnce({
        ...mockSession,
        status: 'completed',
        eventsFound: 0,
        events: [],
      })

      await service.runHunt(TENANT_ID, maliciousDto, USER_EMAIL)

      // Verify Wazuh was called with sanitized query (script keyword removed)
      const searchCall = wazuhService.searchAllAlerts.mock.calls[0]
      const esQuery = searchCall[1] as Record<string, unknown>
      const boolQuery = (esQuery.query as Record<string, unknown>).bool as Record<string, unknown>
      const must = boolQuery.must as Array<Record<string, unknown>>
      const simpleQueryString = must[0]?.simple_query_string as Record<string, unknown>
      // "script" should be removed from the query
      expect(simpleQueryString.query).not.toMatch(/\bscript\b/i)
    })

    it('should throw 400 when query is empty after sanitization', async () => {
      // A query that becomes empty after sanitization
      const emptyAfterSanitizeDto = { query: 'script', timeRange: '24h' as const }

      repository.createSession.mockResolvedValueOnce({
        ...mockSession,
        query: emptyAfterSanitizeDto.query,
      })
      connectorsService.getDecryptedConfig.mockResolvedValueOnce({
        indexerUrl: 'https://wazuh.local:9200',
        indexerUsername: 'admin',
        indexerPassword: 'secret',
      })

      await expect(service.runHunt(TENANT_ID, emptyAfterSanitizeDto, USER_EMAIL)).rejects.toThrow(
        BusinessException
      )
    })

    it('should handle zero events from Wazuh without calling createManyEvents', async () => {
      repository.createSession.mockResolvedValueOnce(mockSession)
      connectorsService.getDecryptedConfig.mockResolvedValueOnce({
        indexerUrl: 'https://wazuh.local:9200',
        indexerUsername: 'admin',
        indexerPassword: 'secret',
      })
      wazuhService.searchAllAlerts.mockResolvedValueOnce({
        hits: [],
        total: 0,
      })
      repository.updateSessionCompletedWithEvents.mockResolvedValueOnce({
        ...mockSession,
        status: 'completed',
        eventsFound: 0,
        events: [],
      })

      await service.runHunt(TENANT_ID, dto, USER_EMAIL)

      expect(repository.createManyEvents).not.toHaveBeenCalled()
    })
  })

  /* ------------------------------------------------------------------ */
  /* listRuns                                                             */
  /* ------------------------------------------------------------------ */

  describe('listRuns', () => {
    it('should return paginated sessions', async () => {
      const sessions = [
        {
          id: 'session-001',
          tenantId: TENANT_ID,
          query: 'failed login',
          status: 'completed',
          startedBy: USER_EMAIL,
          startedAt: nowDate(),
          completedAt: nowDate(),
          eventsFound: 5,
          reasoning: [],
        },
        {
          id: 'session-002',
          tenantId: TENANT_ID,
          query: 'suspicious process',
          status: 'running',
          startedBy: USER_EMAIL,
          startedAt: nowDate(),
          completedAt: null,
          eventsFound: null,
          reasoning: [],
        },
      ]

      repository.findSessionsPaginated.mockResolvedValueOnce(sessions)
      repository.countSessions.mockResolvedValueOnce(2)

      const result = await service.listRuns(TENANT_ID, 1, 10)

      expect(result.data).toHaveLength(2)
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      })

      expect(repository.findSessionsPaginated).toHaveBeenCalledWith(TENANT_ID, 0, 10)
    })

    it('should handle empty list', async () => {
      repository.findSessionsPaginated.mockResolvedValueOnce([])
      repository.countSessions.mockResolvedValueOnce(0)

      const result = await service.listRuns(TENANT_ID, 1, 10)

      expect(result.data).toEqual([])
      expect(result.pagination.total).toBe(0)
      expect(result.pagination.totalPages).toBe(0)
      expect(result.pagination.hasNext).toBe(false)
      expect(result.pagination.hasPrev).toBe(false)
    })

    it('should calculate pagination correctly for page 2', async () => {
      repository.findSessionsPaginated.mockResolvedValueOnce([
        {
          id: 'session-003',
          tenantId: TENANT_ID,
          query: 'port scan',
          status: 'completed',
          startedBy: USER_EMAIL,
          startedAt: nowDate(),
          completedAt: nowDate(),
          eventsFound: 10,
          reasoning: [],
        },
      ])
      repository.countSessions.mockResolvedValueOnce(15)

      const result = await service.listRuns(TENANT_ID, 2, 10)

      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 15,
        totalPages: 2,
        hasNext: false,
        hasPrev: true,
      })

      expect(repository.findSessionsPaginated).toHaveBeenCalledWith(TENANT_ID, 10, 10)
    })
  })

  /* ------------------------------------------------------------------ */
  /* getRun                                                               */
  /* ------------------------------------------------------------------ */

  describe('getRun', () => {
    it('should return session with events', async () => {
      const sessionWithEvents = {
        id: 'session-001',
        tenantId: TENANT_ID,
        query: 'failed login',
        status: 'completed',
        startedBy: USER_EMAIL,
        startedAt: nowDate(),
        completedAt: nowDate(),
        eventsFound: 2,
        reasoning: ['Querying Wazuh Indexer for matching events', 'Found 2 matching events'],
        events: [
          {
            id: 'event-001',
            huntSessionId: 'session-001',
            timestamp: nowDate(),
            severity: 'critical',
            eventId: 'wazuh-evt-001',
            sourceIp: '192.168.1.100',
            user: 'root',
            description: 'SSH brute force detected',
          },
          {
            id: 'event-002',
            huntSessionId: 'session-001',
            timestamp: nowDate(),
            severity: 'medium',
            eventId: 'wazuh-evt-002',
            sourceIp: '10.0.0.5',
            user: 'admin',
            description: 'Failed login attempt',
          },
        ],
      }

      repository.findSessionByIdAndTenant.mockResolvedValueOnce(sessionWithEvents)

      const result = await service.getRun(TENANT_ID, 'session-001')

      expect(result.id).toBe('session-001')
      expect(result.events).toHaveLength(2)
      expect(repository.findSessionByIdAndTenant).toHaveBeenCalledWith('session-001', TENANT_ID)
    })

    it('should throw 404 when session is not found', async () => {
      repository.findSessionByIdAndTenant.mockResolvedValueOnce(null)

      await expect(service.getRun(TENANT_ID, 'nonexistent-id')).rejects.toThrow(BusinessException)
      await expect(service.getRun(TENANT_ID, 'nonexistent-id')).rejects.toMatchObject({
        response: expect.objectContaining({ statusCode: 404 }),
      })
    })
  })

  /* ------------------------------------------------------------------ */
  /* getEvents                                                            */
  /* ------------------------------------------------------------------ */

  describe('getEvents', () => {
    it('should return paginated events', async () => {
      repository.findSessionExistsByIdAndTenant.mockResolvedValueOnce({ id: 'session-001' })

      const events = [
        {
          id: 'event-001',
          huntSessionId: 'session-001',
          timestamp: nowDate(),
          severity: 'critical',
          eventId: 'wazuh-evt-001',
          sourceIp: '192.168.1.100',
          user: 'root',
          description: 'SSH brute force detected',
        },
        {
          id: 'event-002',
          huntSessionId: 'session-001',
          timestamp: nowDate(),
          severity: 'high',
          eventId: 'wazuh-evt-002',
          sourceIp: '10.0.0.5',
          user: 'admin',
          description: 'Privilege escalation attempt',
        },
      ]

      repository.findEventsPaginated.mockResolvedValueOnce(events)
      repository.countEvents.mockResolvedValueOnce(2)

      const result = await service.getEvents(TENANT_ID, 'session-001', 1, 10)

      expect(result.data).toHaveLength(2)
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      })

      expect(repository.findEventsPaginated).toHaveBeenCalledWith('session-001', 0, 10)
    })

    it('should throw 404 when session is not found', async () => {
      repository.findSessionExistsByIdAndTenant.mockResolvedValueOnce(null)

      await expect(service.getEvents(TENANT_ID, 'nonexistent-session', 1, 10)).rejects.toThrow(
        BusinessException
      )

      await expect(
        service.getEvents(TENANT_ID, 'nonexistent-session', 1, 10)
      ).rejects.toMatchObject({
        response: expect.objectContaining({ statusCode: 404 }),
      })
    })

    it('should handle pagination for page 2 of events', async () => {
      repository.findSessionExistsByIdAndTenant.mockResolvedValueOnce({ id: 'session-001' })
      repository.findEventsPaginated.mockResolvedValueOnce([
        {
          id: 'event-011',
          huntSessionId: 'session-001',
          timestamp: nowDate(),
          severity: 'low',
          eventId: 'wazuh-evt-011',
          sourceIp: null,
          user: null,
          description: 'Minor event',
        },
      ])
      repository.countEvents.mockResolvedValueOnce(25)

      const result = await service.getEvents(TENANT_ID, 'session-001', 2, 10)

      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: true,
      })

      expect(repository.findEventsPaginated).toHaveBeenCalledWith('session-001', 10, 10)
    })

    it('should return empty data when no events exist for session', async () => {
      repository.findSessionExistsByIdAndTenant.mockResolvedValueOnce({ id: 'session-001' })
      repository.findEventsPaginated.mockResolvedValueOnce([])
      repository.countEvents.mockResolvedValueOnce(0)

      const result = await service.getEvents(TENANT_ID, 'session-001', 1, 10)

      expect(result.data).toEqual([])
      expect(result.pagination.total).toBe(0)
    })
  })
})
