export interface OsintQueryResult {
  sourceId: string
  sourceName: string
  sourceType: string
  success: boolean
  data: unknown
  rawResponse: unknown
  error: string | null
  statusCode: number | null
  messageKey: string | null
  responseTimeMs: number
  queriedAt: string
}

export interface OsintEnrichmentResult {
  iocType: string
  iocValue: string
  results: OsintQueryResult[]
  totalSources: number
  successCount: number
  failureCount: number
  enrichedAt: string
}

export interface OsintSourceExecutionConfig {
  id: string
  sourceType: string
  name: string
  baseUrl: string
  authType: string
  apiKey: string | null
  headerName: string | null
  queryParamName: string | null
  responsePath: string | null
  requestMethod: string
  timeout: number
}

export interface OsintRequestConfig {
  url: string
  headers: Record<string, string>
  queryParameters: Record<string, string>
  body: Record<string, unknown> | string | null
  method: string
}
