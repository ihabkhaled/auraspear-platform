import type { InternalAxiosRequestConfig } from 'axios'

export interface AuthRequestState {
  accessToken: string
  tenantId: string
}

export interface ApiRetryableRequest extends InternalAxiosRequestConfig {
  _retry?: boolean
}

export interface ApiRetryQueueItem {
  resolve: (value: InternalAxiosRequestConfig) => void
  reject: (error: unknown) => void
  config: InternalAxiosRequestConfig
}
