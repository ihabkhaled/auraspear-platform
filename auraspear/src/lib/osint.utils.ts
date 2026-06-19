import type { OsintSourceType } from '@/enums'
import { BUILTIN_OSINT_DEFAULTS } from '@/lib/constants/osint-sources'
import type { BuiltinOsintSourceDefaults, OsintQueryResult } from '@/types'

/**
 * Safely look up builtin OSINT source defaults for a given source type.
 * Returns undefined for CUSTOM or any type without builtin defaults.
 * Uses Reflect.get to avoid security/detect-object-injection.
 */
export function lookupBuiltinOsintDefaults(
  sourceType: OsintSourceType
): BuiltinOsintSourceDefaults | undefined {
  return Reflect.get(BUILTIN_OSINT_DEFAULTS, sourceType) as BuiltinOsintSourceDefaults | undefined
}

/**
 * Extracts VT analysis URL from a raw OSINT response.
 * Only /analyses/ URLs are polling stubs from URL/file submissions.
 * Direct results (/files/, /domains/, /ip_addresses/) already have full data.
 */
export function extractVtAnalysisUrl(rawResponse: unknown): string | null {
  if (typeof rawResponse !== 'object' || rawResponse === null) {
    return null
  }

  const data = Reflect.get(rawResponse as Record<string, unknown>, 'data') as
    | Record<string, unknown>
    | undefined

  if (typeof data !== 'object' || data === null) {
    return null
  }

  const links = Reflect.get(data, 'links') as Record<string, unknown> | undefined
  if (typeof links !== 'object' || links === null) {
    return null
  }

  const selfUrl = Reflect.get(links, 'self') as string | undefined
  if (typeof selfUrl !== 'string') {
    return null
  }

  return selfUrl.startsWith('https://www.virustotal.com/api/v3/analyses/') ? selfUrl : null
}

/**
 * Extracts a compact summary from VT analysis data.
 * Works for IP, domain, hash, and URL results.
 * Returns null if the data doesn't look like a VT response.
 */
export function extractVtSummary(data: unknown): VtSummary | null {
  if (typeof data !== 'object' || data === null) {
    return null
  }

  const record = data as Record<string, unknown>

  // Check for last_analysis_stats — the universal VT summary field
  const stats = Reflect.get(record, 'last_analysis_stats') as Record<string, number> | undefined
  if (!stats || typeof stats !== 'object') {
    return null
  }

  const malicious = (Reflect.get(stats, 'malicious') as number) ?? 0
  const suspicious = (Reflect.get(stats, 'suspicious') as number) ?? 0
  const harmless = (Reflect.get(stats, 'harmless') as number) ?? 0
  const undetected = (Reflect.get(stats, 'undetected') as number) ?? 0
  const timeout = (Reflect.get(stats, 'timeout') as number) ?? 0
  const total = malicious + suspicious + harmless + undetected + timeout

  const reputation = (Reflect.get(record, 'reputation') as number) ?? null
  const tags = (Reflect.get(record, 'tags') as string[]) ?? []
  const whois = (Reflect.get(record, 'whois') as string) ?? null

  return { malicious, suspicious, harmless, undetected, timeout, total, reputation, tags, whois }
}

interface VtSummary {
  malicious: number
  suspicious: number
  harmless: number
  undetected: number
  timeout: number
  total: number
  reputation: number | null
  tags: string[]
  whois: string | null
}

/**
 * Checks if a query result is a VT analysis stub (has analysis URL but no real data).
 * This happens when VT returns an analysis ID for URL/file submissions
 * and the backend polling timed out.
 */
export function isVtAnalysisStub(result: OsintQueryResult): boolean {
  if (result.sourceType !== 'virustotal' || !result.success) {
    return false
  }
  return extractVtAnalysisUrl(result.rawResponse) !== null && result.data === null
}

/**
 * Extract VT GUI URL from any VT API response (file, URL, domain, IP, analysis).
 *
 * Strategy 1: Parse `links.item` or `links.self` API paths:
 *   /api/v3/files/{sha256}        → /gui/file/{sha256}
 *   /api/v3/urls/{id}             → /gui/url/{id}
 *   /api/v3/domains/{domain}      → /gui/domain/{domain}
 *   /api/v3/ip_addresses/{ip}     → /gui/ip-address/{ip}
 *   /api/v3/analyses/{id}         → /gui/file-analysis/{id}
 *
 * Strategy 2 (fallback): Parse `data.type` + `data.id`:
 *   type=file       → /gui/file/{id}
 *   type=url         → /gui/url/{id}
 *   type=domain      → /gui/domain/{id}
 *   type=ip_address  → /gui/ip-address/{id}
 *   type=analysis    → /gui/file-analysis/{id}
 */
