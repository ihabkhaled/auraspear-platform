export interface LlmConnectorResponse {
  id: string
  tenantId: string
  name: string
  description: string | null
  enabled: boolean
  baseUrl: string
  apiKey: string
  defaultModel: string | null
  organizationId: string | null
  maxTokensParam: string
  timeout: number
  lastTestAt: string | null
  lastTestOk: boolean | null
  lastError: string | null
  createdAt: string
  updatedAt: string
}

export interface LlmConnectorEnabledConfig {
  id: string
  name: string
  config: Record<string, unknown>
}

export interface AiAvailableConnector {
  key: string
  label: string
  type: 'system' | 'fixed' | 'dynamic'
  enabled: boolean
}
