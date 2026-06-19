import { OsintIocType } from '../../common/enums'

/** Maximum number of concurrent OSINT source queries per enrichment request */
export const OSINT_CONCURRENCY_LIMIT = 3

/** Maximum number of sources allowed per single enrichment request */
export const OSINT_MAX_SOURCES_PER_ENRICHMENT = 10

/** Safe test IoC values per IoC type, used for source connectivity testing */
export const OSINT_TEST_IOC_VALUES: Record<OsintIocType, string> = {
  [OsintIocType.IP]: '8.8.8.8',
  [OsintIocType.DOMAIN]: 'google.com',
  [OsintIocType.HASH]: '275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f',
  [OsintIocType.MD5]: '098f6bcd4621d373cade4e832627b4f6',
  [OsintIocType.SHA1]: 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3',
  [OsintIocType.SHA256]: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
  [OsintIocType.URL]: 'https://google.com',
  [OsintIocType.CVE]: 'CVE-2021-44228',
  [OsintIocType.FILE_NAME]: 'test.exe',
  [OsintIocType.FILE_PATH]: '/var/tmp/.cache/miner',
  [OsintIocType.CIDR]: '192.168.1.0/24',
  [OsintIocType.EMAIL]: 'test@example.com',
  [OsintIocType.ASN]: 'AS15169',
  [OsintIocType.REGISTRY_KEY]: 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run',
}

/** Default IoC type used for testing when source type doesn't map to a specific IoC */
export const OSINT_DEFAULT_TEST_IOC_TYPE = OsintIocType.IP

/** Maximum response data size to store (characters) */
export const OSINT_MAX_RESPONSE_DATA_LENGTH = 50_000

/** Default rate limit: 10 queries per minute per source */
export const DEFAULT_RATE_LIMIT_PER_MINUTE = 10

/** Rate limit window in milliseconds */
export const RATE_LIMIT_WINDOW_MS = 60_000

/** Maximum retries for transient errors (429, 5xx) */
export const MAX_RETRIES = 2

/** Base backoff in milliseconds (doubles each retry) */
export const BASE_BACKOFF_MS = 1_000

/**
 * VT path-based lookup types — value goes in the URL path, no query param.
 * All other types use ?query= parameter.
 */
export const VT_PATH_BASED_TYPES = new Set<string>([
  OsintIocType.IP,
  OsintIocType.DOMAIN,
  OsintIocType.HASH,
  OsintIocType.MD5,
  OsintIocType.SHA1,
  OsintIocType.SHA256,
  OsintIocType.URL,
])
