import { BusinessException } from '../../src/common/exceptions/business.exception'
import { toDay } from '../../src/common/utils/date-time.utility'
import { AiAgentsService } from '../../src/modules/ai-agents/ai-agents.service'

const mockAppLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}

function createMockRepository() {
  return {
    findMany: jest.fn(),
    findManyWithCounts: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
    findFirstWithDetails: jest.fn(),
    findFirstSelect: jest.fn(),
    create: jest.fn(),
    createWithDetails: jest.fn(),
    update: jest.fn(),
    updateWithDetails: jest.fn(),
    deleteMany: jest.fn(),
    aggregate: jest.fn(),
    findManySessions: jest.fn(),
    countSessions: jest.fn(),
    createSession: jest.fn(),
  }
}

function createMockJobService() {
  return {
    enqueue: jest.fn(),
  }
}

const TENANT_ID = 'tenant-001'
const AGENT_ID = 'agent-001'
const USER_EMAIL = 'analyst@auraspear.com'
const USER_SUB = 'user-001'

function buildMockUser(overrides: Record<string, unknown> = {}) {
  return {
    sub: USER_SUB,
    email: USER_EMAIL,
    tenantId: TENANT_ID,
    role: 'ADMIN',
    ...overrides,
  }
}

function buildMockAgent(overrides: Record<string, unknown> = {}) {
  return {
    id: AGENT_ID,
    tenantId: TENANT_ID,
    name: 'Alert Triage Agent',
    description: 'Automates alert triage and classification',
    model: 'claude-sonnet-4-20250514',
    tier: 'L1',
    status: 'online',
    soulMd: '# Agent Soul\nYou are an alert triage assistant.',
    totalTokens: 50000,
    totalCost: 1.25,
    createdAt: toDay('2025-06-01T12:00:00Z').toDate(),
    updatedAt: toDay('2025-06-01T12:00:00Z').toDate(),
    ...overrides,
  }
}

function buildMockAgentWithCounts(overrides: Record<string, unknown> = {}) {
  return {
    ...buildMockAgent(overrides),
    _count: { tools: 3, sessions: 10 },
    tools: [],
    sessions: [],
  }
}

function buildMockSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 'session-001',
    agentId: AGENT_ID,
    status: 'completed',
    tokensUsed: 1500,
    cost: 0.03,
    startedAt: toDay('2025-06-01T12:00:00Z').toDate(),
    endedAt: toDay('2025-06-01T12:05:00Z').toDate(),
    createdAt: toDay('2025-06-01T12:00:00Z').toDate(),
    updatedAt: toDay('2025-06-01T12:05:00Z').toDate(),
    ...overrides,
  }
}

