import { MAX_REMOTE_ERROR_LENGTH, MINIMUM_TIMEOUT_MS, URL_KEYS } from './connectors.constants'
import { BedrockModelFamily } from './connectors.enums'
import { REDACTED_PLACEHOLDER } from '../../common/utils/mask.utility'
import type {
  AwsSdkTypes,
  BedrockConfigFields,
  ChatCompletionContentBlock,
  ConnectorResponse,
  ConnectorRow,
  ConnectorStats,
  LlmApiHeaders,
  LlmConnectorUpdateFields,
  VelociraptorAuthOptions,
  WazuhManagerInfoData,
} from './connectors.types'
import type { UpdateLlmConnectorDto } from './llm-connectors/dto/update-llm-connector.dto'
import type { AxiosRequestOptions } from '../../common/modules/axios'
import type { ConnectorConfig } from '@prisma/client'

/* ---------------------------------------------------------------- */
/* CONNECTOR → RESPONSE MAPPING                                      */
/* ---------------------------------------------------------------- */

export function mapConnectorToResponse(
  row: ConnectorRow,
  decryptFunction: (enc: string) => Record<string, unknown>,
  maskFunction: (config: Record<string, unknown>) => Record<string, unknown>
): ConnectorResponse {
  return {
    type: row.type,
    name: row.name,
    enabled: row.enabled,
    authType: row.authType,
    config: maskFunction(decryptFunction(row.encryptedConfig)),
    lastTestAt: row.lastTestAt,
    lastTestOk: row.lastTestOk,
    lastError: row.lastError,
  }
}

export function buildNewConnectorResponse(
  config: { type: string; name: string; enabled: boolean; authType: string },
  maskedConfig: Record<string, unknown>
): ConnectorResponse {
  return {
    type: config.type,
    name: config.name,
    enabled: config.enabled,
    authType: config.authType,
    config: maskedConfig,
    lastTestAt: null,
    lastTestOk: null,
    lastError: null,
  }
}

export function buildConnectorStats(connectors: ConnectorConfig[]): ConnectorStats {
  let enabledConnectors = 0
  let healthyConnectors = 0
  let failingConnectors = 0
  let untestedConnectors = 0

  for (const connector of connectors) {
    if (connector.enabled) {
      enabledConnectors += 1
    }

    if (connector.lastTestOk === true) {
      healthyConnectors += 1
      continue
    }

    if (connector.lastTestOk === false) {
      failingConnectors += 1
      continue
    }

    untestedConnectors += 1
  }

  return {
    totalConnectors: connectors.length,
    enabledConnectors,
    healthyConnectors,
    failingConnectors,
    untestedConnectors,
  }
}

/* ---------------------------------------------------------------- */
/* CONFIG MERGE                                                      */
/* ---------------------------------------------------------------- */

export function mergeConfigWithRedacted(
  incoming: Record<string, unknown>,
  existingDecrypted: Record<string, unknown>
): Record<string, unknown> {
  const merged = new Map<string, unknown>()

  for (const [key, value] of Object.entries(incoming)) {
    const fallback = new Map(Object.entries(existingDecrypted)).get(key)
    merged.set(key, value === REDACTED_PLACEHOLDER ? fallback : value)
  }
  for (const [key, value] of Object.entries(existingDecrypted)) {
    if (!merged.has(key)) {
      merged.set(key, value)
    }
  }

  return Object.fromEntries(merged)
}

/* ---------------------------------------------------------------- */
/* UPDATE DATA BUILDING                                              */
/* ---------------------------------------------------------------- */

export function buildConnectorUpdateData(dto: {
  name?: string
  enabled?: boolean
  authType?: string
}): Record<string, unknown> {
  const data: Record<string, unknown> = {}
  if (dto.name !== undefined) data.name = dto.name
  if (dto.enabled !== undefined) data.enabled = dto.enabled
  if (dto.authType !== undefined) data.authType = dto.authType
  return data
}

/* ---------------------------------------------------------------- */
/* CONFIG KEY NORMALIZATION                                          */
/* ---------------------------------------------------------------- */

