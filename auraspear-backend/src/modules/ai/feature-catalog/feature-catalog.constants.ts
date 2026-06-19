import { AiApprovalLevel } from '../../../common/enums'
import type { ResolvedFeatureConfig } from './feature-catalog.types'

/** Default configuration applied when no tenant-specific config exists. */
export const DEFAULT_FEATURE_CONFIG: ResolvedFeatureConfig = {
  enabled: true,
  preferredProvider: null,
  maxTokens: 2048,
  approvalLevel: AiApprovalLevel.NONE,
  monthlyTokenBudget: null,
}

export const FEATURE_CATALOG_SERVICE_CLASS_NAME = 'FeatureCatalogService'
