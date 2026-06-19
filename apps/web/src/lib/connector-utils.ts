import { ConnectorAuthType, ConnectorType, LlmMaxTokensParameter } from '@/enums'
import type { ConnectorFormValues } from '@/lib/validation/connectors.schema'
import type { ConnectorRecord } from '@/types'

/**
 * Converts a backend `ConnectorRecord` into the form values shape
 * expected by `ConnectorForm`.  The config field is already an object
 * returned by the backend.
 */
export function recordToFormValues(record: ConnectorRecord): ConnectorFormValues {
  const config: Record<string, unknown> = record.config ?? {}

  return {
    name: record.name,
    enabled: record.enabled,
    baseUrl: String(config['baseUrl'] ?? ''),
    authType: (Object.values(ConnectorAuthType).includes(
      String(config['authType'] ?? record.authType ?? '') as ConnectorAuthType
    )
      ? String(config['authType'] ?? record.authType)
      : ConnectorAuthType.API_KEY) as ConnectorAuthType,
    apiKey: String(config['apiKey'] ?? ''),
    username: String(config['username'] ?? ''),
    password: String(config['password'] ?? ''),
    token: String(config['token'] ?? ''),
    verifyTLS: (config['verifyTLS'] ?? config['verifyTls']) !== false,
    timeoutSeconds: Number(config['timeoutSeconds'] ?? 30) || 30,
    tags: Array.isArray(config['tags']) ? (config['tags'] as string[]).join(', ') : '',
    notes: String(config['notes'] ?? ''),
    managerUrl: String(config['managerUrl'] ?? ''),
    indexerUrl: String(config['indexerUrl'] ?? ''),
    indexerUsername: String(config['indexerUsername'] ?? ''),
    indexerPassword: String(config['indexerPassword'] ?? ''),
    tenant: String(config['tenant'] ?? ''),
    apiUrl: String(config['apiUrl'] ?? ''),
    streamId: String(config['streamId'] ?? ''),
    indexSetId: String(config['indexSetId'] ?? ''),
    pipelineId: String(config['pipelineId'] ?? ''),
    orgId: String(config['orgId'] ?? ''),
    clientCert: String(config['clientCert'] ?? ''),
    clientKey: String(config['clientKey'] ?? ''),
    grafanaUrl: String(config['grafanaUrl'] ?? ''),
    folderId: String(config['folderId'] ?? ''),
    datasourceUid: String(config['datasourceUid'] ?? ''),
    org: String(config['org'] ?? ''),
    bucket: String(config['bucket'] ?? ''),
    mispUrl: String(config['mispUrl'] ?? ''),
    mispAuthKey: String(config['mispAuthKey'] ?? ''),
    webhookUrl: String(config['webhookUrl'] ?? ''),
    workflowId: String(config['workflowId'] ?? ''),
    shuffleApiKey: String(config['shuffleApiKey'] ?? ''),
    modelId: String(config['modelId'] ?? ''),
    region: String(config['region'] ?? ''),
    accessKeyId: String(config['accessKeyId'] ?? ''),
    secretAccessKey: String(config['secretAccessKey'] ?? ''),
    endpoint: String(config['endpoint'] ?? ''),
    nlHuntingEnabled: config['nlHuntingEnabled'] === true,
    explainableAiEnabled: config['explainableAiEnabled'] === true,
    auditLoggingEnabled: config['auditLoggingEnabled'] === true,
    // LLM APIs: backend stores as baseUrl/apiKey/timeout, form uses llm-prefixed names
    llmBaseUrl: String(config['baseUrl'] ?? config['llmBaseUrl'] ?? ''),
    llmApiKey: String(config['apiKey'] ?? config['llmApiKey'] ?? ''),
    defaultModel: String(config['defaultModel'] ?? ''),
    organizationId: String(config['organizationId'] ?? ''),
    llmTimeout: Number(config['timeout'] ?? config['llmTimeout'] ?? 30) || 30,
    maxTokensParameter:
      (config['maxTokensParameter'] as LlmMaxTokensParameter | undefined) ??
      LlmMaxTokensParameter.MAX_TOKENS,
    // OpenClaw Gateway: backend stores as baseUrl/apiKey/timeout, form uses openclaw-prefixed names
    openclawBaseUrl: String(config['baseUrl'] ?? config['openclawBaseUrl'] ?? ''),
    openclawApiKey: String(config['apiKey'] ?? config['openclawApiKey'] ?? ''),
    openclawTimeout: Number(config['timeout'] ?? config['openclawTimeout'] ?? 30) || 30,
  }
}

/**
 * Maps prefixed form field names to the unprefixed config field names
 * that the backend expects for LLM_APIS and OPENCLAW_GATEWAY connectors.
 *
 * For other connector types, returns the config unchanged.
 */
export function mapConfigForBackend(
  connectorType: ConnectorType,
  config: Record<string, unknown>
): Record<string, unknown> {
  if (connectorType === ConnectorType.LLM_APIS) {
    const mapped: Record<string, unknown> = { ...config }
    // Map prefixed form fields → unprefixed backend fields
    if ('llmBaseUrl' in mapped) {
      Reflect.set(mapped, 'baseUrl', mapped['llmBaseUrl'])
      Reflect.deleteProperty(mapped, 'llmBaseUrl')
    }
    if ('llmApiKey' in mapped) {
      Reflect.set(mapped, 'apiKey', mapped['llmApiKey'])
      Reflect.deleteProperty(mapped, 'llmApiKey')
    }
    if ('llmTimeout' in mapped) {
      Reflect.set(mapped, 'timeout', mapped['llmTimeout'])
      Reflect.deleteProperty(mapped, 'llmTimeout')
    }
    // defaultModel and organizationId keep their names (no prefix)
    return mapped
  }

  if (connectorType === ConnectorType.OPENCLAW_GATEWAY) {
    const mapped: Record<string, unknown> = { ...config }
    // Map prefixed form fields → unprefixed backend fields
    if ('openclawBaseUrl' in mapped) {
      Reflect.set(mapped, 'baseUrl', mapped['openclawBaseUrl'])
      Reflect.deleteProperty(mapped, 'openclawBaseUrl')
    }
    if ('openclawApiKey' in mapped) {
      Reflect.set(mapped, 'apiKey', mapped['openclawApiKey'])
      Reflect.deleteProperty(mapped, 'openclawApiKey')
    }
    if ('openclawTimeout' in mapped) {
      Reflect.set(mapped, 'timeout', mapped['openclawTimeout'])
      Reflect.deleteProperty(mapped, 'openclawTimeout')
    }
    return mapped
  }

  return config
}