/**
 * Normalizes deprecated config keys to their canonical names at runtime.
 * This ensures backward compatibility with existing encrypted configs that
 * were stored before key naming was standardized:
 * - verifyTLS → verifyTls
 * - mispAuthKey → authKey
 * - shuffleApiKey → apiKey
 *
 * In all cases, the canonical key takes precedence if both are present.
 */
export function normalizeConnectorConfig(config: Record<string, unknown>): Record<string, unknown> {
  const normalized = new Map(Object.entries(config))

  // verifyTLS → verifyTls
  if (normalized.has('verifyTLS') && !normalized.has('verifyTls')) {
    normalized.set('verifyTls', normalized.get('verifyTLS'))
    normalized.delete('verifyTLS')
  } else if (normalized.has('verifyTLS') && normalized.has('verifyTls')) {
    normalized.delete('verifyTLS')
  }

  // mispAuthKey → authKey
  if (normalized.has('mispAuthKey') && !normalized.has('authKey')) {
    normalized.set('authKey', normalized.get('mispAuthKey'))
    normalized.delete('mispAuthKey')
  } else if (normalized.has('mispAuthKey') && normalized.has('authKey')) {
    normalized.delete('mispAuthKey')
  }

  // shuffleApiKey → apiKey
  if (normalized.has('shuffleApiKey') && !normalized.has('apiKey')) {
    normalized.set('apiKey', normalized.get('shuffleApiKey'))
    normalized.delete('shuffleApiKey')
  } else if (normalized.has('shuffleApiKey') && normalized.has('apiKey')) {
    normalized.delete('shuffleApiKey')
  }

  return Object.fromEntries(normalized)
}

/* ---------------------------------------------------------------- */
/* URL VALIDATION                                                    */
/* ---------------------------------------------------------------- */

export function extractUrlFields(
  config: Record<string, unknown>
): Array<{ key: string; value: string }> {
  const urls: Array<{ key: string; value: string }> = []
  for (const [key, value] of Object.entries(config)) {
    if (URL_KEYS.has(key) && typeof value === 'string' && value.length > 0) {
      urls.push({ key, value })
    }
  }
  return urls
}

/* ---------------------------------------------------------------- */
/* ERROR SANITIZATION                                                */
/* ---------------------------------------------------------------- */

export function sanitizeErrorDetails(error: unknown): string {
  const rawMessage = error instanceof Error ? error.message : 'Connection test failed'
  return rawMessage.replaceAll(/\/[\w./-]+/g, '[path]').slice(0, 500)
}

/* ---------------------------------------------------------------- */
/* REMOTE ERROR EXTRACTION                                           */
/* ---------------------------------------------------------------- */

/**
 * Extracts a human-readable error message from a third-party service response body.
 *
 * Supports common error response formats:
 * - `{ error: "message" }` or `{ error: { message: "..." } }`
 * - `{ message: "..." }`
 * - `{ detail: "..." }` or `{ details: "..." }`
 * - `{ title: "...", detail: "..." }` (RFC 7807 / Wazuh style)
 * - `{ reason: "..." }`
 * - Plain string responses
 *
 * Returns an empty string if no meaningful message can be extracted.
 */
export function extractRemoteErrorMessage(data: unknown): string {
  if (typeof data === 'string') {
    return data.trim().slice(0, MAX_REMOTE_ERROR_LENGTH)
  }

  if (typeof data !== 'object' || data === null) {
    return ''
  }

  const body = data as Record<string, unknown>

  // Try { error: "message" } or { error: { message: "..." } }
  if (body.error !== undefined) {
    if (typeof body.error === 'string') {
      return body.error.slice(0, MAX_REMOTE_ERROR_LENGTH)
    }
    if (typeof body.error === 'object' && body.error !== null) {
      const nested = body.error as Record<string, unknown>
      if (typeof nested.message === 'string') {
        return nested.message.slice(0, MAX_REMOTE_ERROR_LENGTH)
      }
    }
  }

  // Try { message: "..." }
  if (typeof body.message === 'string') {
    return body.message.slice(0, MAX_REMOTE_ERROR_LENGTH)
  }

  // Try { title: "...", detail: "..." } (RFC 7807)
  if (typeof body.title === 'string' && typeof body.detail === 'string') {
    return `${body.title}: ${body.detail}`.slice(0, MAX_REMOTE_ERROR_LENGTH)
  }

  // Try { detail: "..." } or { details: "..." }
  if (typeof body.detail === 'string') {
    return body.detail.slice(0, MAX_REMOTE_ERROR_LENGTH)
  }
  if (typeof body.details === 'string') {
    return body.details.slice(0, MAX_REMOTE_ERROR_LENGTH)
  }

  // Try { reason: "..." }
  if (typeof body.reason === 'string') {
    return body.reason.slice(0, MAX_REMOTE_ERROR_LENGTH)
  }

  return ''
}

