import type { OpenClawFrameType } from '../../common/enums'
import type { AxiosRequestOptions } from '../../common/modules/axios'

export interface ConnectorResponse {
  type: string
  name: string
  enabled: boolean
  authType: string
  config: Record<string, unknown>
  lastTestAt: Date | null
  lastTestOk: boolean | null
  lastError: string | null
}

export interface ConnectorRow {
  type: string
  name: string
  enabled: boolean
  authType: string
  encryptedConfig: string
  lastTestAt: Date | null
  lastTestOk: boolean | null
  lastError: string | null
}

export interface ConnectorStats {
  totalConnectors: number
  enabledConnectors: number
  healthyConnectors: number
  failingConnectors: number
  untestedConnectors: number
}

export interface ConnectorTestable {
  testConnection(config: Record<string, unknown>): Promise<{ ok: boolean; details: string }>
}

/** Base test result returned by individual connector adapters. */
export interface TestResult {
  ok: boolean
  details: string
}

/** Extended test result returned by ConnectorsService.testConnection(). */
export interface ConnectorTestResult extends TestResult {
  type: string
  latencyMs: number
  testedAt: string
}

/** Parameters for the recursive scroll collection helper in WazuhService. */
export interface ScrollCollectionParameters {
  indexerUrl: string
  authHeader: string
  tlsOption: boolean
  scrollId: string | undefined
  allHits: unknown[]
  total: number
  maxEvents: number
}

export interface WazuhTokenCache {
  token: string
  expiresAt: number
}

export interface VelociraptorAuthOptions {
  headers: Record<string, string>
  httpOptions: Partial<AxiosRequestOptions>
}

/* ---------------------------------------------------------------- */
/* LLM APIs (OpenAI-compatible)                                      */
/* ---------------------------------------------------------------- */

export interface ChatCompletionContentBlock {
  type: string
  text?: string
}

export interface ChatCompletionMessage {
  role: string
  content: string | ChatCompletionContentBlock[]
}

export interface ChatCompletionChoice {
  index: number
  message: ChatCompletionMessage
  finish_reason: string
}

export interface ChatCompletionUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

export interface ChatCompletionResponse {
  id: string
  object: string
  choices: ChatCompletionChoice[]
  usage: ChatCompletionUsage
}

export interface ModelEntry {
  id: string
  object: string
}

export interface ModelsListResponse {
  data: ModelEntry[]
  object: string
}

/* ---------------------------------------------------------------- */
/* OpenClaw Gateway (WebSocket-based)                                */
/* ---------------------------------------------------------------- */

export interface OpenClawWsEvent {
  type: OpenClawFrameType.EVENT
  event: string
  payload: Record<string, unknown>
}

export interface OpenClawWsResponse {
  type: OpenClawFrameType.RES
  id: string
  ok: boolean
  payload?: Record<string, unknown>
  error?: string
}

export interface OpenClawWsRequest {
  type: OpenClawFrameType.REQ
  id: string
  method: string
  params?: Record<string, unknown>
}

export interface OpenClawChatMessageContent {
  type: string
  text: string
}

export interface OpenClawChatMessage {
  role: string
  content: OpenClawChatMessageContent[]
}

export interface OpenClawChatEventPayload {
  state: string
  message?: OpenClawChatMessage
  runId?: string
}

export type OpenClawWsIncoming = OpenClawWsEvent | OpenClawWsResponse

/* ---------------------------------------------------------------- */
/* Connector Test Utilities                                          */
/* ---------------------------------------------------------------- */

/** Parameters for building LLM API request headers. */
export interface LlmApiHeaders {
  apiKey: string
  organizationId?: string
}

/** Extracted Bedrock config fields. */
export interface BedrockConfigFields {
  region: string
  accessKeyId: string | undefined
  secretAccessKey: string | undefined
  modelId: string
  endpoint: string | undefined
}

/** Result from Bedrock model invocation. */
export interface BedrockInvokeResult {
  text: string
  inputTokens: number
  outputTokens: number
}

/** AWS SDK types for dynamic import. */
export interface AwsSdkTypes {
  BedrockRuntimeClient: new (config: unknown) => {
    send: (command: unknown) => Promise<{ body: Uint8Array }>
  }
  InvokeModelCommand: new (input: unknown) => unknown
}

/** Fields extracted from an LLM connector DTO for update. */
export interface LlmConnectorUpdateFields {
  name?: string
  description?: string | null
  baseUrl?: string
  encryptedApiKey?: string
  defaultModel?: string | null
  organizationId?: string | null
  maxTokensParam?: string
  timeout?: number
  enabled?: boolean
}

/** Wazuh version extraction input. */
export interface WazuhManagerInfoData {
  data?: Record<string, unknown>
  [key: string]: unknown
}

export type BedrockClient = InstanceType<AwsSdkTypes['BedrockRuntimeClient']>
