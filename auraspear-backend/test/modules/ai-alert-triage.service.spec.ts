jest.mock('@prisma/client', () => ({
  PrismaClient: class PrismaClient {},
}))

import { AiFeatureKey } from '../../src/common/enums'
import { BusinessException } from '../../src/common/exceptions/business.exception'
import { UserRole } from '../../src/common/interfaces/authenticated-request.interface'
import { toDay } from '../../src/common/utils/date-time.utility'
import { AiAlertTriageService } from '../../src/modules/alerts/ai-alert-triage.service'
import type { JwtPayload } from '../../src/common/interfaces/authenticated-request.interface'

const NOW = toDay('2026-03-15T10:00:00Z').toDate()

const mockUser: JwtPayload = {
  sub: 'user-1',
  tenantId: 'tenant-1',
  email: 'analyst@test.com',
  role: UserRole.SOC_ANALYST_L1,
  tenantSlug: 'test-tenant',
}

function buildMockAlert(overrides: Record<string, unknown> = {}) {
  return {
    id: 'alert-1',
    tenantId: 'tenant-1',
    title: 'Suspicious Login',
    description: 'Multiple failed login attempts',
    severity: 'high',
    source: 'wazuh',
    ruleName: 'Failed Login Detection',
    timestamp: NOW,
    rawEvent: { eventId: 123, sourceIp: '192.168.1.100' },
    ...overrides,
  }
}

function createMockAlertsRepository() {
  return {
    findFirstByIdAndTenant: jest.fn(),
  }
}

function createMockAiService() {
  return {
    executeAiTask: jest.fn(),
  }
}

const mockAppLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}

function createService(
  aiService: ReturnType<typeof createMockAiService>,
  alertsRepository: ReturnType<typeof createMockAlertsRepository>
) {
  return new AiAlertTriageService(
    aiService as never,
    alertsRepository as never,
    mockAppLogger as never
  )
}

