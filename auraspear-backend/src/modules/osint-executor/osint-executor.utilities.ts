import { OSINT_MAX_RESPONSE_DATA_LENGTH, VT_PATH_BASED_TYPES } from './osint-executor.constants'
import { HttpMethod, OsintAuthType, OsintIocType, OsintSourceType } from '../../common/enums'
import { toIso } from '../../common/utils/date-time.utility'
import type {
  OsintQueryResult,
  OsintRequestConfig,
  OsintSourceExecutionConfig,
} from './osint-executor.types'

/**
 * Builds the full request URL based on source type and IoC payload.
 * Each OSINT source type has its own URL pattern.
 */
export function buildOsintRequestUrl(
  source: OsintSourceExecutionConfig,
  iocType: string,
  iocValue: string
): string {
  const encodedValue = encodeURIComponent(iocValue)
  const baseUrl = source.baseUrl.replace(/\/+$/, '')

  switch (source.sourceType) {
    case OsintSourceType.VIRUSTOTAL:
      return buildVirusTotalUrl(baseUrl, iocType, encodedValue)

    case OsintSourceType.SHODAN:
      return `${baseUrl}/shodan/host/${encodedValue}`

    case OsintSourceType.ABUSEIPDB:
      return `${baseUrl}/check`

    case OsintSourceType.NVD_NIST:
      return baseUrl

    case OsintSourceType.ALIENVAULT_OTX:
      return buildAlienVaultOtxUrl(baseUrl, iocType, encodedValue)

    case OsintSourceType.GREYNOISE:
      return `${baseUrl}/community/${encodedValue}`

    case OsintSourceType.URLSCAN:
      return `${baseUrl}/search/`

    case OsintSourceType.CENSYS:
      return `${baseUrl}/hosts/${encodedValue}`

    case OsintSourceType.MALWARE_BAZAAR:
      return baseUrl

    case OsintSourceType.THREATFOX:
      return baseUrl

    case OsintSourceType.PULSEDIVE:
      return `${baseUrl}/info.php`

    case OsintSourceType.WEB_SEARCH:
      return baseUrl

    case OsintSourceType.CUSTOM:
      return baseUrl

    default:
      return baseUrl
  }
}

/**
 * Builds request headers based on the source's authentication type.
 * Adds Content-Type for form-urlencoded bodies (VT URL submission).
 */
export function buildOsintHeaders(
  source: OsintSourceExecutionConfig,
  iocType?: string
): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json' }

  // VT URL submission requires form-urlencoded content type
  if (source.sourceType === OsintSourceType.VIRUSTOTAL && iocType === OsintIocType.URL) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
  }

  switch (source.authType) {
    case OsintAuthType.API_KEY_HEADER:
      if (source.apiKey && source.headerName) {
        headers[source.headerName] = source.apiKey
      }
      break

    case OsintAuthType.BEARER:
      if (source.apiKey) {
        headers['Authorization'] = `Bearer ${source.apiKey}`
      }
      break

    case OsintAuthType.BASIC:
      if (source.apiKey) {
        headers['Authorization'] = `Basic ${Buffer.from(source.apiKey).toString('base64')}`
      }
      break

    case OsintAuthType.API_KEY_QUERY:
    case OsintAuthType.NONE:
      break
  }

  return headers
}

/**
 * Builds query parameters, including API key if auth type is query-based.
 */
export function buildOsintQueryParameters(
  source: OsintSourceExecutionConfig,
  iocType: string,
  iocValue: string
): Record<string, string> {
  const parameters: Record<string, string> = {}

  if (source.authType === OsintAuthType.API_KEY_QUERY && source.apiKey && source.queryParamName) {
    parameters[source.queryParamName] = source.apiKey
  }

  switch (source.sourceType) {
    case OsintSourceType.ABUSEIPDB:
      parameters['ipAddress'] = iocValue
      parameters['maxAgeInDays'] = '90'
      break

    case OsintSourceType.NVD_NIST:
      parameters['keywordSearch'] = iocValue
      break

    case OsintSourceType.URLSCAN:
      parameters['q'] = buildUrlScanQuery(iocType, iocValue)
      break

    case OsintSourceType.PULSEDIVE:
      parameters['indicator'] = iocValue
      break

    case OsintSourceType.WEB_SEARCH:
      parameters['q'] = iocValue
      break

    case OsintSourceType.VIRUSTOTAL:
      // IP, domain, hash variants, URL — value goes in the path, no query param needed.
      // All other types (CVE, file_name, file_path, cidr, email, asn, registry_key)
      // use /search or /intelligence/search with query= param.
      if (!isVtPathBasedLookup(iocType)) {
        parameters['query'] = iocValue
      }
      break
  }

  return parameters
}