/**
 * Formats a standardised error string for when a third-party connector returns a non-success status.
 * Includes the HTTP status and any error message extracted from the response body.
 *
 * Example outputs:
 * - `Wazuh Manager returned status 401: Invalid credentials`
 * - `MISP returned status 403`
 */
export function formatRemoteError(serviceName: string, status: number, data: unknown): string {
  const hints: Record<number, string> = {
    400: 'Bad request — check the model name and parameters',
    401: 'Authentication failed — check your API key',
    403: 'Access denied — your API key may lack permissions',
    404: 'Endpoint not found — check the base URL',
    429: 'Rate limited — too many requests, try again later',
    500: 'Internal server error on the provider side',
    502: 'Bad gateway — the provider may be down',
    503: 'Service unavailable — the provider may be overloaded',
  }
  const remoteMessage = extractRemoteErrorMessage(data)
  const hint = Reflect.get(hints, status) as string | undefined
  const base = `${serviceName} returned status ${String(status)}`
  const parts = [base]
  if (hint) {
    parts.push(hint)
  }
  if (remoteMessage) {
    parts.push(remoteMessage)
  }
  return parts.join('. ')
}

/* ---------------------------------------------------------------- */
/* TIMEOUT NORMALIZATION                                             */
/* ---------------------------------------------------------------- */

/**
 * Normalizes a user-configured timeout value to milliseconds.
 *
 * Users often configure timeout as seconds (e.g., `timeout: 60` for 60 seconds).
 * If the value is below 1000, it is assumed to be in seconds and converted to ms.
 * Values at or above 1000 are assumed to already be in milliseconds.
 *
 * A floor of 5000ms (5 seconds) is enforced to prevent impossibly short timeouts.
 */
export function normalizeTimeoutMs(value: number): number {
  const ms = value < 1000 ? value * 1000 : value
  return Math.max(ms, MINIMUM_TIMEOUT_MS)
}

/* ---------------------------------------------------------------- */
/* CHAT COMPLETION CONTENT EXTRACTION                                 */
/* ---------------------------------------------------------------- */

/**
 * Extracts plain text from a chat completion `content` field.
 *
 * OpenAI-compatible APIs may return `content` as either a plain string or
 * an array of typed content blocks (`{ type: 'text', text: '…' }`).
 * This function normalizes both shapes into a single string.
 */
export function extractChatCompletionText(
  content: string | ChatCompletionContentBlock[] | undefined | null
): string {
  if (typeof content === 'string') return content

  if (Array.isArray(content)) {
    const parts: string[] = []
    for (const block of content) {
      if (block.type === 'text' && block.text) {
        parts.push(block.text)
      }
    }
    return parts.join('')
  }

  return ''
}

/* ---------------------------------------------------------------- */
/* VELOCIRAPTOR HELPERS                                               */
/* ---------------------------------------------------------------- */

/**
 * Resolves the Velociraptor base URL from config.
 * Prefers `apiUrl`, falls back to `baseUrl`.
 */
export function resolveVelociraptorBaseUrl(config: Record<string, unknown>): string | undefined {
  return (config.apiUrl ?? config.baseUrl) as string | undefined
}

