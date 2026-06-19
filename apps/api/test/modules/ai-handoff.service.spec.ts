import { AiHandoffService } from '../../src/modules/ai/writeback/ai-handoff.service'

function createMockPrisma() {
  const mockCase = { findFirst: jest.fn(), create: jest.fn() }
  const mockIncident = { findFirst: jest.fn(), create: jest.fn() }

  return {
    $queryRaw: jest.fn(),
    $transaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) =>
      fn({ case: mockCase, incident: mockIncident })
    ),
    aiExecutionFinding: { findFirst: jest.fn(), update: jest.fn() },
    aiFindingOutputLink: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    case: mockCase,
    incident: mockIncident,
  }
}

const TENANT_ID = 'tenant-001'
const FINDING_ID = 'finding-001'
const USER_ID = 'user-001'
const USER_EMAIL = 'test@example.com'

function buildFinding(overrides: Record<string, unknown> = {}) {
  return {
    id: FINDING_ID,
    tenantId: TENANT_ID,
    title: 'Test Finding',
    summary: 'Test summary',
    severity: 'high',
    status: 'proposed',
    ...overrides,
  }
}

describe('AiHandoffService', () => {
  let service: AiHandoffService
  let prisma: ReturnType<typeof createMockPrisma>

  beforeEach(() => {
    jest.clearAllMocks()
    prisma = createMockPrisma()
    service = new AiHandoffService(prisma as never)
  })

  describe('promote', () => {
    it('should create a case from a proposed finding', async () => {
      prisma.aiExecutionFinding.findFirst.mockResolvedValue(buildFinding())
      prisma.case.findFirst.mockResolvedValue(null)
      prisma.case.create.mockResolvedValue({ id: 'case-001', caseNumber: 'SOC-2026-001' })
      prisma.aiFindingOutputLink.create.mockResolvedValue({ id: 'link-001', findingId: FINDING_ID, linkedModule: 'case', linkedEntityId: 'case-001' })
      prisma.aiExecutionFinding.update.mockResolvedValue({ ...buildFinding(), status: 'applied' })

      const result = await service.promote({
        tenantId: TENANT_ID,
        findingId: FINDING_ID,
        targetModule: 'case',
        actorUserId: USER_ID,
        actorEmail: USER_EMAIL,
      })

      expect(result.createdEntityId).toBe('case-001')
      expect(result.targetModule).toBe('case')
      expect(prisma.case.create).toHaveBeenCalledTimes(1)
      expect(prisma.aiFindingOutputLink.create).toHaveBeenCalledTimes(1)
      expect(prisma.aiExecutionFinding.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: FINDING_ID }, data: expect.objectContaining({ status: 'applied' }) })
      )
    })

    it('should create an incident from a proposed finding', async () => {
      prisma.aiExecutionFinding.findFirst.mockResolvedValue(buildFinding())
      prisma.incident.findFirst.mockResolvedValue(null)
      prisma.incident.create.mockResolvedValue({ id: 'inc-001', incidentNumber: 'INC-2026-001' })
      prisma.aiFindingOutputLink.create.mockResolvedValue({ id: 'link-002', findingId: FINDING_ID, linkedModule: 'incident', linkedEntityId: 'inc-001' })
      prisma.aiExecutionFinding.update.mockResolvedValue({ ...buildFinding(), status: 'applied' })

      const result = await service.promote({
        tenantId: TENANT_ID,
        findingId: FINDING_ID,
        targetModule: 'incident',
        actorUserId: USER_ID,
        actorEmail: USER_EMAIL,
      })

      expect(result.createdEntityId).toBe('inc-001')
      expect(result.targetModule).toBe('incident')
      expect(prisma.incident.create).toHaveBeenCalledTimes(1)
    })

    it('should throw when finding not found', async () => {
      prisma.aiExecutionFinding.findFirst.mockResolvedValue(null)

      await expect(
        service.promote({ tenantId: TENANT_ID, findingId: 'nonexistent', targetModule: 'case', actorUserId: USER_ID, actorEmail: USER_EMAIL })
      ).rejects.toThrow('Finding not found')
    })

    it('should throw when finding status is not proposed', async () => {
      prisma.aiExecutionFinding.findFirst.mockResolvedValue(buildFinding({ status: 'applied' }))

      await expect(
        service.promote({ tenantId: TENANT_ID, findingId: FINDING_ID, targetModule: 'case', actorUserId: USER_ID, actorEmail: USER_EMAIL })
      ).rejects.toThrow('Only proposed findings can be promoted')
    })

    it('should throw for unsupported target module', async () => {
      prisma.aiExecutionFinding.findFirst.mockResolvedValue(buildFinding())

      await expect(
        service.promote({ tenantId: TENANT_ID, findingId: FINDING_ID, targetModule: 'unknown', actorUserId: USER_ID, actorEmail: USER_EMAIL })
      ).rejects.toThrow('Unsupported target module')
    })
  })

  describe('getHistory', () => {
    it('should return paginated history', async () => {
      const links = [{ id: 'l-1', findingId: 'f-1', linkedModule: 'case', linkedEntityType: 'Case', linkedEntityId: 'c-1', createdAt: new Date(), finding: { title: 'Test', findingType: 'triage', severity: 'high', agentId: 'agent-1', sourceModule: 'alerts' } }]
      prisma.aiFindingOutputLink.findMany.mockResolvedValue(links)
      prisma.aiFindingOutputLink.count.mockResolvedValue(1)

      const result = await service.getHistory(TENANT_ID, { limit: 10, offset: 0 })

      expect(result.data).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.data[0]!.findingTitle).toBe('Test')
    })
  })

  describe('getStats', () => {
    it('should return aggregated stats', async () => {
      prisma.aiFindingOutputLink.count
        .mockResolvedValueOnce(10) // totalPromotions
        .mockResolvedValueOnce(3) // last24h
      prisma.$queryRaw
        .mockResolvedValueOnce([{ linked_module: 'case', count: BigInt(7) }, { linked_module: 'incident', count: BigInt(3) }]) // byTarget
        .mockResolvedValueOnce([{ agent_id: 'agent-1', count: BigInt(5) }]) // byAgent

      const result = await service.getStats(TENANT_ID)

      expect(result.totalPromotions).toBe(10)
      expect(result.last24h).toBe(3)
      expect(result.byTarget).toHaveLength(2)
      expect(result.byAgent).toHaveLength(1)
    })
  })

  describe('getFindingLinks', () => {
    it('should return links for a finding', async () => {
      const links = [{ id: 'l-1', findingId: FINDING_ID, linkedModule: 'case' }]
      prisma.aiFindingOutputLink.findMany.mockResolvedValue(links)

      const result = await service.getFindingLinks(TENANT_ID, FINDING_ID)

      expect(result).toHaveLength(1)
      expect(prisma.aiFindingOutputLink.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: TENANT_ID, findingId: FINDING_ID } })
      )
    })
  })
})
