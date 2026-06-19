import { promises as dns } from 'node:dns'
import { NodeEnvironment, UrlProtocol } from '../enums'
import { PRIVATE_HOST_PATTERNS } from './ssrf.constants'
import { BusinessException } from '../exceptions/business.exception'

export function validateUrl(urlString: string, allowedHosts?: string[]): URL {
  let parsed: URL
  try {
    parsed = new URL(urlString)
  } catch {
    throw new BusinessException(400, 'Invalid URL format', 'errors.ssrf.invalidUrl')
  }

  // Only allow HTTPS in production
  if (
    parsed.protocol !== UrlProtocol.HTTPS &&
    parsed.protocol !== UrlProtocol.HTTP &&
    parsed.protocol !== UrlProtocol.WS &&
    parsed.protocol !== UrlProtocol.WSS
  ) {
    throw new BusinessException(
      400,
      'Only HTTP(S) and WS(S) URLs are allowed',
      'errors.ssrf.unsupportedProtocol'
    )
  }

  // Block private/internal IPs (skip in non-production for local testing)
  const isProduction = process.env.NODE_ENV === NodeEnvironment.PRODUCTION
  const { hostname } = parsed
  if (isProduction) {
    for (const pattern of PRIVATE_HOST_PATTERNS) {
      if (pattern.test(hostname)) {
        throw new BusinessException(
          400,
          'URLs pointing to private/internal networks are not allowed',
          'errors.ssrf.privateNetwork'
        )
      }
    }
  }

  // If allowlist provided, enforce it
  if (allowedHosts && allowedHosts.length > 0) {
    const isAllowed = allowedHosts.some(
      allowed => hostname === allowed || hostname.endsWith(`.${allowed}`)
    )
    if (!isAllowed) {
      throw new BusinessException(
        400,
        `Host '${hostname}' is not in the allowed list`,
        'errors.ssrf.hostNotAllowed'
      )
    }
  }

  return parsed
}

export function isPrivateHost(hostname: string): boolean {
  return PRIVATE_HOST_PATTERNS.some(pattern => pattern.test(hostname))
}

/**
 * DNS-aware SSRF defense: resolves the hostname to an IP address and validates
 * the resolved IP against the private IP blocklist. This prevents DNS rebinding
 * attacks where an attacker registers a domain that resolves to a private IP.
 *
 * In non-production environments, DNS resolution check is skipped to allow
 * local development with private network addresses.
 */
export async function resolveAndValidateUrl(
  urlString: string,
  allowedHosts?: string[]
): Promise<URL> {
  const url = validateUrl(urlString, allowedHosts)

  const isProduction = process.env.NODE_ENV === NodeEnvironment.PRODUCTION
  if (!isProduction) {
    return url
  }

  try {
    const { address } = await dns.lookup(url.hostname)
    if (isPrivateHost(address)) {
      throw new BusinessException(
        400,
        `Hostname '${url.hostname}' resolves to a private IP address`,
        'errors.connectors.ssrfBlocked'
      )
    }
  } catch (error: unknown) {
    if (error instanceof BusinessException) {
      throw error
    }
    // DNS resolution failure — block the request in production
    throw new BusinessException(
      400,
      `Failed to resolve hostname '${url.hostname}'`,
      'errors.connectors.dnsResolutionFailed'
    )
  }

  return url
}
