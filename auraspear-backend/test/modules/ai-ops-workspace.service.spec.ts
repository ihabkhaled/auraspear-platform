import { AiOpsWorkspaceService } from '../../src/modules/ai/ai-ops-workspace.service'

function createMockPrisma() {
  return {
    $queryRaw: jest.fn(),
    aiAgentSession: { count: jest.fn() },
    aiApprovalRequest: { count: jest.fn() },
    aiExecutionFinding: { findMany: jest.fn() },
    aiJobRunSummary: { findMany: jest.fn() },
  }
}

describe('AiOpsWorkspaceService', () => {
  let service: AiOpsWorkspaceService
  let prisma: ReturnType<typeof createMockPrisma>

  const TENANT_ID = 'tenant-001'

  beforeEach(() => {
    jest.clearAllMocks()
    prisma = createMockPrisma()
    service = new AiOpsWorkspaceService(prisma as never)
  })

  describe('getWorkspace', () => {
    it('should return aggregated workspace with all sections', async () => {
      // Agent stats
      prisma.$queryRaw
        .mockResolvedValueOnce([{ total: BigInt(10), online: BigInt(3) }]) // agents
        .mockResolvedValueOnce([{ total: BigInt(50), success: BigInt(45), failure: BigInt(5) }]) // job runs
        .mockResolvedValueOnce([{ total: BigInt(120), proposed: BigInt(30), applied: BigInt(60), dismissed: BigInt(25), high_confidence: BigInt(80) }]) // findings
        .mockResolvedValueOnce([{ total_threads: BigInt(15), total_messages: BigInt(200), legal_hold: BigInt(2) }]) // chat
        .mockResolvedValueOnce([{ total_tokens: BigInt(500000), estimated_cost: 15.5, requests: BigInt(100) }]) // usage
        .mockResolvedValueOnce([{ total: BigInt(300), actors: BigInt(8) }]) // audit

      prisma.aiAgentSession.count.mockResolvedValue(25)
      prisma.aiApprovalRequest.count.mockResolvedValue(3)
      prisma.aiExecutionFinding.findMany.mockResolvedValue([
        { id: 'f1', findingType: 'triage', title: 'Alert finding', status: 'proposed', agentId: 'agent-1', sourceModule: 'alerts', createdAt: new Date() },
      ])
      prisma.aiJobRunSummary.findMany.mockResolvedValue([
        { id: 'j1', jobKey: 'detection.rule_draft', status: 'completed', agentId: 'agent-2', sourceModule: 'detection', createdAt: new Date() },
      ])

      const result = await service.getWorkspace(TENANT_ID)

      expect(result.agents.total).toBe(10)
      expect(result.agents.online).toBe(3)
      expect(result.agents.totalSessions24h).toBe(25)
      expect(result.orchestration.dispatches24h).toBe(50)
      expect(result.orchestration.success24h).toBe(45)
      expect(result.orchestration.failures24h).toBe(5)
      expect(result.orchestration.pendingApprovals).toBe(3)
      expect(result.findings.total).toBe(120)
      expect(result.findings.proposed).toBe(30)
      expect(result.findings.applied).toBe(60)
      expect(result.findings.dismissed).toBe(25)
      expect(result.findings.highConfidence).toBe(80)
      expect(result.chat.totalThreads).toBe(15)
      expect(result.chat.totalMessages).toBe(200)
      expect(result.chat.legalHoldCount).toBe(2)
      expect(result.usage24h.totalTokens).toBe(500000)
      expect(result.usage24h.estimatedCost).toBe(15.5)
      expect(result.usage24h.requests).toBe(100)
      expect(result.audit.totalLogs24h).toBe(300)
      expect(result.audit.uniqueActors24h).toBe(8)
      expect(result.recentActivity).toHaveLength(2)
    })

    it('should handle empty data gracefully', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([]) // agents empty
        .mockResolvedValueOnce([]) // job runs empty
        .mockResolvedValueOnce([]) // findings empty
        .mockResolvedValueOnce([]) // chat empty
        .mockResolvedValueOnce([]) // usage empty
        .mockResolvedValueOnce([]) // audit empty

      prisma.aiAgentSession.count.mockResolvedValue(0)
      prisma.aiApprovalRequest.count.mockResolvedValue(0)
      prisma.aiExecutionFinding.findMany.mockResolvedValue([])
      prisma.aiJobRunSummary.findMany.mockResolvedValue([])

      const result = await service.getWorkspace(TENANT_ID)

      expect(result.agents.total).toBe(0)
      expect(result.agents.online).toBe(0)
      expect(result.orchestration.dispatches24h).toBe(0)
      expect(result.findings.total).toBe(0)
      expect(result.chat.totalThreads).toBe(0)
      expect(result.usage24h.totalTokens).toBe(0)
      expect(result.audit.totalLogs24h).toBe(0)
      expect(result.recentActivity).toHaveLength(0)
    })

    it('should sort recent activity by createdAt descending and limit to 15', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([{ total: BigInt(0), online: BigInt(0) }])
        .mockResolvedValueOnce([{ total: BigInt(0), success: BigInt(0), failure: BigInt(0) }])
        .mockResolvedValueOnce([{ total: BigInt(0), proposed: BigInt(0), applied: BigInt(0), dismissed: BigInt(0), high_confidence: BigInt(0) }])
        .mockResolvedValueOnce([{ total_threads: BigInt(0), total_messages: BigInt(0), legal_hold: BigInt(0) }])
        .mockResolvedValueOnce([{ total_tokens: BigInt(0), estimated_cost: 0, requests: BigInt(0) }])
        .mockResolvedValueOnce([{ total: BigInt(0), actors: BigInt(0) }])

      prisma.aiAgentSession.count.mockResolvedValue(0)
      prisma.aiApprovalRequest.count.mockResolvedValue(0)

      // 10 findings + 10 jobs = 20 total, should be limited to 15
      const findings = Array.from({ length: 10 }, (_, i) => ({
        id: `f${String(i)}`, findingType: 'triage', title: `Finding ${String(i)}`,
        status: 'proposed', agentId: null, sourceModule: null,
        createdAt: new Date(Date.now() - i * 60000),
      }))
      const jobs = Array.from({ length: 10 }, (_, i) => ({
        id: `j${String(i)}`, jobKey: `job.${String(i)}`, status: 'completed',
        agentId: null, sourceModule: null,
        createdAt: new Date(Date.now() - (i + 5) * 60000),
      }))

      prisma.aiExecutionFinding.findMany.mockResolvedValue(findings)
      prisma.aiJobRunSummary.findMany.mockResolvedValue(jobs)

      const result = await service.getWorkspace(TENANT_ID)

      expect(result.recentActivity).toHaveLength(15)
      // Verify sorted by createdAt desc
      for (let i = 1; i < result.recentActivity.length; i++) {
        const prev = new Date(result.recentActivity[i - 1]!.createdAt).getTime()
        const curr = new Date(result.recentActivity[i]!.createdAt).getTime()
        expect(prev).toBeGreaterThanOrEqual(curr)
      }
    })
  })
})
