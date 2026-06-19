import { promises as dns } from 'node:dns'
import { Injectable, Logger } from '@nestjs/common'
import axios from 'axios'
import {
  resolveFetchOptions,
  buildHttpsAgent,
  buildAxiosRequestConfig,
  parseResponseHeaders,
  parseResponseBody,
} from './axios.utilities'
import { HttpMethod, NodeEnvironment, UrlProtocol } from '../../enums'
import { nowMs, elapsedMs } from '../../utils/date-time.utility'
import { isPrivateHost } from '../../utils/ssrf.utility'
import type {
  AxiosRequestOptions,
  AxiosRequestOptionsWithBody,
  AxiosRequestOptionsWithoutBody,
  AxiosResponseData,
} from './axios.types'

@Injectable()
export class AxiosService {
  private readonly logger = new Logger(AxiosService.name)

  /* ---------------------------------------------------------------- */
  /* CORE REQUEST METHOD                                               */
  /* ---------------------------------------------------------------- */

  async fetch(url: string, options: AxiosRequestOptions = {}): Promise<AxiosResponseData> {
    const isProduction = process.env.NODE_ENV === NodeEnvironment.PRODUCTION
    const resolved = resolveFetchOptions(options, isProduction)

    const parsed = this.validateUrl(url, isProduction, resolved.allowPrivateNetwork)
    await this.validateDns(parsed, isProduction, resolved.allowPrivateNetwork)

    const isHttps = parsed.protocol === UrlProtocol.HTTPS
    this.warnIfTlsDisabled(isHttps, resolved.rejectUnauthorized, parsed.hostname)

    const httpsAgent = buildHttpsAgent(isHttps, resolved)
    const requestConfig = buildAxiosRequestConfig(url, resolved, httpsAgent)

    const start = nowMs()
    const response = await axios.request(requestConfig)
    const latencyMs = elapsedMs(start)

    return {
      status: response.status,
      data: parseResponseBody(response.data),
      headers: parseResponseHeaders(response.headers as Record<string, unknown>),
      latencyMs,
    }
  }

  /* ---------------------------------------------------------------- */
  /* CONVENIENCE METHODS — NO BODY                                     */
  /* ---------------------------------------------------------------- */

  async get(url: string, options: AxiosRequestOptionsWithoutBody = {}): Promise<AxiosResponseData> {
    return this.fetch(url, { ...options, method: HttpMethod.GET })
  }

  async head(
    url: string,
    options: AxiosRequestOptionsWithoutBody = {}
  ): Promise<AxiosResponseData> {
    return this.fetch(url, { ...options, method: HttpMethod.HEAD })
  }

  async options(
    url: string,
    options: AxiosRequestOptionsWithoutBody = {}
  ): Promise<AxiosResponseData> {
    return this.fetch(url, { ...options, method: HttpMethod.OPTIONS })
  }

  /* ---------------------------------------------------------------- */
  /* CONVENIENCE METHODS — WITH BODY                                   */
  /* ---------------------------------------------------------------- */

  async post(
    url: string,
    body: unknown,
    options: AxiosRequestOptionsWithBody = {}
  ): Promise<AxiosResponseData> {
    return this.fetch(url, { ...options, method: HttpMethod.POST, body })
  }

  async put(
    url: string,
    body: unknown,
    options: AxiosRequestOptionsWithBody = {}
  ): Promise<AxiosResponseData> {
    return this.fetch(url, { ...options, method: HttpMethod.PUT, body })
  }

  async patch(
    url: string,
    body: unknown,
    options: AxiosRequestOptionsWithBody = {}
  ): Promise<AxiosResponseData> {
    return this.fetch(url, { ...options, method: HttpMethod.PATCH, body })
  }

  async remove(
    url: string,
    body?: unknown,
    options: AxiosRequestOptionsWithBody = {}
  ): Promise<AxiosResponseData> {
    return this.fetch(url, { ...options, method: HttpMethod.DELETE, body })
  }

  /* ---------------------------------------------------------------- */
  /* AUTHENTICATION HELPERS                                            */
  /* ---------------------------------------------------------------- */

  basicAuth(username: string, password: string): string {
    return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE — VALIDATION                                              */
  /* ---------------------------------------------------------------- */

  private warnIfTlsDisabled(isHttps: boolean, rejectUnauthorized: boolean, hostname: string): void {
    if (isHttps && !rejectUnauthorized) {
      this.logger.warn(`TLS verification disabled for ${hostname}`)
    }
  }

  private validateUrl(url: string, isProduction: boolean, allowPrivateNetwork: boolean): URL {
    const parsed = new URL(url)

    const allowedProtocols = new Set([
      UrlProtocol.HTTPS,
      UrlProtocol.HTTP,
      UrlProtocol.WS,
      UrlProtocol.WSS,
    ])
    if (!allowedProtocols.has(parsed.protocol as UrlProtocol)) {
      throw new Error('Only HTTP(S) and WS(S) URLs are allowed')
    }

    const secureProtocols = new Set([UrlProtocol.HTTPS, UrlProtocol.WSS])
    if (isProduction && !secureProtocols.has(parsed.protocol as UrlProtocol)) {
      throw new Error('Only HTTPS/WSS URLs are allowed in production')
    }

    if (isProduction && !allowPrivateNetwork && isPrivateHost(parsed.hostname)) {
      throw new Error('URLs pointing to private/internal networks are not allowed')
    }

    return parsed
  }

  private async validateDns(
    parsed: URL,
    isProduction: boolean,
    allowPrivateNetwork: boolean
  ): Promise<void> {
    if (!isProduction || allowPrivateNetwork) return

    try {
      const { address } = await dns.lookup(parsed.hostname)
      if (isPrivateHost(address)) {
        throw new Error(
          `Hostname '${parsed.hostname}' resolves to a private IP address (SSRF blocked)`
        )
      }
    } catch (dnsError: unknown) {
      if (dnsError instanceof Error && dnsError.message.includes('SSRF blocked')) {
        throw dnsError
      }

      throw new Error(
        `DNS resolution failed for '${parsed.hostname}': ${dnsError instanceof Error ? dnsError.message : 'unknown error'}`
      )
    }
  }
}
