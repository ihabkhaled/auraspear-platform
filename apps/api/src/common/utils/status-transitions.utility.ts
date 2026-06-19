import { NORMALIZATION_TRANSITIONS } from './status-transitions.constants'
import { BusinessException } from '../exceptions/business.exception'
import type { NormalizationPipelineStatus } from '../enums'

export function validateNormalizationStatusTransition(
  currentStatus: NormalizationPipelineStatus,
  targetStatus: NormalizationPipelineStatus
): void {
  if (currentStatus === targetStatus) {
    return
  }

  const allowedTargets = NORMALIZATION_TRANSITIONS.get(currentStatus)

  if (!allowedTargets?.has(targetStatus)) {
    throw new BusinessException(
      400,
      `Invalid status transition from "${currentStatus}" to "${targetStatus}"`,
      'errors.normalization.invalidStatusTransition'
    )
  }
}