/**
 * Builds authentication options for Velociraptor requests.
 *
 * Supports two auth modes:
 * 1. **mTLS** (preferred for API port 8001) — uses `clientCert` + `clientKey`
 * 2. **Basic auth** (GUI port 8889) — uses `username` + `password`
 */
export function buildVelociraptorAuthOptions(
  config: Record<string, unknown>,
  basicAuthFunction: (username: string, password: string) => string
): VelociraptorAuthOptions {
  const clientCert = config.clientCert as string | undefined
  const clientKey = config.clientKey as string | undefined
  const caCert = config.caCert as string | undefined
  const username = config.username as string | undefined
  const password = config.password as string | undefined

  const headers: Record<string, string> = {}
  const httpOptions: Partial<AxiosRequestOptions> = {}

  if (clientCert && clientKey) {
    // mTLS authentication for the gRPC gateway API (port 8001)
    httpOptions.clientCert = clientCert
    httpOptions.clientKey = clientKey
    if (caCert) {
      httpOptions.caCert = caCert
    }
  } else if (username && password) {
    // Basic auth for the GUI REST API (port 8889)
    headers.Authorization = basicAuthFunction(username, password)
  }

  return { headers, httpOptions }
}

/* ---------------------------------------------------------------- */
/* LLM API HEADERS                                                   */
/* ---------------------------------------------------------------- */

/**
 * Builds authorization headers for OpenAI-compatible LLM API requests.
 */
