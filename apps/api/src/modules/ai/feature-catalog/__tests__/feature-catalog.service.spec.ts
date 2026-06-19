jest.mock('@prisma/client', () => ({
  PrismaClient: class PrismaClient {},
}))

import { AiApprovalLevel, AiFeatureKey } from '../../../../common/enums'
import { toDay } from '../../../../common/utils/date-time.utility'
import { DEFAULT_FEATURE_CONFIG } from '../feature-catalog.constants'
import { FeatureCatalogService } from '../feature-catalog.service'

const mockAppLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}

const NOW = toDay('2026-03-01T00:00:00Z').toDate()

function buildConfig(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cfg-1',
    tenantId: 'tenant-1',
    featureKey: AiFeatureKey.ALERT_SUMMARIZE,
    enabled: true,
    preferredProvider: null,
    maxTokens: 2048,
    approvalLevel: AiApprovalLevel.NONE,
    monthlyTokenBudget: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

function createMockRepository() {
  return {
    findAllByTenant: jest.fn(),
    findByTenantAndFeature: jest.fn(),
    upsert: jest.fn(),
  }
}

function createService(repository: ReturnType<typeof createMockRepository>) {
  return new FeatureCatalogService(repository as never, mockAppLogger as never)
}

describe('FeatureCatalogService', () => {
  let repo: ReturnType<typeof createMockRepository>
  let service: FeatureCatalogService

  beforeEach(() => {
    jest.clearAllMocks()
    repo = createMockRepository()
    service = createService(repo)
  })

  /* ------------------------------------------------------------------ */
  /* list                                                                 */
  /* ------------------------------------------------------------------ */

  describe('list', () => {
    it('should fill defaults for unconfigured features', async () => {
      // Only one feature is configured in DB
      repo.findAllByTenant.mockResolvedValue([buildConfig()])

      const result = await service.list('tenant-1')

      // Total should be all AiFeatureKey values
      const allFeatureKeys = Object.values(AiFeatureKey)
      expect(result).toHaveLength(allFeatureKeys.length)

      // The configured one should have a real id
      const configured = result.find(r => r.featureKey === AiFeatureKey.ALERT_SUMMARIZE)
      expect(configured?.id).toBe('cfg-1')

      // The unconfigured ones should have empty id (default)
      const unconfigured = result.find(r => r.featureKey === AiFeatureKey.CASE_SUMMARIZE)
      expect(unconfigured?.id).toBe('')
      expect(unconfigured?.enabled).toBe(DEFAULT_FEATURE_CONFIG.enabled)
    })

    it('should sort results alphabetically by featureKey', async () => {
      repo.findAllByTenant.mockResolvedValue([])

      const result = await service.list('tenant-1')
      const keys = result.map(r => r.featureKey)

      const sorted = [...keys].sort()
      expect(keys).toEqual(sorted)
    })
  })

  /* ------------------------------------------------------------------ */
  /* getConfig                                                            */
  /* ------------------------------------------------------------------ */

  describe('getConfig', () => {
    it('should return stored config when one exists', async () => {
      const config = buildConfig({ enabled: false, maxTokens: 4096 })
      repo.findByTenantAndFeature.mockResolvedValue(config)

      const result = await service.getConfig('tenant-1', AiFeatureKey.ALERT_SUMMARIZE)

      expect(result.enabled).toBe(false)
      expect(result.maxTokens).toBe(4096)
    })

    it('should return default config when not configured', async () => {
      repo.findByTenantAndFeature.mockResolvedValue(null)

      const result = await service.getConfig('tenant-1', AiFeatureKey.ALERT_SUMMARIZE)

      expect(result).toEqual(DEFAULT_FEATURE_CONFIG)
    })
  })

  /* ------------------------------------------------------------------ */
  /* isEnabled                                                            */
  /* ------------------------------------------------------------------ */

  describe('isEnabled', () => {
    it('should return true when feature is enabled', async () => {
      repo.findByTenantAndFeature.mockResolvedValue(buildConfig({ enabled: true }))

      const result = await service.isEnabled('tenant-1', AiFeatureKey.ALERT_SUMMARIZE)

      expect(result).toBe(true)
    })

    it('should return true by default when not configured (enabled by default)', async () => {
      repo.findByTenantAndFeature.mockResolvedValue(null)

      const result = await service.isEnabled('tenant-1', AiFeatureKey.CASE_SUMMARIZE)

      expect(result).toBe(true) // DEFAULT_FEATURE_CONFIG.enabled is true
    })

    it('should return false when feature is explicitly disabled', async () => {
      repo.findByTenantAndFeature.mockResolvedValue(buildConfig({ enabled: false }))

      const result = await service.isEnabled('tenant-1', AiFeatureKey.ALERT_SUMMARIZE)

      expect(result).toBe(false)
    })
  })

  /* ------------------------------------------------------------------ */
  /* update                                                               */
  /* ------------------------------------------------------------------ */

  describe('update', () => {
    it('should upsert the feature configuration', async () => {
      const updated = buildConfig({ enabled: false, maxTokens: 4096 })
      repo.upsert.mockResolvedValue(updated)

      const dto = { enabled: false, maxTokens: 4096 }
      const result = await service.update(
        'tenant-1',
        AiFeatureKey.ALERT_SUMMARIZE,
        dto as never,
        'admin@test.com'
      )

      expect(repo.upsert).toHaveBeenCalledWith(
        'tenant-1',
        AiFeatureKey.ALERT_SUMMARIZE,
        expect.objectContaining({ enabled: false, maxTokens: 4096 })
      )
      expect(result.enabled).toBe(false)
    })

    it('should log the update via appLogger', async () => {
      repo.upsert.mockResolvedValue(buildConfig())

      await service.update(
        'tenant-1',
        AiFeatureKey.ALERT_SUMMARIZE,
        { enabled: true } as never,
        'admin@test.com'
      )

      expect(mockAppLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('AI feature config updated'),
        expect.objectContaining({
          tenantId: 'tenant-1',
          actorEmail: 'admin@test.com',
        })
      )
    })
  })

  /* ------------------------------------------------------------------ */
  /* getDefaultConfig                                                     */
  /* ------------------------------------------------------------------ */

  describe('getDefaultConfig', () => {
    it('should return a fresh copy of the default config', () => {
      const config1 = service.getDefaultConfig(AiFeatureKey.ALERT_SUMMARIZE)
      const config2 = service.getDefaultConfig(AiFeatureKey.CASE_SUMMARIZE)

      expect(config1).toEqual(DEFAULT_FEATURE_CONFIG)
      expect(config2).toEqual(DEFAULT_FEATURE_CONFIG)
      // Ensure they are separate objects (not same reference)
      expect(config1).not.toBe(config2)
    })
  })
})