/**
 * Builds the request body for POST-based OSINT sources.
 * Returns null for GET-based sources.
 * VT URL submission uses form-data (url=<raw_url>).
 */
export function buildOsintBody(
  source: OsintSourceExecutionConfig,
  iocType: string,
  iocValue: string
): Record<string, unknown> | string | null {
  switch (source.sourceType) {
    case OsintSourceType.MALWARE_BAZAAR:
      return { query: 'get_info', hash: iocValue }

    case OsintSourceType.THREATFOX:
      return { query: 'search_ioc', search_term: iocValue }

    case OsintSourceType.VIRUSTOTAL:
      // VT URL submission: POST /urls with x-www-form-urlencoded body
      if (iocType === OsintIocType.URL) {
        return `url=${encodeURIComponent(iocValue)}`
      }
      return null

    default:
      return null
  }
}

/**
 * Determines the HTTP method for the source.
 * Some sources (MalwareBazaar, ThreatFox) always use POST.
 * VirusTotal URL submissions require POST with form-data body.
 */
export function resolveOsintMethod(
  source: OsintSourceExecutionConfig,
  iocType?: string
): HttpMethod {
  switch (source.sourceType) {
    case OsintSourceType.MALWARE_BAZAAR:
    case OsintSourceType.THREATFOX:
      return HttpMethod.POST

    case OsintSourceType.VIRUSTOTAL:
      // VT URL submission requires POST /urls with form-data body
      if (iocType === OsintIocType.URL) {
        return HttpMethod.POST
      }
      return HttpMethod.GET

    default:
      return source.requestMethod === HttpMethod.POST ? HttpMethod.POST : HttpMethod.GET
  }
}

/**
 * Navigates a dot-separated path to extract data from a nested response object.
 * Example: extractResponseData(response, "data.attributes") returns response.data.attributes
 */
export function extractResponseData(response: unknown, responsePath: string | null): unknown {
  if (!responsePath || response === null || response === undefined) {
    return response
  }

  const parts = responsePath.split('.')
  let current: unknown = response

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return null
    }

    current = Reflect.get(current as Record<string, unknown>, part)
  }

  return current
}

/**
 * Builds the full request configuration (URL, headers, params, body, method)
 * for a given OSINT source and IoC payload.
 */
export function buildOsintRequest(
  source: OsintSourceExecutionConfig,
  iocType: string,
  iocValue: string
): OsintRequestConfig {
  const url = buildOsintRequestUrl(source, iocType, iocValue)
  const headers = buildOsintHeaders(source, iocType)
  const queryParameters = buildOsintQueryParameters(source, iocType, iocValue)
  const body = buildOsintBody(source, iocType, iocValue)
  const method = resolveOsintMethod(source, iocType)

  return { url, headers, queryParameters, body, method }
}

/**
 * Appends query parameters to a URL string.
 */
export function appendQueryParameters(baseUrl: string, parameters: Record<string, string>): string {
  const entries = Object.entries(parameters)
  if (entries.length === 0) {
    return baseUrl
  }

  const separator = baseUrl.includes('?') ? '&' : '?'
  const queryString = entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&')

  return `${baseUrl}${separator}${queryString}`
}

/**
 * Builds the execution config from a raw OSINT source record and decrypted API key.
 */
export function buildExecutionConfig(
  source: {
    id: string
    sourceType: string
    name: string
    baseUrl: string | null
    authType: string
    headerName: string | null
    queryParamName: string | null
    responsePath: string | null
    requestMethod: string
    timeout: number
  },
  decryptedApiKey: string | null
): OsintSourceExecutionConfig {
  return {
    id: source.id,
    sourceType: source.sourceType,
    name: source.name,
    baseUrl: source.baseUrl ?? '',
    authType: source.authType,
    apiKey: decryptedApiKey,
    headerName: source.headerName,
    queryParamName: source.queryParamName,
    responsePath: source.responsePath,
    requestMethod: source.requestMethod,
    timeout: source.timeout,
  }
}

