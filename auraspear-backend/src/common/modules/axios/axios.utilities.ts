import * as https from 'node:https'
import { DEFAULT_TIMEOUT_MS, MAX_RESPONSE_BYTES } from './axios.constants'
import { HttpMethod } from '../../enums'
import type { AxiosRequestOptions, ResolvedFetchOptions } from './axios.types'
import type { AxiosRequestConfig } from 'axios'

export function resolveFetchOptions(
  options: AxiosRequestOptions,
  isProduction: boolean
): ResolvedFetchOptions {
  const {
    method = HttpMethod.GET,
    headers = {},
    body,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    rejectUnauthorized: callerRejectUnauthorized = isProduction,
    allowPrivateNetwork = false,
    clientCert,
    clientKey,
    caCert,
  } = options

  const rejectUnauthorized = isProduction ? callerRejectUnauthorized : false

  return {
    method,
    headers,
    body,
    timeoutMs,
    rejectUnauthorized,
    allowPrivateNetwork,
    clientCert,
    clientKey,
    caCert,
  }
}

export function buildHttpsAgent(
  isHttps: boolean,
  resolved: ResolvedFetchOptions
): https.Agent | undefined {
  if (!isHttps) {
    return undefined
  }

  return new https.Agent({
    rejectUnauthorized: resolved.rejectUnauthorized,
    ...(resolved.clientCert ? { cert: resolved.clientCert } : {}),
    ...(resolved.clientKey ? { key: resolved.clientKey } : {}),
    ...(resolved.caCert ? { ca: resolved.caCert } : {}),
  })
}

export function buildAxiosRequestConfig(
  url: string,
  resolved: ResolvedFetchOptions,
  httpsAgent: https.Agent | undefined
): AxiosRequestConfig {
  return {
    url,
    method: resolved.method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...resolved.headers,
    },
    data: resolved.body,
    timeout: resolved.timeoutMs,
    maxContentLength: MAX_RESPONSE_BYTES,
    maxBodyLength: MAX_RESPONSE_BYTES,
    validateStatus: () => true,
    responseType: 'text',
    transformResponse: (rawData: string) => rawData,
    ...(httpsAgent ? { httpsAgent } : {}),
  }
}

export function parseResponseHeaders(headers: Record<string, unknown>): Record<string, string> {
  const responseHeaders = new Map<string, string>()
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === 'string') {
      responseHeaders.set(key, value)
    }
  }
  return Object.fromEntries(responseHeaders)
}

export function parseResponseBody(data: unknown): unknown {
  const rawBody = typeof data === 'string' ? data : String(data ?? '')

  try {
    return JSON.parse(rawBody)
  } catch {
    return rawBody
  }
}
