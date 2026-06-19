export interface AiFeatureConfigResponse {
  id: string
  tenantId: string
  featureKey: string
  enabled: boolean
  preferredProvider: string | null
  maxTokens: number
  approvalLevel: string
  monthlyTokenBudget: number | null
  createdAt: string
  updatedAt: string
}

/**
 * Internal config shape used by services.
 * May come from the database or from built-in defaults.
 */
export interface ResolvedFeatureConfig {
  enabled: boolean
  preferredProvider: string | null
  maxTokens: number
  approvalLevel: string
  monthlyTokenBudget: number | null
}