describe('AiAlertTriageService', () => {
  let aiService: ReturnType<typeof createMockAiService>
  let alertsRepo: ReturnType<typeof createMockAlertsRepository>
  let service: AiAlertTriageService

  beforeEach(() => {
    jest.clearAllMocks()
    aiService = createMockAiService()
    alertsRepo = createMockAlertsRepository()
    service = createService(aiService, alertsRepo)
  })

  /* ------------------------------------------------------------------ */
  /* triageAlert — success path                                           */
  /* ------------------------------------------------------------------ */

  describe('triageAlert', () => {
    it('should fetch alert, build context, and call executeAiTask', async () => {
      const alert = buildMockAlert()
      alertsRepo.findFirstByIdAndTenant.mockResolvedValue(alert)

      const aiResponse = {
        result: 'Summary of the alert',
        reasoning: ['Analyzed severity factors'],
        confidence: 0.92,
        model: 'claude-3-sonnet',
        provider: 'bedrock',
        tokensUsed: { input: 500, output: 200 },
      }
      aiService.executeAiTask.mockResolvedValue(aiResponse)

      const result = await service.triageAlert(
        'alert-1',
        'tenant-1',
        AiFeatureKey.ALERT_SUMMARIZE,
        mockUser
      )

      expect(alertsRepo.findFirstByIdAndTenant).toHaveBeenCalledWith('alert-1', 'tenant-1')
      expect(aiService.executeAiTask).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          userId: 'user-1',
          userEmail: 'analyst@test.com',
          featureKey: AiFeatureKey.ALERT_SUMMARIZE,
          context: expect.objectContaining({
            alertTitle: 'Suspicious Login',
            alertSeverity: 'high',
          }),
        })
      )
      expect(result).toEqual(aiResponse)
    })

    it('should throw 404 when alert not found', async () => {
      alertsRepo.findFirstByIdAndTenant.mockResolvedValue(null)

      await expect(
        service.triageAlert('nonexistent', 'tenant-1', AiFeatureKey.ALERT_SUMMARIZE, mockUser)
      ).rejects.toThrow(BusinessException)

      try {
        await service.triageAlert('nonexistent', 'tenant-1', AiFeatureKey.ALERT_SUMMARIZE, mockUser)
      } catch (error) {
        expect((error as BusinessException).getStatus()).toBe(404)
        expect((error as BusinessException).messageKey).toBe('errors.alerts.notFound')
      }
    })

    it('should pass ALERT_SUMMARIZE feature key for summarize task', async () => {
      alertsRepo.findFirstByIdAndTenant.mockResolvedValue(buildMockAlert())
      aiService.executeAiTask.mockResolvedValue({
        result: 'test',
        reasoning: [],
        confidence: 0.9,
        model: 'test',
        provider: 'test',
        tokensUsed: { input: 0, output: 0 },
      })

      await service.triageAlert('alert-1', 'tenant-1', AiFeatureKey.ALERT_SUMMARIZE, mockUser)

      expect(aiService.executeAiTask).toHaveBeenCalledWith(
        expect.objectContaining({ featureKey: AiFeatureKey.ALERT_SUMMARIZE })
      )
    })

    it('should pass ALERT_EXPLAIN_SEVERITY feature key for severity explanation', async () => {
      alertsRepo.findFirstByIdAndTenant.mockResolvedValue(buildMockAlert())
      aiService.executeAiTask.mockResolvedValue({
        result: 'test',
        reasoning: [],
        confidence: 0.9,
        model: 'test',
        provider: 'test',
        tokensUsed: { input: 0, output: 0 },
      })

      await service.triageAlert(
        'alert-1',
        'tenant-1',
        AiFeatureKey.ALERT_EXPLAIN_SEVERITY,
        mockUser
      )

      expect(aiService.executeAiTask).toHaveBeenCalledWith(
        expect.objectContaining({ featureKey: AiFeatureKey.ALERT_EXPLAIN_SEVERITY })
      )
    })

    it('should pass ALERT_FALSE_POSITIVE_SCORE feature key for FP scoring', async () => {
      alertsRepo.findFirstByIdAndTenant.mockResolvedValue(buildMockAlert())
      aiService.executeAiTask.mockResolvedValue({
        result: 'test',
        reasoning: [],
        confidence: 0.9,
        model: 'test',
        provider: 'test',
        tokensUsed: { input: 0, output: 0 },
      })

      await service.triageAlert(
        'alert-1',
        'tenant-1',
        AiFeatureKey.ALERT_FALSE_POSITIVE_SCORE,
        mockUser
      )

      expect(aiService.executeAiTask).toHaveBeenCalledWith(
        expect.objectContaining({ featureKey: AiFeatureKey.ALERT_FALSE_POSITIVE_SCORE })
      )
    })

    it('should truncate rawEvent to 3000 characters in context', async () => {
      const largeRawEvent: Record<string, string> = {}
      for (let index = 0; index < 500; index++) {
        largeRawEvent[`key_${String(index)}`] = 'x'.repeat(20)
      }
      alertsRepo.findFirstByIdAndTenant.mockResolvedValue(
        buildMockAlert({ rawEvent: largeRawEvent })
      )
      aiService.executeAiTask.mockResolvedValue({
        result: 'test',
        reasoning: [],
        confidence: 0.9,
        model: 'test',
        provider: 'test',
        tokensUsed: { input: 0, output: 0 },
      })

      await service.triageAlert('alert-1', 'tenant-1', AiFeatureKey.ALERT_SUMMARIZE, mockUser)

      const callArguments = aiService.executeAiTask.mock.calls[0]?.[0] as Record<
        string,
        Record<string, unknown>
      >
      const rawData = callArguments['context']['alertRawData'] as string
      expect(rawData.length).toBeLessThanOrEqual(3000)
    })

    it('should handle null rawEvent gracefully', async () => {
      alertsRepo.findFirstByIdAndTenant.mockResolvedValue(buildMockAlert({ rawEvent: null }))
      aiService.executeAiTask.mockResolvedValue({
        result: 'test',
        reasoning: [],
        confidence: 0.9,
        model: 'test',
        provider: 'test',
        tokensUsed: { input: 0, output: 0 },
      })

      await service.triageAlert('alert-1', 'tenant-1', AiFeatureKey.ALERT_SUMMARIZE, mockUser)

      const callArguments = aiService.executeAiTask.mock.calls[0]?.[0] as Record<
        string,
        Record<string, unknown>
      >
      expect(callArguments['context']['alertRawData']).toBe('{}')
    })
  })
})