describe('AiAgentsService', () => {
  let service: AiAgentsService
  let repository: ReturnType<typeof createMockRepository>
  let jobService: ReturnType<typeof createMockJobService>

  beforeEach(() => {
    repository = createMockRepository()
    jobService = createMockJobService()
    jest.clearAllMocks()

    service = new AiAgentsService(repository as never, mockAppLogger as never, jobService as never)
  })

  // ---------------------------------------------------------------------------
  // listAgents
  // ---------------------------------------------------------------------------
  describe('listAgents', () => {
    it('should return paginated results with data and pagination meta', async () => {
      const agents = [
        { ...buildMockAgent(), _count: { tools: 2, sessions: 5 } },
        { ...buildMockAgent({ id: 'agent-002' }), _count: { tools: 1, sessions: 3 } },
      ]
      repository.findManyWithCounts.mockResolvedValue(agents)
      repository.count.mockResolvedValue(2)

      const result = await service.listAgents(TENANT_ID, 1, 20)

      expect(result.data).toHaveLength(2)
      expect(result.data[0]).toHaveProperty('toolsCount', 2)
      expect(result.data[0]).toHaveProperty('sessionsCount', 5)
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      })
    })

    it('should always include tenantId in where clause', async () => {
      repository.findManyWithCounts.mockResolvedValue([])
      repository.count.mockResolvedValue(0)

      await service.listAgents(TENANT_ID, 1, 20)

      const whereArgument = repository.findManyWithCounts.mock.calls[0][0].where
      expect(whereArgument.tenantId).toBe(TENANT_ID)
    })

    it('should filter by status', async () => {
      repository.findManyWithCounts.mockResolvedValue([])
      repository.count.mockResolvedValue(0)

      await service.listAgents(TENANT_ID, 1, 20, undefined, undefined, 'online')

      const whereArgument = repository.findManyWithCounts.mock.calls[0][0].where
      expect(whereArgument.status).toBe('online')
    })

    it('should filter by tier', async () => {
      repository.findManyWithCounts.mockResolvedValue([])
      repository.count.mockResolvedValue(0)

      await service.listAgents(TENANT_ID, 1, 20, undefined, undefined, undefined, 'L2')

      const whereArgument = repository.findManyWithCounts.mock.calls[0][0].where
      expect(whereArgument.tier).toBe('L2')
    })

    it('should filter by query with case-insensitive search across name, description, model', async () => {
      repository.findManyWithCounts.mockResolvedValue([])
      repository.count.mockResolvedValue(0)

      await service.listAgents(
        TENANT_ID,
        1,
        20,
        undefined,
        undefined,
        undefined,
        undefined,
        'triage'
      )

      const whereArgument = repository.findManyWithCounts.mock.calls[0][0].where
      expect(whereArgument.OR).toEqual([
        { name: { contains: 'triage', mode: 'insensitive' } },
        { description: { contains: 'triage', mode: 'insensitive' } },
        { model: { contains: 'triage', mode: 'insensitive' } },
      ])
    })

    it('should not apply query filter for empty string', async () => {
      repository.findManyWithCounts.mockResolvedValue([])
      repository.count.mockResolvedValue(0)

      await service.listAgents(TENANT_ID, 1, 20, undefined, undefined, undefined, undefined, '   ')

      const whereArgument = repository.findManyWithCounts.mock.calls[0][0].where
      expect(whereArgument.OR).toBeUndefined()
    })

    it('should apply correct pagination skip and take', async () => {
      repository.findManyWithCounts.mockResolvedValue([])
      repository.count.mockResolvedValue(100)

      await service.listAgents(TENANT_ID, 3, 10)

      expect(repository.findManyWithCounts).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 })
      )
    })

    it('should handle empty results', async () => {
      repository.findManyWithCounts.mockResolvedValue([])
      repository.count.mockResolvedValue(0)

      const result = await service.listAgents(TENANT_ID, 1, 20)

      expect(result.data).toHaveLength(0)
      expect(result.pagination.total).toBe(0)
      expect(result.pagination.totalPages).toBe(0)
    })

    it('should sort by name ascending', async () => {
      repository.findManyWithCounts.mockResolvedValue([])
      repository.count.mockResolvedValue(0)

      await service.listAgents(TENANT_ID, 1, 20, 'name', 'asc')

      const orderByArgument = repository.findManyWithCounts.mock.calls[0][0].orderBy
      expect(orderByArgument).toEqual({ name: 'asc' })
    })

    it('should default sort to createdAt desc', async () => {
      repository.findManyWithCounts.mockResolvedValue([])
      repository.count.mockResolvedValue(0)

      await service.listAgents(TENANT_ID, 1, 20)

      const orderByArgument = repository.findManyWithCounts.mock.calls[0][0].orderBy
      expect(orderByArgument).toEqual({ createdAt: 'desc' })
    })
  })

  // ---------------------------------------------------------------------------
  // getAgentById
  // ---------------------------------------------------------------------------
  describe('getAgentById', () => {
    it('should return agent record when found', async () => {
      const agent = buildMockAgentWithCounts()
      repository.findFirstWithDetails.mockResolvedValue(agent)

      const result = await service.getAgentById(AGENT_ID, TENANT_ID)

      expect(result).toHaveProperty('toolsCount', 3)
      expect(result).toHaveProperty('sessionsCount', 10)
      expect(result.name).toBe('Alert Triage Agent')
      expect(repository.findFirstWithDetails).toHaveBeenCalledWith({
        id: AGENT_ID,
        tenantId: TENANT_ID,
      })
    })

    it('should throw BusinessException 404 when not found', async () => {
      repository.findFirstWithDetails.mockResolvedValue(null)

      try {
        await service.getAgentById('nonexistent', TENANT_ID)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })

    it('should log warning when agent not found', async () => {
      repository.findFirstWithDetails.mockResolvedValue(null)

      try {
        await service.getAgentById('nonexistent', TENANT_ID)
      } catch {
        // expected
      }

      expect(mockAppLogger.warn).toHaveBeenCalledWith(
        'AiAgentsService => AI Agent not found',
        expect.objectContaining({
          metadata: expect.objectContaining({ agentId: 'nonexistent' }),
        })
      )
    })
  })

  // ---------------------------------------------------------------------------
  // createAgent
  // ---------------------------------------------------------------------------
  describe('createAgent', () => {
    const createDto = {
      name: 'New Agent',
      model: 'claude-sonnet-4-20250514',
      tier: 'L1' as const,
      description: 'A new agent',
    }

    it('should create agent and return record with counts', async () => {
      repository.findFirstSelect.mockResolvedValue(null)
      const createdAgent = buildMockAgentWithCounts({ name: 'New Agent' })
      repository.createWithDetails.mockResolvedValue(createdAgent)

      const result = await service.createAgent(createDto, buildMockUser() as never)

      expect(result.name).toBe('New Agent')
      expect(result).toHaveProperty('toolsCount')
      expect(repository.createWithDetails).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT_ID,
          name: 'New Agent',
          model: 'claude-sonnet-4-20250514',
          tier: 'L1',
          status: 'offline',
        })
      )
    })

    it('should throw BusinessException 409 when name already exists', async () => {
      repository.findFirstSelect.mockResolvedValue({ id: 'existing-id' })

      try {
        await service.createAgent(createDto, buildMockUser() as never)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(409)
      }

      expect(repository.createWithDetails).not.toHaveBeenCalled()
    })

    it('should log info on successful creation', async () => {
      repository.findFirstSelect.mockResolvedValue(null)
      const createdAgent = buildMockAgentWithCounts({ name: 'New Agent' })
      repository.createWithDetails.mockResolvedValue(createdAgent)

      await service.createAgent(createDto, buildMockUser() as never)

      expect(mockAppLogger.info).toHaveBeenCalledWith(
        'AiAgentsService => createAgent completed',
        expect.objectContaining({
          action: 'createAgent',
          outcome: 'success',
          tenantId: TENANT_ID,
          metadata: expect.objectContaining({ actorEmail: USER_EMAIL }),
        })
      )
    })

    it('should set initial status to offline', async () => {
      repository.findFirstSelect.mockResolvedValue(null)
      repository.createWithDetails.mockResolvedValue(buildMockAgentWithCounts())

      await service.createAgent(createDto, buildMockUser() as never)

      expect(repository.createWithDetails).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'offline' })
      )
    })

    it('should set description to null when not provided', async () => {
      repository.findFirstSelect.mockResolvedValue(null)
      repository.createWithDetails.mockResolvedValue(buildMockAgentWithCounts())

      const dtoWithoutDescription = { name: 'Agent', model: 'gpt-4', tier: 'L1' as const }
      await service.createAgent(dtoWithoutDescription, buildMockUser() as never)

      expect(repository.createWithDetails).toHaveBeenCalledWith(
        expect.objectContaining({ description: null })
      )
    })
  })

  // ---------------------------------------------------------------------------
  // updateAgent
  // ---------------------------------------------------------------------------
  describe('updateAgent', () => {
    it('should update agent and return updated record', async () => {
      repository.findFirstWithDetails.mockResolvedValue(buildMockAgentWithCounts())
      repository.findFirstSelect.mockResolvedValue(null)
      const updatedAgent = buildMockAgentWithCounts({ name: 'Updated Agent' })
      repository.updateWithDetails.mockResolvedValue(updatedAgent)

      const result = await service.updateAgent(
        AGENT_ID,
        { name: 'Updated Agent' },
        buildMockUser() as never
      )

      expect(result.name).toBe('Updated Agent')
    })

    it('should throw BusinessException 404 when agent does not exist', async () => {
      repository.findFirstWithDetails.mockResolvedValue(null)

      try {
        await service.updateAgent('nonexistent', { name: 'Updated' }, buildMockUser() as never)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })

    it('should throw BusinessException 409 when new name conflicts with existing agent', async () => {
      repository.findFirstWithDetails.mockResolvedValue(buildMockAgentWithCounts())
      repository.findFirstSelect.mockResolvedValue({ id: 'other-agent' })

      try {
        await service.updateAgent(AGENT_ID, { name: 'Taken Name' }, buildMockUser() as never)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(409)
      }
    })

    it('should not check for duplicate name when name is not being updated', async () => {
      repository.findFirstWithDetails.mockResolvedValue(buildMockAgentWithCounts())
      repository.updateWithDetails.mockResolvedValue(buildMockAgentWithCounts({ model: 'gpt-4' }))

      await service.updateAgent(AGENT_ID, { model: 'gpt-4' }, buildMockUser() as never)

      expect(repository.findFirstSelect).not.toHaveBeenCalled()
    })

    it('should only include provided fields in update data', async () => {
      repository.findFirstWithDetails.mockResolvedValue(buildMockAgentWithCounts())
      repository.updateWithDetails.mockResolvedValue(buildMockAgentWithCounts())

      await service.updateAgent(AGENT_ID, { model: 'gpt-4' }, buildMockUser() as never)

      const updateCall = repository.updateWithDetails.mock.calls[0][0]
      expect(updateCall.data).toEqual({ model: 'gpt-4' })
    })
  })

  // ---------------------------------------------------------------------------
  // deleteAgent
  // ---------------------------------------------------------------------------
  describe('deleteAgent', () => {
    it('should delete agent and return { deleted: true }', async () => {
      repository.findFirstWithDetails.mockResolvedValue(buildMockAgentWithCounts())
      repository.deleteMany.mockResolvedValue({ count: 1 })

      const result = await service.deleteAgent(AGENT_ID, TENANT_ID, USER_EMAIL)

      expect(result).toEqual({ deleted: true })
      expect(repository.deleteMany).toHaveBeenCalledWith({ id: AGENT_ID, tenantId: TENANT_ID })
    })

    it('should throw BusinessException 404 when agent does not exist', async () => {
      repository.findFirstWithDetails.mockResolvedValue(null)

      try {
        await service.deleteAgent('nonexistent', TENANT_ID, USER_EMAIL)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })

    it('should log info on successful deletion', async () => {
      repository.findFirstWithDetails.mockResolvedValue(buildMockAgentWithCounts())
      repository.deleteMany.mockResolvedValue({ count: 1 })

      await service.deleteAgent(AGENT_ID, TENANT_ID, USER_EMAIL)

      expect(mockAppLogger.info).toHaveBeenCalledWith(
        'AiAgentsService => deleteAgent completed',
        expect.objectContaining({
          action: 'deleteAgent',
          outcome: 'success',
          tenantId: TENANT_ID,
          metadata: expect.objectContaining({ actorEmail: USER_EMAIL, agentId: AGENT_ID }),
        })
      )
    })
  })

  // ---------------------------------------------------------------------------
  // updateSoul
  // ---------------------------------------------------------------------------
  describe('updateSoul', () => {
    it('should update soulMd and return updated agent', async () => {
      repository.findFirstWithDetails.mockResolvedValue(buildMockAgentWithCounts())
      const updatedAgent = buildMockAgentWithCounts({
        soulMd: '# Updated Soul\nNew instructions.',
      })
      repository.updateWithDetails.mockResolvedValue(updatedAgent)

      const result = await service.updateSoul(
        AGENT_ID,
        { soulMd: '# Updated Soul\nNew instructions.' },
        buildMockUser() as never
      )

      expect(result.soulMd).toBe('# Updated Soul\nNew instructions.')
      expect(repository.updateWithDetails).toHaveBeenCalledWith({
        where: { id: AGENT_ID, tenantId: TENANT_ID },
        data: { soulMd: '# Updated Soul\nNew instructions.' },
      })
    })

    it('should throw BusinessException 404 when agent does not exist', async () => {
      repository.findFirstWithDetails.mockResolvedValue(null)

      try {
        await service.updateSoul('nonexistent', { soulMd: 'test' }, buildMockUser() as never)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })

    it('should log info on successful soul update', async () => {
      repository.findFirstWithDetails.mockResolvedValue(buildMockAgentWithCounts())
      repository.updateWithDetails.mockResolvedValue(buildMockAgentWithCounts())

      await service.updateSoul(AGENT_ID, { soulMd: 'test' }, buildMockUser() as never)

      expect(mockAppLogger.info).toHaveBeenCalledWith(
        'AiAgentsService => updateSoul completed',
        expect.objectContaining({
          action: 'updateSoul',
          outcome: 'success',
          metadata: expect.objectContaining({ agentId: AGENT_ID }),
        })
      )
    })
  })

  // ---------------------------------------------------------------------------
  // getAgentSessions
  // ---------------------------------------------------------------------------
  describe('getAgentSessions', () => {
    it('should return paginated sessions', async () => {
      repository.findFirstWithDetails.mockResolvedValue(buildMockAgentWithCounts())
      const sessions = [buildMockSession(), buildMockSession({ id: 'session-002' })]
      repository.findManySessions.mockResolvedValue(sessions)
      repository.countSessions.mockResolvedValue(2)

      const result = await service.getAgentSessions(AGENT_ID, TENANT_ID, 1, 20)

      expect(result.data).toHaveLength(2)
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      })
    })

    it('should throw BusinessException 404 when agent does not exist', async () => {
      repository.findFirstWithDetails.mockResolvedValue(null)

      try {
        await service.getAgentSessions('nonexistent', TENANT_ID, 1, 20)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })

    it('should apply correct pagination skip and take', async () => {
      repository.findFirstWithDetails.mockResolvedValue(buildMockAgentWithCounts())
      repository.findManySessions.mockResolvedValue([])
      repository.countSessions.mockResolvedValue(50)

      await service.getAgentSessions(AGENT_ID, TENANT_ID, 3, 10)

      expect(repository.findManySessions).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 })
      )
    })

    it('should order sessions by startedAt desc', async () => {
      repository.findFirstWithDetails.mockResolvedValue(buildMockAgentWithCounts())
      repository.findManySessions.mockResolvedValue([])
      repository.countSessions.mockResolvedValue(0)

      await service.getAgentSessions(AGENT_ID, TENANT_ID, 1, 20)

      expect(repository.findManySessions).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { startedAt: 'desc' } })
      )
    })

    it('should handle empty sessions', async () => {
      repository.findFirstWithDetails.mockResolvedValue(buildMockAgentWithCounts())
      repository.findManySessions.mockResolvedValue([])
      repository.countSessions.mockResolvedValue(0)

      const result = await service.getAgentSessions(AGENT_ID, TENANT_ID, 1, 20)

      expect(result.data).toHaveLength(0)
      expect(result.pagination.total).toBe(0)
    })
  })

  // ---------------------------------------------------------------------------
  // getAgentStats
  // ---------------------------------------------------------------------------
  describe('getAgentStats', () => {
    it('should return aggregated stats', async () => {
      repository.count
        .mockResolvedValueOnce(5) // totalAgents
        .mockResolvedValueOnce(3) // onlineAgents
      repository.countSessions.mockResolvedValue(150)
      repository.aggregate.mockResolvedValue({
        _sum: { totalTokens: BigInt(500000), totalCost: 12.5 },
      })

      const result = await service.getAgentStats(TENANT_ID)

      expect(result).toEqual({
        totalAgents: 5,
        onlineAgents: 3,
        totalSessions: 150,
        totalTokens: '500000',
        totalCost: 12.5,
      })
    })

    it('should filter totalAgents by tenantId', async () => {
      repository.count.mockResolvedValue(0)
      repository.countSessions.mockResolvedValue(0)
      repository.aggregate.mockResolvedValue({ _sum: {} })

      await service.getAgentStats(TENANT_ID)

      expect(repository.count).toHaveBeenCalledWith({ tenantId: TENANT_ID })
    })

    it('should filter onlineAgents by tenantId and status online', async () => {
      repository.count.mockResolvedValue(0)
      repository.countSessions.mockResolvedValue(0)
      repository.aggregate.mockResolvedValue({ _sum: {} })

      await service.getAgentStats(TENANT_ID)

      expect(repository.count).toHaveBeenCalledWith({
        tenantId: TENANT_ID,
        status: 'online',
      })
    })

    it('should handle null aggregation sums', async () => {
      repository.count.mockResolvedValue(0)
      repository.countSessions.mockResolvedValue(0)
      repository.aggregate.mockResolvedValue({ _sum: { totalTokens: null, totalCost: null } })

      const result = await service.getAgentStats(TENANT_ID)

      expect(result.totalTokens).toBe('0')
      expect(result.totalCost).toBe(0)
    })

    it('should handle empty _sum object', async () => {
      repository.count.mockResolvedValue(0)
      repository.countSessions.mockResolvedValue(0)
      repository.aggregate.mockResolvedValue({ _sum: {} })

      const result = await service.getAgentStats(TENANT_ID)

      expect(result.totalTokens).toBe('0')
      expect(result.totalCost).toBe(0)
    })
  })

  // ---------------------------------------------------------------------------
  // stopAgent
  // ---------------------------------------------------------------------------
  describe('stopAgent', () => {
    it('should set status to offline and return updated agent', async () => {
      repository.findFirstWithDetails.mockResolvedValue(
        buildMockAgentWithCounts({ status: 'online' })
      )
      const stoppedAgent = buildMockAgentWithCounts({ status: 'offline' })
      repository.updateWithDetails.mockResolvedValue(stoppedAgent)

      const result = await service.stopAgent(AGENT_ID, TENANT_ID, USER_EMAIL)

      expect(result.status).toBe('offline')
      expect(repository.updateWithDetails).toHaveBeenCalledWith({
        where: { id: AGENT_ID, tenantId: TENANT_ID },
        data: { status: 'offline' },
      })
    })

    it('should throw BusinessException 400 when agent is already offline', async () => {
      repository.findFirstWithDetails.mockResolvedValue(
        buildMockAgentWithCounts({ status: 'offline' })
      )

      try {
        await service.stopAgent(AGENT_ID, TENANT_ID, USER_EMAIL)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(400)
      }

      expect(repository.updateWithDetails).not.toHaveBeenCalled()
    })

    it('should throw BusinessException 404 when agent does not exist', async () => {
      repository.findFirstWithDetails.mockResolvedValue(null)

      try {
        await service.stopAgent('nonexistent', TENANT_ID, USER_EMAIL)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })

    it('should allow stopping agent in degraded status', async () => {
      repository.findFirstWithDetails.mockResolvedValue(
        buildMockAgentWithCounts({ status: 'degraded' })
      )
      repository.updateWithDetails.mockResolvedValue(
        buildMockAgentWithCounts({ status: 'offline' })
      )

      const result = await service.stopAgent(AGENT_ID, TENANT_ID, USER_EMAIL)

      expect(result.status).toBe('offline')
    })

    it('should allow stopping agent in maintenance status', async () => {
      repository.findFirstWithDetails.mockResolvedValue(
        buildMockAgentWithCounts({ status: 'maintenance' })
      )
      repository.updateWithDetails.mockResolvedValue(
        buildMockAgentWithCounts({ status: 'offline' })
      )

      const result = await service.stopAgent(AGENT_ID, TENANT_ID, USER_EMAIL)

      expect(result.status).toBe('offline')
    })

    it('should log info on successful stop', async () => {
      repository.findFirstWithDetails.mockResolvedValue(
        buildMockAgentWithCounts({ status: 'online' })
      )
      repository.updateWithDetails.mockResolvedValue(
        buildMockAgentWithCounts({ status: 'offline' })
      )

      await service.stopAgent(AGENT_ID, TENANT_ID, USER_EMAIL)

      expect(mockAppLogger.info).toHaveBeenCalledWith(
        'AiAgentsService => stopAgent completed',
        expect.objectContaining({
          action: 'stopAgent',
          outcome: 'success',
          tenantId: TENANT_ID,
          metadata: expect.objectContaining({ actorEmail: USER_EMAIL, previousStatus: 'online' }),
        })
      )
    })
  })

  describe('runAgent', () => {
    it('queues an execution job and creates a running session', async () => {
      repository.findFirstWithDetails.mockResolvedValue(
        buildMockAgentWithCounts({ status: 'online' })
      )
      repository.createSession.mockResolvedValue({ id: 'session-123' })
      jobService.enqueue.mockResolvedValue({ id: 'job-123' })

      const result = await service.runAgent(
        AGENT_ID,
        { prompt: 'Summarize the latest critical alerts' },
        buildMockUser()
      )

      expect(repository.createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: AGENT_ID,
          input: 'Summarize the latest critical alerts',
          status: 'running',
        })
      )
      expect(jobService.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT_ID,
          type: 'ai_agent_task',
          createdBy: USER_EMAIL,
        })
      )
      expect(result).toEqual({
        queued: true,
        jobId: 'job-123',
        sessionId: 'session-123',
      })
    })

    it('blocks execution for offline agents', async () => {
      repository.findFirstWithDetails.mockResolvedValue(
        buildMockAgentWithCounts({ status: 'offline' })
      )

      await expect(
        service.runAgent(AGENT_ID, { prompt: 'Help me investigate this case' }, buildMockUser())
      ).rejects.toBeInstanceOf(BusinessException)

      expect(repository.createSession).not.toHaveBeenCalled()
      expect(jobService.enqueue).not.toHaveBeenCalled()
    })
  })
})