/**
 * Determines the best IoC type to use for testing a given OSINT source type.
 */
export function resolveTestIocType(sourceType: string): OsintIocType {
  switch (sourceType) {
    case OsintSourceType.VIRUSTOTAL:
    case OsintSourceType.MALWARE_BAZAAR:
      return OsintIocType.HASH

    case OsintSourceType.SHODAN:
    case OsintSourceType.ABUSEIPDB:
    case OsintSourceType.GREYNOISE:
    case OsintSourceType.CENSYS:
      return OsintIocType.IP

    case OsintSourceType.URLSCAN:
    case OsintSourceType.ALIENVAULT_OTX:
    case OsintSourceType.PULSEDIVE:
      return OsintIocType.DOMAIN

    case OsintSourceType.NVD_NIST:
      return OsintIocType.CVE

    case OsintSourceType.THREATFOX:
    case OsintSourceType.WEB_SEARCH:
    case OsintSourceType.CUSTOM:
      return OsintIocType.IP

    default:
      return OsintIocType.IP
  }
}

/**
 * Builds a failed query result with error information.
 */
export function buildFailedQueryResult(
  sourceId: string,
  sourceName: string,
  sourceType: string,
  errorMessage: string,
  responseTimeMs: number
): OsintQueryResult {
  return {
    sourceId,
    sourceName,
    sourceType,
    success: false,
    data: null,
    rawResponse: null,
    error: errorMessage,
    statusCode: null,
    messageKey: resolveErrorMessageKey(errorMessage),
    responseTimeMs,
    queriedAt: toIso(),
  }
}

/**
 * Truncates response data to prevent excessive storage.
 */
export function truncateResponseData(data: unknown): unknown {
  if (typeof data === 'string' && data.length > OSINT_MAX_RESPONSE_DATA_LENGTH) {
    return data.slice(0, OSINT_MAX_RESPONSE_DATA_LENGTH)
  }

  return data
}

// ─── Private Helpers ──────────────────────────────────────────

function buildVirusTotalUrl(baseUrl: string, iocType: string, encodedValue: string): string {
  switch (iocType) {
    // Direct lookups — GET with value in path
    case OsintIocType.IP:
      return `${baseUrl}/ip_addresses/${encodedValue}`
    case OsintIocType.DOMAIN:
      return `${baseUrl}/domains/${encodedValue}`
    case OsintIocType.HASH:
    case OsintIocType.MD5:
    case OsintIocType.SHA1:
    case OsintIocType.SHA256:
      return `${baseUrl}/files/${encodedValue}`

    // URL submission — POST with form body (url= in body, not path)
    case OsintIocType.URL:
      return `${baseUrl}/urls`

    // Premium intelligence search — query param added via buildOsintQueryParameters
    case OsintIocType.FILE_NAME:
    case OsintIocType.FILE_PATH:
    case OsintIocType.CIDR:
    case OsintIocType.EMAIL:
    case OsintIocType.ASN:
    case OsintIocType.CVE:
    case OsintIocType.REGISTRY_KEY:
      return `${baseUrl}/intelligence/search`

    // Fallback — public search
    default:
      return `${baseUrl}/search`
  }
}

function buildAlienVaultOtxUrl(baseUrl: string, iocType: string, encodedValue: string): string {
  switch (iocType) {
    case OsintIocType.IP:
      return `${baseUrl}/indicators/IPv4/${encodedValue}/general`
    case OsintIocType.DOMAIN:
      return `${baseUrl}/indicators/domain/${encodedValue}/general`
    case OsintIocType.HASH:
      return `${baseUrl}/indicators/file/${encodedValue}/general`
    case OsintIocType.URL:
      return `${baseUrl}/indicators/url/${encodedValue}/general`
    case OsintIocType.CVE:
      return `${baseUrl}/indicators/cve/${encodedValue}/general`
    default:
      return `${baseUrl}/indicators/IPv4/${encodedValue}/general`
  }
}

function buildUrlScanQuery(iocType: string, iocValue: string): string {
  switch (iocType) {
    case OsintIocType.DOMAIN:
      return `domain:${iocValue}`
    case OsintIocType.IP:
      return `ip:${iocValue}`
    case OsintIocType.URL:
      return `page.url:"${iocValue}"`
    default:
      return iocValue
  }
}

