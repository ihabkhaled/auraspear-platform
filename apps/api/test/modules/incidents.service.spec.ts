import { IncidentStatus } from '../../src/common/enums'
import { BusinessException } from '../../src/common/exceptions/business.exception'
import { toDay, nowDate } from '../../src/common/utils/date-time.utility'
import { IncidentsService } from '../../src/modules/incidents/incidents.service'

const mockAppLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}

const TENANT_ID = 'tenant-001'
const INCIDENT_ID = 'incident-001'
const USER_EMAIL = 'analyst@auraspear.com'
const USER_ID = 'user-001'
const ASSIGNEE_ID = 'user-002'

function buildMockJwtPayload(overrides: Record<string, unknown> = {}) {
  return {
    sub: USER_ID,
    email: USER_EMAIL,
    tenantId: TENANT_ID,
    role: 'ADMIN',
    ...overrides,
  }
}

function createMockRepository() {
  return {
    findManyWithTenant: jest.fn(),
    count: jest.fn(),
    findFirstWithRelations: jest.fn(),
    deleteMany: jest.fn(),
    findManyTimeline: jest.fn(),
    createTimelineEntry: jest.fn(),
    findUserById: jest.fn(),
    findUserByEmail: jest.fn(),
    findUsersByIds: jest.fn(),
    findUsersByEmails: jest.fn(),
    findUserNameById: jest.fn(),
    countAlertsByIdsAndTenant: jest.fn(),
    countCasesByIdAndTenant: jest.fn(),
    findActiveTenantMembership: jest.fn(),
    createIncidentWithTimeline: jest.fn(),
    updateIncidentWithTimeline: jest.fn(),
    countByStatus: jest.fn(),
    countResolvedSince: jest.fn(),
    getAvgResolveHours: jest.fn(),
  }
}

function buildMockIncident(overrides: Record<string, unknown> = {}) {
  return {
    id: INCIDENT_ID,
    tenantId: TENANT_ID,
    incidentNumber: 'INC-001',
    title: 'Suspicious Lateral Movement',
    description: 'Detected lateral movement across segments',
    severity: 'high',
    status: IncidentStatus.OPEN,
    category: 'intrusion',
    assigneeId: null,
    linkedAlertIds: [],
    linkedCaseId: null,
    mitreTactics: ['Lateral Movement'],
    mitreTechniques: ['T1021'],
    createdBy: USER_EMAIL,
    resolvedAt: null,
    createdAt: toDay('2025-06-01T12:00:00Z').toDate(),
    updatedAt: toDay('2025-06-01T12:00:00Z').toDate(),
    tenant: { name: 'Test Tenant' },
    timeline: [],
    ...overrides,
  }
}

