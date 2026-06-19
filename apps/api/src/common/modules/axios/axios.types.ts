import type { HttpMethod } from '../../enums'

export interface AxiosRequestOptions {
  method?: HttpMethod
  headers?: Record<string, string>
  body?: unknown
  timeoutMs?: number
  rejectUnauthorized?: boolean
  allowPrivateNetwork?: boolean
  clientCert?: string
  clientKey?: string
  caCert?: string
}

export interface AxiosResponseData {
  status: number
  data: unknown
  headers: Record<string, string>
  latencyMs: number
}

/** Options for methods that do not send a request body (GET, HEAD, OPTIONS). */
export type AxiosRequestOptionsWithoutBody = Omit<AxiosRequestOptions, 'method' | 'body'>

/** Options for methods that send a request body (POST, PUT, PATCH, DELETE). */
export type AxiosRequestOptionsWithBody = Omit<AxiosRequestOptions, 'method'>

export interface ResolvedFetchOptions {
  method: HttpMethod
  headers: Record<string, string>
  body: unknown
  timeoutMs: number
  rejectUnauthorized: boolean
  allowPrivateNetwork: boolean
  clientCert: string | undefined
  clientKey: string | undefined
  caCert: string | undefined
}
