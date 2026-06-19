import { UsageBudgetService } from '../../src/modules/ai/usage-budget/usage-budget.service'
import type {
  BudgetAlertInput,
  BudgetAlertRecord,
  CostRateInput,
  CostRateRecord,
  RecordUsageInput,
} from '../../src/modules/ai/usage-budget/usage-budget.types'

/* ── Mock factories ─────────────────────────────────── */

function createMockRepository() {
  return {
    insertUsage: jest.fn(),
    getUsageSummary: jest.fn(),
    getMonthlyUsage: jest.fn(),
    getMonthlyTokenCount: jest.fn(),
    getUsageByUser: jest.fn(),
    getUsageByModel: jest.fn(),
    getDailyUsage: jest.fn(),
    listCostRates: jest.fn(),
    upsertCostRate: jest.fn(),
    deleteCostRate: jest.fn(),
    listBudgetAlerts: jest.fn(),
    upsertBudgetAlert: jest.fn(),
    updateBudgetAlert: jest.fn(),
    deleteBudgetAlert: jest.fn(),
    toggleBudgetAlert: jest.fn(),
  }
}

function createMockFeatureCatalogService() {
  return {
    getConfig: jest.fn(),
  }
}

function createMockAppLogger() {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}

function buildCostRateRecord(overrides: Partial<CostRateRecord> = {}): CostRateRecord {
  return {
    id: 'cr-001',
    tenantId: 'tenant-001',
    provider: 'bedrock',
    model: 'claude-3-sonnet',
    inputCostPer1k: 0.003,
    outputCostPer1k: 0.015,
    effectiveFrom: new Date('2025-01-01'),
    createdBy: 'user-001',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  }
}

function buildBudgetAlertRecord(overrides: Partial<BudgetAlertRecord> = {}): BudgetAlertRecord {
  return {
    id: 'ba-001',
    tenantId: 'tenant-001',
    scope: 'tenant',
    scopeKey: null,
    monthlyBudget: 500,
    alertThresholds: '50,80,100',
    lastAlertPct: 0,
    lastAlertAt: null,
    enabled: true,
    createdBy: 'user-001',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  }
}

function buildRecordUsageInput(overrides: Partial<RecordUsageInput> = {}): RecordUsageInput {
  return {
    tenantId: 'tenant-001',
    featureKey: 'alert_triage',
    provider: 'bedrock',
    model: 'claude-3-sonnet',
    inputTokens: 1000,
    outputTokens: 500,
    estimatedCost: 0.02,
    userId: 'user-001',
    ...overrides,
  }
}

/* ── Tests ───────────────────────────────────────────── */