function isVtPathBasedLookup(iocType: string): boolean {
  return VT_PATH_BASED_TYPES.has(iocType)
}

/**
 * Maps HTTP status codes to specific OSINT error messageKeys.
 */
export function resolveHttpErrorMessageKey(statusCode: number): string {
  if (statusCode === 401) return 'errors.osint.authFailed'
  if (statusCode === 403) return 'errors.osint.forbidden'
  if (statusCode === 404) return 'errors.osint.notFound'
  if (statusCode === 429) return 'errors.osint.rateLimitExceeded'
  if (statusCode >= 500 && statusCode < 600) return 'errors.osint.serverError'
  if (statusCode === 400) return 'errors.osint.badRequest'
  return 'errors.osint.queryFailed'
}

/**
 * Resolves a messageKey from an error message string (fallback when no status code).
 */
export function resolveErrorMessageKey(errorMessage: string): string {
  const lower = errorMessage.toLowerCase()
  if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('etimedout')) {
    return 'errors.osint.timeout'
  }
  if (lower.includes('econnrefused') || lower.includes('enotfound')) {
    return 'errors.osint.unreachable'
  }
  if (lower.includes('rate limit')) {
    return 'errors.osint.rateLimitExceeded'
  }
  if (lower.includes('parse') || lower.includes('json')) {
    return 'errors.osint.parseError'
  }
  if (lower.includes('decrypt') || lower.includes('api key')) {
    return 'errors.osint.authFailed'
  }
  return 'errors.osint.queryFailed'
}

/**
 * Extract a human-readable error detail and specific messageKey from an OSINT API error response body.
 *
 * Supports:
 * - VirusTotal: { error: { code: "NotFoundError", message: "Domain ... not found" } }
 * - VirusTotal: { error: { code: "InvalidArgumentError", message: "Domain ... is not valid" } }
 * - Generic: { error: "some string" }
 * - Generic: { message: "some string" }
 * - Generic: { detail: "some string" }
 */
export function extractSourceErrorDetail(responseData: unknown): {
  detail: string | null
  messageKey: string | null
} {
  if (typeof responseData !== 'object' || responseData === null) {
    return { detail: null, messageKey: null }
  }

  const record = responseData as Record<string, unknown>

  // VT format: { error: { code, message } }
  const errorObject = Reflect.get(record, 'error') as Record<string, unknown> | string | undefined
  if (typeof errorObject === 'object' && errorObject !== null) {
    const code = Reflect.get(errorObject, 'code') as string | undefined
    const message = Reflect.get(errorObject, 'message') as string | undefined

    if (typeof message === 'string') {
      const messageKey = resolveSourceErrorCodeKey(code ?? '')
      return { detail: message, messageKey }
    }
  }

  // Generic: { error: "string" }
  if (typeof errorObject === 'string') {
    return { detail: errorObject, messageKey: null }
  }

  // Generic: { message: "string" }
  const message = Reflect.get(record, 'message') as string | undefined
  if (typeof message === 'string') {
    return { detail: message, messageKey: null }
  }

  // Generic: { detail: "string" }
  const dtl = Reflect.get(record, 'detail') as string | undefined
  if (typeof dtl === 'string') {
    return { detail: dtl, messageKey: null }
  }

  return { detail: null, messageKey: null }
}

/**
 * Map known OSINT source error codes to specific messageKeys.
 */
function resolveSourceErrorCodeKey(code: string): string | null {
  switch (code) {
    case 'NotFoundError':
      return 'errors.osint.resourceNotFound'
    case 'InvalidArgumentError':
      return 'errors.osint.invalidArgument'
    case 'AuthenticationRequiredError':
      return 'errors.osint.authRequired'
    case 'ForbiddenError':
      return 'errors.osint.forbidden'
    case 'QuotaExceededError':
      return 'errors.osint.quotaExceeded'
    case 'TooManyRequestsError':
      return 'errors.osint.rateLimitExceeded'
    case 'WrongCredentialsError':
      return 'errors.osint.wrongCredentials'
    case 'BadRequestError':
      return 'errors.osint.badRequest'
    default:
      return null
  }
}

/* ---------------------------------------------------------------- */
/* HEADER REDACTION                                                   */
/* ---------------------------------------------------------------- */

