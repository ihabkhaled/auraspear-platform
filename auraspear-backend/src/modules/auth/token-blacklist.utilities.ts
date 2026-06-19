import { AppLogFeature, type AppLogOutcome, AppLogSourceType } from '../../common/enums'
import type { AppLogContext } from '../../common/services/app-logger.types'
export { extractErrorMessage, extractErrorStack } from '../../common/utils/error-extraction.utility'

export function buildBlacklistLogContext(
  action: string,
  outcome: AppLogOutcome,
  metadata?: Record<string, unknown>,
  stackTrace?: string
): AppLogContext {
  return {
    feature: AppLogFeature.AUTH,
    action,
    outcome,
    sourceType: AppLogSourceType.SERVICE,
    className: 'TokenBlacklistService',
    functionName: action,
    ...(metadata ? { metadata } : {}),
    ...(stackTrace ? { stackTrace } : {}),
  }
}
