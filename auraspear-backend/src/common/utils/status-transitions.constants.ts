import { NormalizationPipelineStatus } from '../enums'

/**
 * Valid normalization pipeline status transitions:
 *   inactive → active  (deploy)
 *   active   → inactive (pause)
 *   active   → error    (auto on failure)
 *   error    → inactive (reset)
 */
export const NORMALIZATION_TRANSITIONS = new Map<
  NormalizationPipelineStatus,
  Set<NormalizationPipelineStatus>
>()

NORMALIZATION_TRANSITIONS.set(
  NormalizationPipelineStatus.INACTIVE,
  new Set([NormalizationPipelineStatus.ACTIVE])
)
NORMALIZATION_TRANSITIONS.set(
  NormalizationPipelineStatus.ACTIVE,
  new Set([NormalizationPipelineStatus.INACTIVE, NormalizationPipelineStatus.ERROR])
)
NORMALIZATION_TRANSITIONS.set(
  NormalizationPipelineStatus.ERROR,
  new Set([NormalizationPipelineStatus.INACTIVE])
)