describe('UsageBudgetService', () => {
  const TENANT_ID = 'tenant-001'

  let repository: ReturnType<typeof createMockRepository>
  let featureCatalog: ReturnType<typeof createMockFeatureCatalogService>
  let appLogger: ReturnType<typeof createMockAppLogger>
  let service: UsageBudgetService

  beforeEach(() => {
    repository = createMockRepository()
    featureCatalog = createMockFeatureCatalogService()
    appLogger = createMockAppLogger()
    service = new UsageBudgetService(
      repository as never,
      featureCatalog as never,
      appLogger as never,
    )
    jest.clearAllMocks()
  })

  /* ── recordUsage ──────────────────────────────────── */

  describe('recordUsage', () => {
    it('delegates to repository and logs debug message', async () => {
      const input = buildRecordUsageInput()
      repository.insertUsage.mockResolvedValue(undefined)

      await service.recordUsage(input)

      expect(repository.insertUsage).toHaveBeenCalledWith(input)
      expect(appLogger.debug).toHaveBeenCalledWith(
        'AI usage recorded',
        expect.objectContaining({
          tenantId: input.tenantId,
          metadata: expect.objectContaining({
            featureKey: input.featureKey,
            provider: input.provider,
          }),
        }),
      )
    })
  })

  /* ── checkBudget ──────────────────────────────────── */

  describe('checkBudget', () => {
    it('returns allowed:true when no budget configured (monthlyTokenBudget is null)', async () => {
      featureCatalog.getConfig.mockResolvedValue({ monthlyTokenBudget: null })

      const result = await service.checkBudget(TENANT_ID, 'alert_triage' as never)

      expect(result).toEqual({ allowed: true, used: 0, budget: null })
      expect(repository.getMonthlyTokenCount).not.toHaveBeenCalled()
    })

    it('returns allowed:true when usage is under budget', async () => {
      featureCatalog.getConfig.mockResolvedValue({ monthlyTokenBudget: 100000 })
      repository.getMonthlyTokenCount.mockResolvedValue(50000)

      const result = await service.checkBudget(TENANT_ID, 'alert_triage' as never)

      expect(result).toEqual({ allowed: true, used: 50000, budget: 100000 })
    })

    it('returns allowed:false when budget is exceeded', async () => {
      featureCatalog.getConfig.mockResolvedValue({ monthlyTokenBudget: 100000 })
      repository.getMonthlyTokenCount.mockResolvedValue(150000)

      const result = await service.checkBudget(TENANT_ID, 'alert_triage' as never)

      expect(result).toEqual({ allowed: false, used: 150000, budget: 100000 })
    })

    it('returns allowed:false when usage equals budget exactly', async () => {
      featureCatalog.getConfig.mockResolvedValue({ monthlyTokenBudget: 100000 })
      repository.getMonthlyTokenCount.mockResolvedValue(100000)

      const result = await service.checkBudget(TENANT_ID, 'alert_triage' as never)

      expect(result).toEqual({ allowed: false, used: 100000, budget: 100000 })
    })
  })

  /* ── getFinopsDashboard ───────────────────────────── */

  describe('getFinopsDashboard', () => {
    it('returns aggregated dashboard with correct totals and projections', async () => {
      const summaryRows = [
        {
          feature_key: 'alert_triage',
          provider: 'bedrock',
          total_input: BigInt(5000),
          total_output: BigInt(2000),
          total_cost: 1.5,
          request_count: BigInt(10),
        },
      ]
      const userRows = [
        {
          user_id: 'user-001',
          total_input: BigInt(5000),
          total_output: BigInt(2000),
          total_cost: 1.5,
          request_count: BigInt(10),
        },
      ]
      const modelRows = [
        {
          provider: 'bedrock',
          model: 'claude-3-sonnet',
          total_input: BigInt(5000),
          total_output: BigInt(2000),
          total_cost: 1.5,
          request_count: BigInt(10),
        },
      ]
      const dailyRows = [
        {
          day: new Date('2025-03-15'),
          total_input: BigInt(5000),
          total_output: BigInt(2000),
          total_cost: 1.5,
          request_count: BigInt(10),
        },
      ]
      const budgetAlerts = [buildBudgetAlertRecord({ scope: 'tenant', enabled: true, monthlyBudget: 100 })]

      repository.getUsageSummary.mockResolvedValue(summaryRows)
      repository.getUsageByUser.mockResolvedValue(userRows)
      repository.getUsageByModel.mockResolvedValue(modelRows)
      repository.getDailyUsage.mockResolvedValue(dailyRows)
      repository.listBudgetAlerts.mockResolvedValue(budgetAlerts)

      const result = await service.getFinopsDashboard(TENANT_ID)

      expect(result.tenantId).toBe(TENANT_ID)
      expect(result.totalCost).toBe(1.5)
      expect(result.totalTokens).toBe(7000)
      expect(result.totalRequests).toBe(10)
      expect(result.budgetTotal).toBe(100)
      expect(result.budgetUsedPct).toBe(2) // round((1.5/100)*100)
      expect(result.projectedMonthEnd).toBeGreaterThan(0)
      expect(result.byFeature).toHaveLength(1)
      expect(result.byUser).toHaveLength(1)
      expect(result.byModel).toHaveLength(1)
      expect(result.dailyTrend).toHaveLength(1)
    })

    it('returns null budgetTotal and budgetUsedPct when no tenant budget alert exists', async () => {
      repository.getUsageSummary.mockResolvedValue([])
      repository.getUsageByUser.mockResolvedValue([])
      repository.getUsageByModel.mockResolvedValue([])
      repository.getDailyUsage.mockResolvedValue([])
      repository.listBudgetAlerts.mockResolvedValue([])

      const result = await service.getFinopsDashboard(TENANT_ID)

      expect(result.budgetTotal).toBeNull()
      expect(result.budgetUsedPct).toBeNull()
    })
  })

  /* ── Cost rate management ─────────────────────────── */

  describe('listCostRates', () => {
    it('delegates to repository', async () => {
      const rates = [buildCostRateRecord()]
      repository.listCostRates.mockResolvedValue(rates)

      const result = await service.listCostRates(TENANT_ID)

      expect(result).toEqual(rates)
      expect(repository.listCostRates).toHaveBeenCalledWith(TENANT_ID)
    })
  })

  describe('upsertCostRate', () => {
    it('delegates to repository', async () => {
      const input: CostRateInput = {
        tenantId: TENANT_ID,
        provider: 'bedrock',
        model: 'claude-3-sonnet',
        inputCostPer1k: 0.003,
        outputCostPer1k: 0.015,
        createdBy: 'user-001',
      }
      const record = buildCostRateRecord()
      repository.upsertCostRate.mockResolvedValue(record)

      const result = await service.upsertCostRate(input)

      expect(result).toEqual(record)
      expect(repository.upsertCostRate).toHaveBeenCalledWith(input)
    })
  })

  describe('deleteCostRate', () => {
    it('delegates to repository', async () => {
      repository.deleteCostRate.mockResolvedValue(undefined)

      await service.deleteCostRate(TENANT_ID, 'cr-001')

      expect(repository.deleteCostRate).toHaveBeenCalledWith(TENANT_ID, 'cr-001')
    })
  })

  /* ── Budget alert management ──────────────────────── */

  describe('listBudgetAlerts', () => {
    it('delegates to repository', async () => {
      const alerts = [buildBudgetAlertRecord()]
      repository.listBudgetAlerts.mockResolvedValue(alerts)

      const result = await service.listBudgetAlerts(TENANT_ID)

      expect(result).toEqual(alerts)
      expect(repository.listBudgetAlerts).toHaveBeenCalledWith(TENANT_ID)
    })
  })

  describe('upsertBudgetAlert', () => {
    it('delegates to repository', async () => {
      const input: BudgetAlertInput = {
        tenantId: TENANT_ID,
        scope: 'tenant',
        scopeKey: null,
        monthlyBudget: 500,
        alertThresholds: '50,80,100',
        createdBy: 'user-001',
      }
      const record = buildBudgetAlertRecord()
      repository.upsertBudgetAlert.mockResolvedValue(record)

      const result = await service.upsertBudgetAlert(input)

      expect(result).toEqual(record)
      expect(repository.upsertBudgetAlert).toHaveBeenCalledWith(input)
    })
  })

  describe('deleteBudgetAlert', () => {
    it('delegates to repository', async () => {
      repository.deleteBudgetAlert.mockResolvedValue(undefined)

      await service.deleteBudgetAlert(TENANT_ID, 'ba-001')

      expect(repository.deleteBudgetAlert).toHaveBeenCalledWith(TENANT_ID, 'ba-001')
    })
  })

  describe('toggleBudgetAlert', () => {
    it('delegates to repository', async () => {
      repository.toggleBudgetAlert.mockResolvedValue(undefined)

      await service.toggleBudgetAlert(TENANT_ID, 'ba-001', false)

      expect(repository.toggleBudgetAlert).toHaveBeenCalledWith(TENANT_ID, 'ba-001', false)
    })
  })
})