/**
 * Redacts sensitive header values (API keys, auth tokens) for safe logging.
 */
export function redactSensitiveHeaders(headers: Record<string, string>): Record<string, string> {
  const safeHeaders = { ...headers }
  for (const key of Object.keys(safeHeaders)) {
    if (
      key.toLowerCase().includes('key') ||
      key.toLowerCase().includes('auth') ||
      key.toLowerCase() === 'authorization'
    ) {
      Reflect.set(safeHeaders, key, '***REDACTED***')
    }
  }
  return safeHeaders
}

/* ---------------------------------------------------------------- */
/* VT ANALYSIS URL EXTRACTION                                        */
/* ---------------------------------------------------------------- */

/**
 * Extracts the VT analysis URL from a VT URL/file submission response.
 * Only matches analysis stubs where data.links.self points to /analyses/.
 */
export function extractVtAnalysisUrl(responseData: unknown): string | null {
  if (typeof responseData !== 'object' || responseData === null) {
    return null
  }

  const data = Reflect.get(responseData as Record<string, unknown>, 'data')
  if (typeof data !== 'object' || data === null) {
    return null
  }

  const links = Reflect.get(data as Record<string, unknown>, 'links')
  if (typeof links !== 'object' || links === null) {
    return null
  }

  const selfUrl = Reflect.get(links as Record<string, unknown>, 'self')
  if (typeof selfUrl !== 'string') {
    return null
  }

  return selfUrl.startsWith('https://www.virustotal.com/api/v3/analyses/') ? selfUrl : null
}

/* ---------------------------------------------------------------- */
/* VT ANALYSIS URL ATTACHMENT                                        */
/* ---------------------------------------------------------------- */

/**
 * Attaches a VT analysis URL to the response data if the response is still queued.
 */
export function attachVtAnalysisUrl(
  finalData: unknown,
  sourceType: string,
  analysisUrl: string | null
): void {
  if (sourceType !== 'virustotal' || !analysisUrl) return

  const isStillQueued =
    typeof finalData === 'object' &&
    finalData !== null &&
    (Reflect.get(finalData as Record<string, unknown>, 'status') === 'queued' || analysisUrl)

  if (isStillQueued) {
    ;(finalData as Record<string, unknown>)['analysisUrl'] = analysisUrl
  }
}

/* ---------------------------------------------------------------- */
/* QUERY RESULT BUILDERS                                             */
/* ---------------------------------------------------------------- */

/**
 * Builds a successful query result from response data.
 */
export function buildSuccessQueryResult(
  sourceId: string,
  sourceName: string,
  sourceType: string,
  data: unknown,
  rawResponse: unknown,
  statusCode: number,
  responseTimeMs: number
): OsintQueryResult {
  return {
    sourceId,
    sourceName,
    sourceType,
    success: true,
    data: truncateResponseData(data),
    rawResponse: truncateResponseData(rawResponse),
    error: null,
    statusCode,
    messageKey: null,
    responseTimeMs,
    queriedAt: toIso(),
  }
}

/**
 * Builds an error query result from a caught error.
 */
export function buildErrorQueryResult(
  sourceId: string,
  sourceName: string,
  sourceType: string,
  error: unknown,
  responseTimeMs: number
): OsintQueryResult {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error'
  const statusCode = (error as { statusCode?: number }).statusCode ?? null
  const messageKey =
    (error as { messageKey?: string }).messageKey ?? resolveErrorMessageKey(errorMessage)

  return {
    sourceId,
    sourceName,
    sourceType,
    success: false,
    data: null,
    rawResponse: null,
    error: errorMessage,
    statusCode,
    messageKey,
    responseTimeMs,
    queriedAt: toIso(),
  }
}

/* ---------------------------------------------------------------- */
/* VT POLL STATUS EXTRACTION                                         */
/* ---------------------------------------------------------------- */

/**
 * Extracts the VT analysis status from a poll response.
 */
export function extractVtPollStatus(responseData: unknown): string | undefined {
  const data = Reflect.get((responseData as Record<string, unknown>) ?? {}, 'data') as
    | Record<string, unknown>
    | undefined

  const attributes = data
    ? (Reflect.get(data, 'attributes') as Record<string, unknown> | undefined)
    : undefined

  return attributes ? (Reflect.get(attributes, 'status') as string | undefined) : undefined
}