describe('IncidentsService', () => {
  let service: IncidentsService
  let repository: ReturnType<typeof createMockRepository>

  beforeEach(() => {
    repository = createMockRepository()
    jest.clearAllMocks()

    service = new IncidentsService(repository as never, mockAppLogger as never)
  })

  // ---------------------------------------------------------------------------
  // listIncidents
  // ---------------------------------------------------------------------------
  describe('listIncidents', () => {
    it('should return paginated results with data and pagination meta', async () => {
      const incidents = [buildMockIncident(), buildMockIncident({ id: 'incident-002' })]
      repository.findManyWithTenant.mockResolvedValue(incidents)
      repository.count.mockResolvedValue(2)
      repository.findUsersByIds.mockResolvedValue([])
      repository.findUsersByEmails.mockResolvedValue([{ email: USER_EMAIL, name: 'Test Analyst' }])

      const result = await service.listIncidents(TENANT_ID, 1, 20)

      expect(result.data).toHaveLength(2)
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      })
      expect(repository.findManyWithTenant).toHaveBeenCalledTimes(1)
      expect(repository.count).toHaveBeenCalledTimes(1)
    })

    it('should always include tenantId in where clause', async () => {
      repository.findManyWithTenant.mockResolvedValue([])
      repository.count.mockResolvedValue(0)
      repository.findUsersByIds.mockResolvedValue([])
      repository.findUsersByEmails.mockResolvedValue([])

      await service.listIncidents(TENANT_ID, 1, 20)

      const callArguments = repository.findManyWithTenant.mock.calls[0][0]
      expect(callArguments.where.tenantId).toBe(TENANT_ID)
    })

    it('should filter by status', async () => {
      repository.findManyWithTenant.mockResolvedValue([])
      repository.count.mockResolvedValue(0)
      repository.findUsersByIds.mockResolvedValue([])
      repository.findUsersByEmails.mockResolvedValue([])

      await service.listIncidents(TENANT_ID, 1, 20, undefined, undefined, 'open')

      const callArguments = repository.findManyWithTenant.mock.calls[0][0]
      expect(callArguments.where.status).toBe('open')
    })

    it('should filter by severity', async () => {
      repository.findManyWithTenant.mockResolvedValue([])
      repository.count.mockResolvedValue(0)
      repository.findUsersByIds.mockResolvedValue([])
      repository.findUsersByEmails.mockResolvedValue([])

      await service.listIncidents(TENANT_ID, 1, 20, undefined, undefined, undefined, 'critical')

      const callArguments = repository.findManyWithTenant.mock.calls[0][0]
      expect(callArguments.where.severity).toBe('critical')
    })

    it('should filter by category', async () => {
      repository.findManyWithTenant.mockResolvedValue([])
      repository.count.mockResolvedValue(0)
      repository.findUsersByIds.mockResolvedValue([])
      repository.findUsersByEmails.mockResolvedValue([])

      await service.listIncidents(
        TENANT_ID,
        1,
        20,
        undefined,
        undefined,
        undefined,
        undefined,
        'malware'
      )

      const callArguments = repository.findManyWithTenant.mock.calls[0][0]
      expect(callArguments.where.category).toBe('malware')
    })

    it('should apply free text search across title, incidentNumber, description', async () => {
      repository.findManyWithTenant.mockResolvedValue([])
      repository.count.mockResolvedValue(0)
      repository.findUsersByIds.mockResolvedValue([])
      repository.findUsersByEmails.mockResolvedValue([])

      await service.listIncidents(
        TENANT_ID,
        1,
        20,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'lateral'
      )

      const callArguments = repository.findManyWithTenant.mock.calls[0][0]
      expect(callArguments.where.OR).toBeDefined()
      expect(callArguments.where.OR).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            title: { contains: 'lateral', mode: 'insensitive' },
          }),
          expect.objectContaining({
            incidentNumber: { contains: 'lateral', mode: 'insensitive' },
          }),
          expect.objectContaining({
            description: { contains: 'lateral', mode: 'insensitive' },
          }),
        ])
      )
    })

    it('should apply correct pagination skip and take', async () => {
      repository.findManyWithTenant.mockResolvedValue([])
      repository.count.mockResolvedValue(100)
      repository.findUsersByIds.mockResolvedValue([])
      repository.findUsersByEmails.mockResolvedValue([])

      await service.listIncidents(TENANT_ID, 3, 10)

      expect(repository.findManyWithTenant).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 })
      )
    })

    it('should use default pagination values', async () => {
      repository.findManyWithTenant.mockResolvedValue([])
      repository.count.mockResolvedValue(0)
      repository.findUsersByIds.mockResolvedValue([])
      repository.findUsersByEmails.mockResolvedValue([])

      await service.listIncidents(TENANT_ID)

      expect(repository.findManyWithTenant).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 })
      )
    })

    it('should handle empty results', async () => {
      repository.findManyWithTenant.mockResolvedValue([])
      repository.count.mockResolvedValue(0)
      repository.findUsersByIds.mockResolvedValue([])
      repository.findUsersByEmails.mockResolvedValue([])

      const result = await service.listIncidents(TENANT_ID, 1, 20)

      expect(result.data).toHaveLength(0)
      expect(result.pagination.total).toBe(0)
      expect(result.pagination.totalPages).toBe(0)
    })

    it('should resolve assignee names in batch', async () => {
      const incidents = [
        buildMockIncident({ assigneeId: ASSIGNEE_ID }),
        buildMockIncident({ id: 'incident-002', assigneeId: ASSIGNEE_ID }),
      ]
      repository.findManyWithTenant.mockResolvedValue(incidents)
      repository.count.mockResolvedValue(2)
      repository.findUsersByIds.mockResolvedValue([
        { id: ASSIGNEE_ID, name: 'Assignee User', email: 'assignee@auraspear.com' },
      ])
      repository.findUsersByEmails.mockResolvedValue([{ email: USER_EMAIL, name: 'Test Analyst' }])

      const result = await service.listIncidents(TENANT_ID, 1, 20)

      expect(result.data[0].assigneeName).toBe('Assignee User')
      expect(result.data[0].assigneeEmail).toBe('assignee@auraspear.com')
    })

    it('should sort by createdAt descending by default', async () => {
      repository.findManyWithTenant.mockResolvedValue([])
      repository.count.mockResolvedValue(0)
      repository.findUsersByIds.mockResolvedValue([])
      repository.findUsersByEmails.mockResolvedValue([])

      await service.listIncidents(TENANT_ID, 1, 20)

      const callArguments = repository.findManyWithTenant.mock.calls[0][0]
      expect(callArguments.orderBy).toEqual({ createdAt: 'desc' })
    })

    it('should sort by specified field and order', async () => {
      repository.findManyWithTenant.mockResolvedValue([])
      repository.count.mockResolvedValue(0)
      repository.findUsersByIds.mockResolvedValue([])
      repository.findUsersByEmails.mockResolvedValue([])

      await service.listIncidents(TENANT_ID, 1, 20, 'severity', 'asc')

      const callArguments = repository.findManyWithTenant.mock.calls[0][0]
      expect(callArguments.orderBy).toEqual({ severity: 'asc' })
    })
  })

  // ---------------------------------------------------------------------------
  // getIncidentById
  // ---------------------------------------------------------------------------
  describe('getIncidentById', () => {
    it('should return incident with resolved names when found', async () => {
      const incident = buildMockIncident({ assigneeId: ASSIGNEE_ID })
      repository.findFirstWithRelations.mockResolvedValue(incident)
      repository.findUserById.mockResolvedValue({
        name: 'Assignee User',
        email: 'assignee@auraspear.com',
      })
      repository.findUserByEmail.mockResolvedValue({ name: 'Test Analyst' })

      const result = await service.getIncidentById(INCIDENT_ID, TENANT_ID)

      expect(result.id).toBe(INCIDENT_ID)
      expect(result.assigneeName).toBe('Assignee User')
      expect(result.createdByName).toBe('Test Analyst')
      expect(result.tenantName).toBe('Test Tenant')
      expect(repository.findFirstWithRelations).toHaveBeenCalledWith({
        id: INCIDENT_ID,
        tenantId: TENANT_ID,
      })
    })

    it('should throw BusinessException 404 when not found', async () => {
      repository.findFirstWithRelations.mockResolvedValue(null)

      try {
        await service.getIncidentById('nonexistent', TENANT_ID)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })

    it('should always include tenantId in query', async () => {
      repository.findFirstWithRelations.mockResolvedValue(null)

      try {
        await service.getIncidentById(INCIDENT_ID, TENANT_ID)
      } catch {
        // expected
      }

      expect(repository.findFirstWithRelations).toHaveBeenCalledWith({
        id: INCIDENT_ID,
        tenantId: TENANT_ID,
      })
    })
  })

  // ---------------------------------------------------------------------------
  // createIncident
  // ---------------------------------------------------------------------------
  describe('createIncident', () => {
    const baseDto = {
      title: 'New Incident',
      description: 'Test description',
      severity: 'high' as const,
      category: 'intrusion' as const,
    }

    it('should create incident and return record with resolved names', async () => {
      const createdIncident = buildMockIncident({ title: 'New Incident' })
      repository.createIncidentWithTimeline.mockResolvedValue(createdIncident)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue({ name: 'Test Analyst' })

      const result = await service.createIncident(baseDto, buildMockJwtPayload() as never)

      expect(result.title).toBe('New Incident')
      expect(result.tenantName).toBe('Test Tenant')
      expect(repository.createIncidentWithTimeline).toHaveBeenCalledTimes(1)
      expect(mockAppLogger.info).toHaveBeenCalled()
    })

    it('should pass tenantId from user payload', async () => {
      const createdIncident = buildMockIncident()
      repository.createIncidentWithTimeline.mockResolvedValue(createdIncident)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue({ name: 'Test Analyst' })

      await service.createIncident(baseDto, buildMockJwtPayload() as never)

      const callArguments = repository.createIncidentWithTimeline.mock.calls[0][0]
      expect(callArguments.data.tenantId).toBe(TENANT_ID)
    })

    it('should set initial status to OPEN', async () => {
      const createdIncident = buildMockIncident()
      repository.createIncidentWithTimeline.mockResolvedValue(createdIncident)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue({ name: 'Test Analyst' })

      await service.createIncident(baseDto, buildMockJwtPayload() as never)

      const callArguments = repository.createIncidentWithTimeline.mock.calls[0][0]
      expect(callArguments.data.status).toBe(IncidentStatus.OPEN)
    })

    it('should validate assignee belongs to tenant when assigneeId provided', async () => {
      repository.findActiveTenantMembership.mockResolvedValue(null)

      const dto = { ...baseDto, assigneeId: 'invalid-user' }

      try {
        await service.createIncident(dto, buildMockJwtPayload() as never)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(400)
      }

      expect(repository.findActiveTenantMembership).toHaveBeenCalledWith('invalid-user', TENANT_ID)
    })

    it('should validate linked alerts belong to tenant', async () => {
      repository.countAlertsByIdsAndTenant.mockResolvedValue(1) // only 1 of 2 valid

      const dto = { ...baseDto, linkedAlertIds: ['alert-1', 'alert-2'] }

      try {
        await service.createIncident(dto, buildMockJwtPayload() as never)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(400)
      }
    })

    it('should validate linked case belongs to tenant', async () => {
      repository.countCasesByIdAndTenant.mockResolvedValue(0)

      const dto = { ...baseDto, linkedCaseId: 'case-nonexistent' }

      try {
        await service.createIncident(dto, buildMockJwtPayload() as never)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(400)
      }
    })

    it('should accept valid linked alerts', async () => {
      repository.countAlertsByIdsAndTenant.mockResolvedValue(2)
      const createdIncident = buildMockIncident({ linkedAlertIds: ['alert-1', 'alert-2'] })
      repository.createIncidentWithTimeline.mockResolvedValue(createdIncident)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue({ name: 'Test Analyst' })

      const dto = { ...baseDto, linkedAlertIds: ['alert-1', 'alert-2'] }
      const result = await service.createIncident(dto, buildMockJwtPayload() as never)

      expect(result).toBeDefined()
      expect(repository.createIncidentWithTimeline).toHaveBeenCalledTimes(1)
    })
  })

  // ---------------------------------------------------------------------------
  // updateIncident
  // ---------------------------------------------------------------------------
  describe('updateIncident', () => {
    it('should update incident and return record', async () => {
      const existing = buildMockIncident({ status: IncidentStatus.OPEN })
      repository.findFirstWithRelations.mockResolvedValue(existing)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue({ name: 'Test Analyst' })
      repository.findUserNameById.mockResolvedValue({ name: 'Test Analyst' })

      const updatedIncident = buildMockIncident({ title: 'Updated Title' })
      repository.updateIncidentWithTimeline.mockResolvedValue(updatedIncident)

      const result = await service.updateIncident(
        INCIDENT_ID,
        { title: 'Updated Title' },
        buildMockJwtPayload() as never
      )

      expect(result).toBeDefined()
      expect(repository.updateIncidentWithTimeline).toHaveBeenCalledTimes(1)
    })

    it('should throw BusinessException 400 when updating a closed incident without reopening', async () => {
      const closedIncident = buildMockIncident({ status: IncidentStatus.CLOSED })
      repository.findFirstWithRelations.mockResolvedValue(closedIncident)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue({ name: 'Test Analyst' })

      try {
        await service.updateIncident(
          INCIDENT_ID,
          { title: 'Updated Title' },
          buildMockJwtPayload() as never
        )
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(400)
      }
    })

    it('should allow reopening a closed incident by changing status to open', async () => {
      const closedIncident = buildMockIncident({ status: IncidentStatus.CLOSED })
      repository.findFirstWithRelations.mockResolvedValue(closedIncident)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue({ name: 'Test Analyst' })
      repository.findUserNameById.mockResolvedValue({ name: 'Test Analyst' })

      const reopenedIncident = buildMockIncident({ status: IncidentStatus.OPEN })
      repository.updateIncidentWithTimeline.mockResolvedValue(reopenedIncident)

      const result = await service.updateIncident(
        INCIDENT_ID,
        { status: 'open' },
        buildMockJwtPayload() as never
      )

      expect(result).toBeDefined()
    })

    it('should allow reopening a closed incident by changing status to in_progress', async () => {
      const closedIncident = buildMockIncident({ status: IncidentStatus.CLOSED })
      repository.findFirstWithRelations.mockResolvedValue(closedIncident)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue({ name: 'Test Analyst' })
      repository.findUserNameById.mockResolvedValue({ name: 'Test Analyst' })

      const reopenedIncident = buildMockIncident({ status: IncidentStatus.IN_PROGRESS })
      repository.updateIncidentWithTimeline.mockResolvedValue(reopenedIncident)

      const result = await service.updateIncident(
        INCIDENT_ID,
        { status: 'in_progress' },
        buildMockJwtPayload() as never
      )

      expect(result).toBeDefined()
    })

    it('should throw BusinessException 404 when incident not found', async () => {
      repository.findFirstWithRelations.mockResolvedValue(null)

      try {
        await service.updateIncident(
          'nonexistent',
          { title: 'test' },
          buildMockJwtPayload() as never
        )
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })

    it('should throw BusinessException 404 when update transaction returns null', async () => {
      const existing = buildMockIncident({ status: IncidentStatus.OPEN })
      repository.findFirstWithRelations.mockResolvedValue(existing)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue({ name: 'Test Analyst' })
      repository.findUserNameById.mockResolvedValue({ name: 'Test Analyst' })
      repository.updateIncidentWithTimeline.mockResolvedValue(null)

      try {
        await service.updateIncident(INCIDENT_ID, { title: 'test' }, buildMockJwtPayload() as never)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })

    it('should set resolvedAt when transitioning to resolved', async () => {
      const existing = buildMockIncident({ status: IncidentStatus.IN_PROGRESS })
      repository.findFirstWithRelations.mockResolvedValue(existing)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue({ name: 'Test Analyst' })
      repository.findUserNameById.mockResolvedValue({ name: 'Test Analyst' })

      const resolvedIncident = buildMockIncident({
        status: IncidentStatus.RESOLVED,
        resolvedAt: nowDate(),
      })
      repository.updateIncidentWithTimeline.mockResolvedValue(resolvedIncident)

      await service.updateIncident(
        INCIDENT_ID,
        { status: 'resolved' },
        buildMockJwtPayload() as never
      )

      const callArguments = repository.updateIncidentWithTimeline.mock.calls[0][0]
      expect(callArguments.updateData['resolvedAt']).toBeInstanceOf(Date)
    })

    it('should clear resolvedAt when reopening', async () => {
      const existing = buildMockIncident({
        status: IncidentStatus.RESOLVED,
        resolvedAt: nowDate(),
      })
      repository.findFirstWithRelations.mockResolvedValue(existing)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue({ name: 'Test Analyst' })
      repository.findUserNameById.mockResolvedValue({ name: 'Test Analyst' })

      const reopenedIncident = buildMockIncident({ status: IncidentStatus.OPEN, resolvedAt: null })
      repository.updateIncidentWithTimeline.mockResolvedValue(reopenedIncident)

      await service.updateIncident(INCIDENT_ID, { status: 'open' }, buildMockJwtPayload() as never)

      const callArguments = repository.updateIncidentWithTimeline.mock.calls[0][0]
      expect(callArguments.updateData['resolvedAt']).toBeNull()
    })

    it('should validate assignee when updating assigneeId', async () => {
      const existing = buildMockIncident({ status: IncidentStatus.OPEN })
      repository.findFirstWithRelations.mockResolvedValue(existing)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue({ name: 'Test Analyst' })
      repository.findActiveTenantMembership.mockResolvedValue(null)

      try {
        await service.updateIncident(
          INCIDENT_ID,
          { assigneeId: 'invalid-user' },
          buildMockJwtPayload() as never
        )
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(400)
      }
    })
  })

  // ---------------------------------------------------------------------------
  // changeStatus
  // ---------------------------------------------------------------------------
  describe('changeStatus', () => {
    it('should update only the incident status through the dedicated flow', async () => {
      const existing = buildMockIncident({ status: IncidentStatus.IN_PROGRESS })
      repository.findFirstWithRelations.mockResolvedValue(existing)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue({ name: 'Test Analyst' })
      repository.findUserNameById.mockResolvedValue({ name: 'Test Analyst' })

      const updatedIncident = buildMockIncident({ status: IncidentStatus.RESOLVED })
      repository.updateIncidentWithTimeline.mockResolvedValue(updatedIncident)

      const result = await service.changeStatus(
        INCIDENT_ID,
        IncidentStatus.RESOLVED,
        buildMockJwtPayload() as never
      )

      expect(result.status).toBe(IncidentStatus.RESOLVED)
      expect(repository.updateIncidentWithTimeline).toHaveBeenCalledWith(
        expect.objectContaining({
          id: INCIDENT_ID,
          tenantId: TENANT_ID,
          updateData: expect.objectContaining({
            status: IncidentStatus.RESOLVED,
          }),
        })
      )
    })
  })

  // ---------------------------------------------------------------------------
  // deleteIncident
  // ---------------------------------------------------------------------------
  describe('deleteIncident', () => {
    it('should delete incident and return { deleted: true }', async () => {
      const existing = buildMockIncident()
      repository.findFirstWithRelations.mockResolvedValue(existing)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue({ name: 'Test Analyst' })
      repository.deleteMany.mockResolvedValue({ count: 1 })

      const result = await service.deleteIncident(INCIDENT_ID, TENANT_ID, USER_EMAIL)

      expect(result).toEqual({ deleted: true })
      expect(repository.deleteMany).toHaveBeenCalledWith({
        id: INCIDENT_ID,
        tenantId: TENANT_ID,
      })
    })

    it('should throw BusinessException 404 when incident not found', async () => {
      repository.findFirstWithRelations.mockResolvedValue(null)

      try {
        await service.deleteIncident('nonexistent', TENANT_ID, USER_EMAIL)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })

    it('should always include tenantId in delete query', async () => {
      const existing = buildMockIncident()
      repository.findFirstWithRelations.mockResolvedValue(existing)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue({ name: 'Test Analyst' })
      repository.deleteMany.mockResolvedValue({ count: 1 })

      await service.deleteIncident(INCIDENT_ID, TENANT_ID, USER_EMAIL)

      expect(repository.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: TENANT_ID })
      )
    })
  })

  // ---------------------------------------------------------------------------
  // getIncidentTimeline
  // ---------------------------------------------------------------------------
  describe('getIncidentTimeline', () => {
    it('should return timeline entries for an incident', async () => {
      const existing = buildMockIncident()
      repository.findFirstWithRelations.mockResolvedValue(existing)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue({ name: 'Test Analyst' })

      const timelineEntries = [
        {
          id: 'tl-001',
          incidentId: INCIDENT_ID,
          event: 'Incident created',
          actorType: 'user',
          actorName: USER_EMAIL,
          timestamp: nowDate(),
        },
      ]
      repository.findManyTimeline.mockResolvedValue(timelineEntries)

      const result = await service.getIncidentTimeline(INCIDENT_ID, TENANT_ID)

      expect(result).toHaveLength(1)
      expect(result[0].event).toBe('Incident created')
      expect(repository.findManyTimeline).toHaveBeenCalledWith({
        where: { incidentId: INCIDENT_ID },
        orderBy: { timestamp: 'desc' },
      })
    })

    it('should throw BusinessException 404 when incident not found', async () => {
      repository.findFirstWithRelations.mockResolvedValue(null)

      try {
        await service.getIncidentTimeline('nonexistent', TENANT_ID)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })
  })

  // ---------------------------------------------------------------------------
  // addTimelineEntry
  // ---------------------------------------------------------------------------
  describe('addTimelineEntry', () => {
    it('should create a timeline entry and return it', async () => {
      const existing = buildMockIncident()
      repository.findFirstWithRelations.mockResolvedValue(existing)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue({ name: 'Test Analyst' })

      const newEntry = {
        id: 'tl-002',
        incidentId: INCIDENT_ID,
        event: 'Custom note added',
        actorType: 'user',
        actorName: USER_EMAIL,
        timestamp: nowDate(),
      }
      repository.createTimelineEntry.mockResolvedValue(newEntry)

      const dto = { event: 'Custom note added' }
      const result = await service.addTimelineEntry(
        INCIDENT_ID,
        dto,
        buildMockJwtPayload() as never
      )

      expect(result.event).toBe('Custom note added')
      expect(repository.createTimelineEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          incidentId: INCIDENT_ID,
          event: 'Custom note added',
          actorType: 'user',
          actorName: USER_EMAIL,
        })
      )
    })

    it('should throw BusinessException 404 when incident not found', async () => {
      repository.findFirstWithRelations.mockResolvedValue(null)

      try {
        await service.addTimelineEntry(
          'nonexistent',
          { event: 'test' },
          buildMockJwtPayload() as never
        )
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })

    it('should use provided actorType when specified', async () => {
      const existing = buildMockIncident()
      repository.findFirstWithRelations.mockResolvedValue(existing)
      repository.findUserById.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue({ name: 'Test Analyst' })

      const newEntry = {
        id: 'tl-003',
        incidentId: INCIDENT_ID,
        event: 'AI analysis',
        actorType: 'ai_agent',
        actorName: USER_EMAIL,
        timestamp: nowDate(),
      }
      repository.createTimelineEntry.mockResolvedValue(newEntry)

      await service.addTimelineEntry(
        INCIDENT_ID,
        { event: 'AI analysis', actorType: 'ai_agent' },
        buildMockJwtPayload() as never
      )

      expect(repository.createTimelineEntry).toHaveBeenCalledWith(
        expect.objectContaining({ actorType: 'ai_agent' })
      )
    })
  })

  // ---------------------------------------------------------------------------
  // getIncidentStats
  // ---------------------------------------------------------------------------
  describe('getIncidentStats', () => {
    it('should return correct stats aggregation', async () => {
      repository.countByStatus.mockResolvedValueOnce(5) // open
      repository.countByStatus.mockResolvedValueOnce(3) // in_progress
      repository.countByStatus.mockResolvedValueOnce(2) // contained
      repository.countResolvedSince.mockResolvedValue(10)
      repository.getAvgResolveHours.mockResolvedValue(18)

      const result = await service.getIncidentStats(TENANT_ID)

      expect(result.open).toBe(5)
      expect(result.inProgress).toBe(3)
      expect(result.contained).toBe(2)
      expect(result.resolved30d).toBe(10)
      expect(result.avgResolveHours).toBeGreaterThan(0)
      expect(typeof result.avgResolveHours).toBe('number')
    })

    it('should return null avgResolveHours when no resolved incidents', async () => {
      repository.countByStatus.mockResolvedValueOnce(0)
      repository.countByStatus.mockResolvedValueOnce(0)
      repository.countByStatus.mockResolvedValueOnce(0)
      repository.countResolvedSince.mockResolvedValue(0)
      repository.getAvgResolveHours.mockResolvedValue(null)

      const result = await service.getIncidentStats(TENANT_ID)

      expect(result.avgResolveHours).toBeNull()
    })

    it('should always scope stats queries to tenantId', async () => {
      repository.countByStatus.mockResolvedValue(0)
      repository.countResolvedSince.mockResolvedValue(0)
      repository.getAvgResolveHours.mockResolvedValue(null)

      await service.getIncidentStats(TENANT_ID)

      expect(repository.countByStatus).toHaveBeenCalledWith(TENANT_ID, IncidentStatus.OPEN)
      expect(repository.countByStatus).toHaveBeenCalledWith(TENANT_ID, IncidentStatus.IN_PROGRESS)
      expect(repository.countByStatus).toHaveBeenCalledWith(TENANT_ID, IncidentStatus.CONTAINED)
      expect(repository.getAvgResolveHours).toHaveBeenCalledWith(TENANT_ID)
    })

    it('should rethrow errors from repository', async () => {
      const dbError = new Error('Database error')
      repository.countByStatus.mockRejectedValue(dbError)

      try {
        await service.getIncidentStats(TENANT_ID)
        fail('Expected error to be thrown')
      } catch (error) {
        expect(error).toBe(dbError)
      }
    })
  })
})
