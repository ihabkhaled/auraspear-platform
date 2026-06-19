jest.mock('@prisma/client', () => ({
  PrismaClient: class PrismaClient {},
}))

import { AiFeatureKey } from '../../../../common/enums'
import { toDay } from '../../../../common/utils/date-time.utility'
import { UsageBudgetService } from '../usage-budget.service'
import type { RecordUsageInput } from '../usage-budget.types'

const mockAppLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}

function createMockRepository() {
  return {
    insertUsage: jest.fn(),
    getUsageSummary: jest.fn(),
    getMonthlyUsage: jest.fn(),
    getMonthlyTokenCount: jest.fn(),
  }
}

function createMockFeatureCatalogService() {
  return {
    getConfig: jest.fn(),
  }
}

function createService(
  repository: ReturnType<typeof createMockRepository>,
  featureCatalog: ReturnType<typeof createMockFeatureCatalogService>
) {
  return new UsageBudgetService(
    repository as never,
    featureCatalog as never,
    mockAppLogger as never
  )
}

describe('UsageBudgetService', () => {
  let repo: ReturnType<typeof createMockRepository>
  let featureCatalog: ReturnType<typeof createMockFeatureCatalogService>
  let service: UsageBudgetService

  beforeEach(() => {
    jest.clearAllMocks()
    repo = createMockRepository()
    featureCatalog = createMockFeatureCatalogService()
    service = createService(repo, featureCatalog)
  })

  /* ------------------------------------------------------------------ */
  /* recordUsage                                                          */
  /* ------------------------------------------------------------------ */

  describe('recordUsage', () => {
    it('should insert usage record to DB', async () => {
      repo.insertUsage.mockResolvedValue(undefined)

      const input: RecordUsageInput = {
        tenantId: 'tenant-1',
        featureKey: AiFeatureKey.ALERT_SUMMARIZE,
        provider: 'bedrock',
        model: 'claude-3-sonnet',
        inputTokens: 500,
        outputTokens: 200,
        estimatedCost: 0.01,
        userId: 'user-1',
      }

      await service.recordUsage(input)

      expect(repo.insertUsage).toHaveBeenCalledWith(input)
      expect(mockAppLogger.debug).toHaveBeenCalledWith(
        'AI usage recorded',
        expect.objectContaining({
          tenantId: 'tenant-1',
          metadata: expect.objectContaining({
            featureKey: AiFeatureKey.ALERT_SUMMARIZE,
            provider: 'bedrock',
          }),
        })
      )
    })
  })

  /* ------------------------------------------------------------------ */
  /* checkBudget                                                          */
  /* ------------------------------------------------------------------ */

  describe('checkBudget', () => {
    it('should return allowed when no budget is set (null)', async () => {
      featureCatalog.getConfig.mockResolvedValue({
        enabled: true,
        monthlyTokenBudget: null,
      })

      const result = await service.checkBudget('tenant-1', AiFeatureKey.ALERT_SUMMARIZE)

      expect(result.allowed).toBe(true)
      expect(result.used).toBe(0)
      expect(result.budget).toBeNull()
    })

    it('should return allowed when usage is under budget', async () => {
      featureCatalog.getConfig.mockResolvedValue({
        enabled: true,
        monthlyTokenBudget: 100000,
      })
      repo.getMonthlyTokenCount.mockResolvedValue(50000)

      const result = await service.checkBudget('tenant-1', AiFeatureKey.ALERT_SUMMARIZE)

      expect(result.allowed).toBe(true)
      expect(result.used).toBe(50000)
      expect(result.budget).toBe(100000)
    })

    it('should return not allowed when usage exceeds budget', async () => {
      featureCatalog.getConfig.mockResolvedValue({
        enabled: true,
        monthlyTokenBudget: 100000,
      })
      repo.getMonthlyTokenCount.mockResolvedValue(150000)

      const result = await service.checkBudget('tenant-1', AiFeatureKey.ALERT_SUMMARIZE)

      expect(result.allowed).toBe(false)
      expect(result.used).toBe(150000)
      expect(result.budget).toBe(100000)
    })

    it('should return not allowed when usage exactly equals budget', async () => {
      featureCatalog.getConfig.mockResolvedValue({
        enabled: true,
        monthlyTokenBudget: 100000,
      })
      repo.getMonthlyTokenCount.mockResolvedValue(100000)

      const result = await service.checkBudget('tenant-1', AiFeatureKey.ALERT_SUMMARIZE)

      expect(result.allowed).toBe(false)
      expect(result.used).toBe(100000)
    })

    it('should query monthly token count with correct date range', async () => {
      featureCatalog.getConfig.mockResolvedValue({
        enabled: true,
        monthlyTokenBudget: 100000,
      })
      repo.getMonthlyTokenCount.mockResolvedValue(0)

      await service.checkBudget('tenant-1', AiFeatureKey.ALERT_SUMMARIZE)

      expect(repo.getMonthlyTokenCount).toHaveBeenCalledWith(
        'tenant-1',
        AiFeatureKey.ALERT_SUMMARIZE,
        expect.any(Date), // monthStart
        expect.any(Date) // monthEnd
      )
    })
  })

  /* ------------------------------------------------------------------ */
  /* getMonthlyUsage                                                      */
  /* ------------------------------------------------------------------ */

  describe('getMonthlyUsage', () => {
    it('should return aggregated monthly data when records exist', async () => {
      repo.getMonthlyUsage.mockResolvedValue([
        {
          total_input: '5000',
          total_output: '3000',
          total_cost: '0.50',
          request_count: '25',
        },
      ])

      const result = await service.getMonthlyUsage('tenant-1')

      expect(result.tenantId).toBe('tenant-1')
      expect(result.inputTokens).toBe(5000)
      expect(result.outputTokens).toBe(3000)
      expect(result.totalTokens).toBe(8000)
      expect(result.estimatedCost).toBe(0.5)
      expect(result.requestCount).toBe(25)
      expect(result.month).toMatch(/^\d{4}-\d{2}$/)
    })

    it('should return zeros when no records exist', async () => {
      repo.getMonthlyUsage.mockResolvedValue([])

      const result = await service.getMonthlyUsage('tenant-1')

      expect(result.inputTokens).toBe(0)
      expect(result.outputTokens).toBe(0)
      expect(result.totalTokens).toBe(0)
      expect(result.estimatedCost).toBe(0)
      expect(result.requestCount).toBe(0)
    })
  })

  /* ------------------------------------------------------------------ */
  /* getUsageSummary                                                      */
  /* ------------------------------------------------------------------ */

  describe('getUsageSummary', () => {
    it('should aggregate multiple rows into a summary', async () => {
      repo.getUsageSummary.mockResolvedValue([
        {
          feature_key: AiFeatureKey.ALERT_SUMMARIZE,
          provider: 'bedrock',
          total_input: '1000',
          total_output: '500',
          total_cost: '0.10',
          request_count: '5',
        },
        {
          feature_key: AiFeatureKey.CASE_SUMMARIZE,
          provider: 'llm_apis',
          total_input: '2000',
          total_output: '1000',
          total_cost: '0.20',
          request_count: '10',
        },
      ])

      const startDate = toDay('2026-03-01T00:00:00.000Z').toDate()
      const endDate = toDay('2026-03-31T00:00:00.000Z').toDate()

      const result = await service.getUsageSummary('tenant-1', startDate, endDate)

      expect(result.entries).toHaveLength(2)
      expect(result.totals.inputTokens).toBe(3000)
      expect(result.totals.outputTokens).toBe(1500)
      expect(result.totals.cost).toBeCloseTo(0.3)
      expect(result.totals.requests).toBe(15)
    })
  })
})
