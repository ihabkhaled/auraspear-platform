import { AiOpsWorkspaceService } from '../../src/modules/ai/ai-ops-workspace.service'
import type { AiOpsWorkspaceRepository } from '../../src/modules/ai/ai-ops-workspace.repository'

function createMockRepository(): jest.Mocked<AiOpsWorkspaceRepository> {
  return {
    fetchWorkspaceData: jest.fn(),
  } as unknown as jest.Mocked<AiOpsWorkspaceRepository>
}

describe('AiOpsWorkspaceService', () => {
  let service: AiOpsWorkspaceService
  let repository: jest.Mocked<AiOpsWorkspaceRepository>

  const TENANT_ID = 'tenant-001'

  beforeEach(() => {
    jest.clearAllMocks()
    repository = createMockRepository()
    service = new AiOpsWorkspaceService(repository)
  })

  describe('getWorkspace', () => {
    it('should return aggregated workspace with all sections', async () => {
      const findingCreatedAt = new Date()
      const jobCreatedAt = new Date()

      repository.fetchWorkspaceData.mockResolvedValue({
        agentStats: [{ total: BigInt(10), online: BigInt(3) }],
        sessions24h: 25,
        jobRuns24h: [{ total: BigInt(50), success: BigInt(45), failure: BigInt(5) }],
        approvalsPending: 3,
        findingsStats: [
          {
            total: BigInt(120),
            proposed: BigInt(30),
            applied: BigInt(60),
            dismissed: BigInt(25),
            high_confidence: BigInt(80),
          },
        ],
        chatStats: [
          { total_threads: BigInt(15), total_messages: BigInt(200), legal_hold: BigInt(2) },
        ],
        usageStats: [{ total_tokens: BigInt(500000), estimated_cost: 15.5, requests: BigInt(100) }],
        auditStats: [{ total: BigInt(300), actors: BigInt(8) }],
        recentFindings: [
          {
            id: 'f1',
            findingType: 'triage',
            title: 'Alert finding',
            status: 'proposed',
            agentId: 'agent-1',
            sourceModule: 'alerts',
            createdAt: findingCreatedAt,
          },
        ],
        recentJobs: [
          {
            id: 'j1',
            jobKey: 'detection.rule_draft',
            status: 'completed',
            agentId: 'agent-2',
            sourceModule: 'detection',
            createdAt: jobCreatedAt,
          },
        ],
      })

      const result = await service.getWorkspace(TENANT_ID)

      expect(repository.fetchWorkspaceData).toHaveBeenCalledWith(TENANT_ID, expect.any(Date))
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
      repository.fetchWorkspaceData.mockResolvedValue({
        agentStats: [],
        sessions24h: 0,
        jobRuns24h: [],
        approvalsPending: 0,
        findingsStats: [],
        chatStats: [],
        usageStats: [],
        auditStats: [],
        recentFindings: [],
        recentJobs: [],
      })

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
      const findings = Array.from({ length: 10 }, (_, index) => ({
        id: `f${String(index)}`,
        findingType: 'triage',
        title: `Finding ${String(index)}`,
        status: 'proposed',
        agentId: null,
        sourceModule: null,
        createdAt: new Date(Date.now() - index * 60000),
      }))
      const jobs = Array.from({ length: 10 }, (_, index) => ({
        id: `j${String(index)}`,
        jobKey: `job.${String(index)}`,
        status: 'completed',
        agentId: null,
        sourceModule: null,
        createdAt: new Date(Date.now() - (index + 5) * 60000),
      }))

      repository.fetchWorkspaceData.mockResolvedValue({
        agentStats: [{ total: BigInt(0), online: BigInt(0) }],
        sessions24h: 0,
        jobRuns24h: [{ total: BigInt(0), success: BigInt(0), failure: BigInt(0) }],
        approvalsPending: 0,
        findingsStats: [
          {
            total: BigInt(0),
            proposed: BigInt(0),
            applied: BigInt(0),
            dismissed: BigInt(0),
            high_confidence: BigInt(0),
          },
        ],
        chatStats: [{ total_threads: BigInt(0), total_messages: BigInt(0), legal_hold: BigInt(0) }],
        usageStats: [{ total_tokens: BigInt(0), estimated_cost: 0, requests: BigInt(0) }],
        auditStats: [{ total: BigInt(0), actors: BigInt(0) }],
        recentFindings: findings,
        recentJobs: jobs,
      })

      const result = await service.getWorkspace(TENANT_ID)

      expect(result.recentActivity).toHaveLength(15)
      // Verify sorted by createdAt desc
      for (let index = 1; index < result.recentActivity.length; index++) {
        const previous = new Date(result.recentActivity[index - 1]!.createdAt).getTime()
        const current = new Date(result.recentActivity[index]!.createdAt).getTime()
        expect(previous).toBeGreaterThanOrEqual(current)
      }
    })
  })
})
