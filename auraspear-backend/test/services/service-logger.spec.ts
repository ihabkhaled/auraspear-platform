import { AppLogFeature, AppLogOutcome, AppLogSourceType } from '../../src/common/enums'
import { ServiceLogger } from '../../src/common/services/service-logger'
import type { AppLoggerService } from '../../src/common/services/app-logger.service'

describe('ServiceLogger', () => {
  const mockAppLogger: AppLoggerService = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  } as unknown as AppLoggerService

  const feature = AppLogFeature.ALERTS
  const className = 'TestService'
  const tenantId = 'tenant-123'
  const action = 'testAction'

  let logger: ServiceLogger

  beforeEach(() => {
    jest.clearAllMocks()
    logger = new ServiceLogger(mockAppLogger, feature, className)
  })

  describe('entry()', () => {
    it('should call appLogger.info with outcome PENDING', () => {
      const metadata = { key: 'value' }

      logger.entry(action, tenantId, metadata)

      expect(mockAppLogger.info).toHaveBeenCalledWith(
        `${className} => ${action}`,
        expect.objectContaining({
          feature,
          action,
          outcome: AppLogOutcome.PENDING,
          tenantId,
          sourceType: AppLogSourceType.SERVICE,
          className,
          functionName: action,
          metadata,
        })
      )
    })

    it('should work without metadata', () => {
      logger.entry(action, tenantId)

      expect(mockAppLogger.info).toHaveBeenCalledWith(
        `${className} => ${action}`,
        expect.objectContaining({
          outcome: AppLogOutcome.PENDING,
          metadata: undefined,
        })
      )
    })
  })

  describe('success()', () => {
    it('should call appLogger.info with outcome SUCCESS', () => {
      const metadata = { count: 5 }

      logger.success(action, tenantId, metadata)

      expect(mockAppLogger.info).toHaveBeenCalledWith(
        `${className} => ${action} completed`,
        expect.objectContaining({
          feature,
          action,
          outcome: AppLogOutcome.SUCCESS,
          tenantId,
          sourceType: AppLogSourceType.SERVICE,
          className,
          functionName: action,
          metadata,
        })
      )
    })
  })

  describe('error()', () => {
    it('should call appLogger.error with outcome FAILURE and Error message', () => {
      const testError = new Error('Something went wrong')

      logger.error(action, tenantId, testError)

      expect(mockAppLogger.error).toHaveBeenCalledWith(
        `${className} => ${action} failed`,
        expect.objectContaining({
          feature,
          action,
          outcome: AppLogOutcome.FAILURE,
          tenantId,
          sourceType: AppLogSourceType.SERVICE,
          className,
          functionName: action,
          metadata: { error: 'Something went wrong' },
        })
      )
    })

    it('should stringify non-Error values', () => {
      logger.error(action, tenantId, 'raw string error')

      expect(mockAppLogger.error).toHaveBeenCalledWith(
        `${className} => ${action} failed`,
        expect.objectContaining({
          metadata: { error: 'raw string error' },
        })
      )
    })

    it('should merge additional metadata with error message', () => {
      const testError = new Error('fail')

      logger.error(action, tenantId, testError, { alertId: 'a-1' })

      expect(mockAppLogger.error).toHaveBeenCalledWith(
        `${className} => ${action} failed`,
        expect.objectContaining({
          metadata: { alertId: 'a-1', error: 'fail' },
        })
      )
    })
  })

  describe('warn()', () => {
    it('should call appLogger.warn with outcome WARNING', () => {
      const warnMessage = 'Resource not found'

      logger.warn(action, tenantId, warnMessage)

      expect(mockAppLogger.warn).toHaveBeenCalledWith(
        `${className} => ${warnMessage}`,
        expect.objectContaining({
          feature,
          action,
          outcome: AppLogOutcome.WARNING,
          tenantId,
          sourceType: AppLogSourceType.SERVICE,
          className,
          functionName: action,
        })
      )
    })
  })

  describe('debug()', () => {
    it('should call appLogger.debug with outcome SUCCESS', () => {
      const debugMessage = 'Processing step 2'

      logger.debug(action, tenantId, debugMessage, { step: 2 })

      expect(mockAppLogger.debug).toHaveBeenCalledWith(
        `${className} => ${debugMessage}`,
        expect.objectContaining({
          feature,
          action,
          outcome: AppLogOutcome.SUCCESS,
          tenantId,
          sourceType: AppLogSourceType.SERVICE,
          className,
          functionName: action,
          metadata: { step: 2 },
        })
      )
    })
  })

  describe('skipped()', () => {
    it('should call appLogger.info with outcome SKIPPED and reason', () => {
      const reason = 'No connector configured'

      logger.skipped(action, tenantId, reason)

      expect(mockAppLogger.info).toHaveBeenCalledWith(
        `${className} => ${action} skipped`,
        expect.objectContaining({
          feature,
          action,
          outcome: AppLogOutcome.SKIPPED,
          tenantId,
          sourceType: AppLogSourceType.SERVICE,
          className,
          functionName: action,
          metadata: { reason },
        })
      )
    })

    it('should merge additional metadata with reason', () => {
      const reason = 'Feature disabled'

      logger.skipped(action, tenantId, reason, { featureKey: 'triage' })

      expect(mockAppLogger.info).toHaveBeenCalledWith(
        `${className} => ${action} skipped`,
        expect.objectContaining({
          metadata: { featureKey: 'triage', reason },
        })
      )
    })
  })
})
