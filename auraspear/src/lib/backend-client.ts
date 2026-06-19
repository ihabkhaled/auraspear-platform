import axios from 'axios'
import type { AxiosRequestConfig, AxiosResponse } from 'axios'

const BACKEND_URL = process.env['BACKEND_API_URL'] ?? 'http://localhost:4000/api/v1'
const DEFAULT_TIMEOUT_MS = 120_000
const MAX_CONTENT_LENGTH = 50 * 1024 * 1024

/**
 * Server-side axios instance for proxying requests to the NestJS backend.
 * This is NOT the client-side `api.ts` instance — it has no auth interceptors,
 * no browser-specific logic, and points directly at the backend URL.
 *
 * Used exclusively by backend-proxy.ts in Next.js API routes.
 */
const instance = axios.create({
  baseURL: BACKEND_URL,
  timeout: DEFAULT_TIMEOUT_MS,
  validateStatus: () => true,
  maxContentLength: MAX_CONTENT_LENGTH,
  maxBodyLength: MAX_CONTENT_LENGTH,
})

/**
 * Send a request to the backend.
 * Accepts full AxiosRequestConfig — any option passed here overrides the defaults.
 * Pass `timeout` to override the default 30s for long-running requests (e.g., AI).
 */
async function request<T = unknown>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  return instance.request<T>(config)
}

export const backendClient = { request, instance }
export { BACKEND_URL, DEFAULT_TIMEOUT_MS }