export function buildLlmApiHeaders(parameters: LlmApiHeaders): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${parameters.apiKey}`,
  }
  if (parameters.organizationId) {
    headers['OpenAI-Organization'] = parameters.organizationId
  }
  return headers
}

/* ---------------------------------------------------------------- */
/* BEDROCK CONFIG EXTRACTION                                         */
/* ---------------------------------------------------------------- */

/**
 * Extracts and normalizes Bedrock configuration fields from a raw config object.
 */
export function extractBedrockConfig(config: Record<string, unknown>): BedrockConfigFields {
  return {
    region: (config.region ?? 'us-east-1') as string,
    accessKeyId: config.accessKeyId as string | undefined,
    secretAccessKey: config.secretAccessKey as string | undefined,
    modelId: (config.modelId ?? 'global.anthropic.claude-sonnet-4-5-20250929-v1:0') as string,
    endpoint: config.endpoint as string | undefined,
  }
}

/**
 * Detects the Bedrock model family from a model ID string.
 */
export function detectBedrockModelFamily(modelId: string): BedrockModelFamily {
  if (modelId.includes('anthropic.')) {
    return BedrockModelFamily.ANTHROPIC
  }
  if (modelId.includes('amazon.nova')) {
    return BedrockModelFamily.AMAZON_NOVA
  }
  if (modelId.includes('meta.llama')) {
    return BedrockModelFamily.META_LLAMA
  }
  return BedrockModelFamily.UNKNOWN
}

/**
 * Wraps a prompt in Meta Llama 3 instruct template.
 */
function buildLlamaInstructPrompt(prompt: string): string {
  return `<|begin_of_text|><|start_header_id|>user<|end_header_id|>\n${prompt}\n<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n`
}

/**
 * Creates a Bedrock InvokeModel command body appropriate for the model family.
 *
 * - Anthropic: Messages API with `anthropic_version` and `max_tokens`
 * - Amazon Nova: Converse API with `inferenceConfig.maxTokens`
 * - Meta Llama: Native InvokeModel with `prompt` and `max_gen_len`
 * - Unknown: Falls back to Converse API shape (Amazon Nova style)
 */
export function buildBedrockRequestBody(
  prompt: string,
  maxTokens: number,
  modelId: string,
  temperature: number = 0.3
): string {
  const family = detectBedrockModelFamily(modelId)

  switch (family) {
    case BedrockModelFamily.ANTHROPIC: {
      return JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: maxTokens,
        temperature,
        messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
      })
    }
    case BedrockModelFamily.AMAZON_NOVA: {
      return JSON.stringify({
        messages: [{ role: 'user', content: [{ text: prompt }] }],
        inferenceConfig: {
          maxTokens,
          temperature,
          topP: 0.9,
        },
      })
    }
    case BedrockModelFamily.META_LLAMA: {
      return JSON.stringify({
        prompt: buildLlamaInstructPrompt(prompt),
        max_gen_len: maxTokens,
        temperature,
        top_p: 0.9,
      })
    }
    default: {
      return JSON.stringify({
        messages: [{ role: 'user', content: [{ text: prompt }] }],
        inferenceConfig: {
          maxTokens,
        },
      })
    }
  }
}

/**
 * Parses the Bedrock response body and extracts text and token usage.
 * Handles Anthropic, Amazon Nova, and Meta Llama response shapes.
 */
export function parseBedrockResponse(
  bodyBytes: Uint8Array,
  modelId: string
): {
  text: string
  inputTokens: number
  outputTokens: number
  stopReason: string
} {
  const bodyString = new TextDecoder().decode(bodyBytes)
  const body = JSON.parse(bodyString) as Record<string, unknown>
  const family = detectBedrockModelFamily(modelId)

  switch (family) {
    case BedrockModelFamily.ANTHROPIC: {
      const content = body.content as Array<{ text: string }> | undefined
      const usage = body.usage as { input_tokens: number; output_tokens: number } | undefined
      return {
        text: content?.[0]?.text ?? '',
        inputTokens: usage?.input_tokens ?? 0,
        outputTokens: usage?.output_tokens ?? 0,
        stopReason: (body.stop_reason as string) ?? 'ok',
      }
    }
    case BedrockModelFamily.AMAZON_NOVA: {
      const output = body.output as { message?: { content?: Array<{ text: string }> } } | undefined
      const usage = body.usage as { inputTokens: number; outputTokens: number } | undefined
      return {
        text: output?.message?.content?.[0]?.text ?? '',
        inputTokens: usage?.inputTokens ?? 0,
        outputTokens: usage?.outputTokens ?? 0,
        stopReason: (body.stopReason as string) ?? 'ok',
      }
    }
    case BedrockModelFamily.META_LLAMA: {
      const generation = (body.generation as string) ?? ''
      const promptTokenCount = (body.prompt_token_count as number) ?? 0
      const generationTokenCount = (body.generation_token_count as number) ?? 0
      return {
        text: generation,
        inputTokens: promptTokenCount,
        outputTokens: generationTokenCount,
        stopReason: (body.stop_reason as string) ?? 'ok',
      }
    }
    default: {
      const content = body.content as Array<{ text: string }> | undefined
      const usage = body.usage as { input_tokens: number; output_tokens: number } | undefined
      return {
        text: content?.[0]?.text ?? '',
        inputTokens: usage?.input_tokens ?? 0,
        outputTokens: usage?.output_tokens ?? 0,
        stopReason: (body.stop_reason as string) ?? 'ok',
      }
    }
  }
}

/**
 * Dynamically imports the AWS Bedrock SDK.
 * Returns the SDK classes or throws an informative error.
 */
export async function loadAwsBedrockSdk(): Promise<AwsSdkTypes> {
  try {
    const moduleName = '@aws-sdk/client-bedrock-runtime'
    const sdk = (await import(moduleName)) as unknown as Record<string, unknown>
    return sdk as unknown as AwsSdkTypes
  } catch {
    throw new Error(
      '@aws-sdk/client-bedrock-runtime is not installed. Run: npm install @aws-sdk/client-bedrock-runtime'
    )
  }
}

/**
 * Checks if an error message indicates a missing AWS SDK module.
 */
export function isMissingSdkError(message: string): boolean {
  return message.includes('Cannot find module') || message.includes('MODULE_NOT_FOUND')
}

/* ---------------------------------------------------------------- */
/* LLM CONNECTOR UPDATE FIELDS                                       */
/* ---------------------------------------------------------------- */

/**
 * Builds the update data record from an LLM connector update DTO.
 * Encrypts the API key if provided.
 */
export function buildLlmConnectorUpdateData(
  dto: UpdateLlmConnectorDto,
  encryptFunction?: (value: string) => string
): LlmConnectorUpdateFields {
  const data: LlmConnectorUpdateFields = {}

  if (dto.name !== undefined) data.name = dto.name
  if (dto.description !== undefined) data.description = dto.description
  if (dto.baseUrl !== undefined) data.baseUrl = dto.baseUrl
  if (dto.apiKey !== undefined && encryptFunction) {
    data.encryptedApiKey = encryptFunction(dto.apiKey)
  }
  if (dto.defaultModel !== undefined) data.defaultModel = dto.defaultModel
  if (dto.organizationId !== undefined) data.organizationId = dto.organizationId
  if (dto.maxTokensParam !== undefined) data.maxTokensParam = dto.maxTokensParam
  if (dto.timeout !== undefined) data.timeout = dto.timeout
  if (dto.enabled !== undefined) data.enabled = dto.enabled

  return data
}

/* ---------------------------------------------------------------- */
/* WAZUH VERSION EXTRACTION                                          */
/* ---------------------------------------------------------------- */

/**
 * Extracts the Wazuh Manager version from the /manager/info response.
 * Handles the Wazuh v4 API wrapper structure with data.affected_items[].
 */
export function extractWazuhVersion(info: WazuhManagerInfoData): string {
  const dataWrapper = (info.data as Record<string, unknown>) ?? info
  const affectedItems = (dataWrapper.affected_items as Record<string, unknown>[]) ?? []
  const firstItem = (affectedItems[0] ?? dataWrapper) as Record<string, unknown>

  return (firstItem.api_version ??
    firstItem.version ??
    dataWrapper.api_version ??
    dataWrapper.version ??
    'unknown') as string
}

/* ---------------------------------------------------------------- */
/* LOGSTASH AUTH HEADERS                                              */
/* ---------------------------------------------------------------- */

/**
 * Builds optional basic auth headers for Logstash API requests.
 */
export function buildOptionalBasicAuthHeaders(
  config: Record<string, unknown>,
  basicAuthFunction: (username: string, password: string) => string
): Record<string, string> {
  const headers: Record<string, string> = {}
  const username = config.username as string | undefined
  const password = config.password as string | undefined
  if (username && password) {
    headers.Authorization = basicAuthFunction(username, password)
  }
  return headers
}

/* ---------------------------------------------------------------- */
/* MISP CONFIG EXTRACTION                                            */
/* ---------------------------------------------------------------- */

/**
 * Extracts the MISP base URL from config, preferring mispUrl over baseUrl.
 */
export function extractMispBaseUrl(config: Record<string, unknown>): string | undefined {
  return (config.mispUrl ?? config.baseUrl) as string | undefined
}

/**
 * Extracts the MISP auth key from config, supporting legacy field names.
 */
export function extractMispAuthKey(config: Record<string, unknown>): string | undefined {
  return (config.authKey ?? config.mispAuthKey ?? config.apiKey) as string | undefined
}

/* ---------------------------------------------------------------- */
/* SHUFFLE CONFIG EXTRACTION                                         */
/* ---------------------------------------------------------------- */

/**
 * Extracts the Shuffle base URL from config, preferring webhookUrl over baseUrl.
 */
export function extractShuffleBaseUrl(config: Record<string, unknown>): string | undefined {
  return (config.webhookUrl ?? config.baseUrl) as string | undefined
}

/**
 * Extracts the Shuffle API key from config, supporting legacy field name.
 */
export function extractShuffleApiKey(config: Record<string, unknown>): string | undefined {
  return (config.apiKey ?? config.shuffleApiKey) as string | undefined
}

/* ---------------------------------------------------------------- */
/* OPENSEARCH HIT TOTAL EXTRACTION                                   */
/* ---------------------------------------------------------------- */

/**
 * Extracts the total hit count from an OpenSearch/Elasticsearch response.
 * Handles both numeric and object `{ value: number }` formats.
 */
export function extractSearchTotal(totalObject: Record<string, unknown> | number): number {
  return typeof totalObject === 'number' ? totalObject : (totalObject.value as number)
}