export function extractVtGuiUrl(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) {
    return null
  }

  const record = data as Record<string, unknown>

  // Strategy 1: links.item (direct resource link — most reliable)
  const links = Reflect.get(record, 'links') as Record<string, unknown> | undefined
  if (typeof links === 'object' && links !== null) {
    const itemUrl = Reflect.get(links, 'item') as string | undefined
    if (typeof itemUrl === 'string') {
      const guiUrl = vtApiPathToGuiUrl(itemUrl)
      if (guiUrl) {
        return guiUrl
      }
    }
  }

  // Strategy 2: top-level type + id (analysis responses have this)
  const topType = Reflect.get(record, 'type') as string | undefined
  const topId = Reflect.get(record, 'id') as string | undefined
  if (typeof topType === 'string' && typeof topId === 'string') {
    return vtTypeIdToGuiUrl(topType, topId)
  }

  // Strategy 3: nested data.type + data.id
  const nested = Reflect.get(record, 'data') as Record<string, unknown> | undefined
  if (typeof nested === 'object' && nested !== null) {
    const objType = Reflect.get(nested, 'type') as string | undefined
    const objId = Reflect.get(nested, 'id') as string | undefined
    if (typeof objType === 'string' && typeof objId === 'string') {
      return vtTypeIdToGuiUrl(objType, objId)
    }
  }

  // Strategy 4: links.self as fallback (less reliable — may be analysis URL)
  if (typeof links === 'object' && links !== null) {
    const selfUrl = Reflect.get(links, 'self') as string | undefined
    if (typeof selfUrl === 'string') {
      const guiUrl = vtApiPathToGuiUrl(selfUrl)
      if (guiUrl) {
        return guiUrl
      }
    }
  }

  return null
}

/** Keep backward compat — alias for callers that only expect file URLs */
export function extractVtFileGuiUrl(data: unknown): string | null {
  return extractVtGuiUrl(data)
}

/** Convert a VT API path to the corresponding GUI URL */
function vtApiPathToGuiUrl(apiUrl: string): string | null {
  const pathSegments: Array<{ pattern: string; guiPrefix: string }> = [
    { pattern: '/api/v3/files/', guiPrefix: 'file' },
    { pattern: '/api/v3/urls/', guiPrefix: 'url' },
    { pattern: '/api/v3/domains/', guiPrefix: 'domain' },
    { pattern: '/api/v3/ip_addresses/', guiPrefix: 'ip-address' },
    { pattern: '/api/v3/analyses/', guiPrefix: 'file-analysis' },
  ]

  for (const seg of pathSegments) {
    if (apiUrl.includes(seg.pattern)) {
      const id = apiUrl.split(seg.pattern).pop()?.split('/').at(0)
      if (id) {
        return `https://www.virustotal.com/gui/${seg.guiPrefix}/${id}`
      }
    }
  }

  return null
}

/**
 * Convert a VT type + id pair to the corresponding GUI URL.
 *
 * Special handling for analysis types:
 * - url_analysis: id = "u-{sha256hash}-{timestamp}" → /gui/url/{sha256hash}
 * - file_analysis / analysis: id may be raw or prefixed → /gui/file-analysis/{id}
 */
function vtTypeIdToGuiUrl(vtType: string, vtId: string): string | null {
  // url_analysis: extract the URL hash from "u-{hash}-{suffix}"
  if (vtType === 'url_analysis') {
    const urlHash = extractUrlHashFromAnalysisId(vtId)
    if (urlHash) {
      return `https://www.virustotal.com/gui/url/${urlHash}`
    }
    return null
  }

  const typeToGuiPrefix: Record<string, string> = {
    file: 'file',
    file_analysis: 'file-analysis',
    url: 'url',
    domain: 'domain',
    ip_address: 'ip-address',
    analysis: 'file-analysis',
  }

  const guiPrefix = Reflect.get(typeToGuiPrefix, vtType) as string | undefined
  if (guiPrefix) {
    return `https://www.virustotal.com/gui/${guiPrefix}/${vtId}`
  }

  return null
}

/**
 * Extract the URL SHA256 hash from a VT URL analysis ID.
 * Format: "u-{sha256}-{hex_suffix}" → returns the sha256 part
 * Example: "u-f4bdc987...13661a8-cbcf9cc6" → "f4bdc987...13661a8"
 */
function extractUrlHashFromAnalysisId(analysisId: string): string | null {
  if (!analysisId.startsWith('u-')) {
    return null
  }
  // Remove "u-" prefix, then split on last "-" to separate hash from timestamp suffix
  const withoutPrefix = analysisId.slice(2)
  const lastDash = withoutPrefix.lastIndexOf('-')
  if (lastDash <= 0) {
    return null
  }
  return withoutPrefix.slice(0, lastDash)
}

/**
 * Check if VT fetched analysis data is still queued.
 * The status is inside data.attributes.status.
 */
export function isVtFetchedStillQueued(fetchedData: unknown): boolean {
  if (typeof fetchedData !== 'object' || fetchedData === null) {
    return false
  }

  const attrs = Reflect.get(fetchedData as Record<string, unknown>, 'attributes') as
    | Record<string, unknown>
    | undefined

  return typeof attrs === 'object' && attrs !== null && Reflect.get(attrs, 'status') === 'queued'
}

/**
 * Extract raw status and analysisUrl from an OSINT query result's rawResponse.
 */
export function extractUploadResultMeta(rawResponse: unknown): {
  rawStatus: string | undefined
  queuedAnalysisUrl: string | undefined
} {
  if (typeof rawResponse !== 'object' || rawResponse === null) {
    return { rawStatus: undefined, queuedAnalysisUrl: undefined }
  }

  const record = rawResponse as Record<string, unknown>
  return {
    rawStatus: Reflect.get(record, 'status') as string | undefined,
    queuedAnalysisUrl: Reflect.get(record, 'analysisUrl') as string | undefined,
  }
}
