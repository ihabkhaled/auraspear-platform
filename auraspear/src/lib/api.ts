import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { AUTH_STORAGE_KEY, TENANT_STORAGE_KEY } from '@/lib/constants/storage'
import { useAuthStore } from '@/stores'
import type {
  ApiRetryQueueItem,
  ApiRetryableRequest,
  AuthRequestState,
  AuthStorageState,
  RefreshResponse,
  TenantStorageState,
} from '@/types'

const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? '/api'
const REFRESH_TIMEOUT_MS = 10_000

let isRefreshing = false
let failedQueue: ApiRetryQueueItem[] = []

function getAuthState(): AuthRequestState {
  const empty = { accessToken: '', tenantId: '' }

  if (typeof window === 'undefined') {
    return empty
  }

  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) {
      return empty
    }

    const parsed = JSON.parse(raw) as AuthStorageState
    const accessToken = parsed.state?.accessToken ?? ''
    const authTenantId = parsed.state?.user?.tenantId ?? ''

    let tenantId = authTenantId
    try {
      const tenantRaw = localStorage.getItem(TENANT_STORAGE_KEY)
      if (tenantRaw) {
        const tenantParsed = JSON.parse(tenantRaw) as TenantStorageState
        const switchedTenantId = tenantParsed.state?.currentTenantId
        if (switchedTenantId) {
          tenantId = switchedTenantId
        }
      }
    } catch {
      // tenant storage corrupted - use auth tenant
    }

    return { accessToken, tenantId }
  } catch {
    return empty
  }
}

function updateStoredAccessToken(accessToken: string): void {
  if (typeof window === 'undefined') {
    return
  }

  useAuthStore.getState().setTokens(accessToken)
}

function getCsrfToken(): string {
  if (typeof document === 'undefined') {
    return ''
  }

  const cookies = document.cookie.split(';')
  for (const part of cookies) {
    const [key, ...valueParts] = part.trim().split('=')
    if (key === 'csrf_token') {
      return decodeURIComponent(valueParts.join('='))
    }
  }

  return ''
}

function clearAuthAndRedirect(): void {
  if (typeof window === 'undefined') {
    return
  }

  useAuthStore.getState().logout()
  localStorage.removeItem(AUTH_STORAGE_KEY)
  localStorage.removeItem(TENANT_STORAGE_KEY)
  window.location.href = '/login'
}

function processQueue(error: unknown, newAccessToken?: string): void {
  for (const item of failedQueue) {
    if (error) {
      item.reject(error)
    } else if (newAccessToken) {
      item.config.headers['Authorization'] = `Bearer ${newAccessToken}`
      item.resolve(item.config)
    }
  }

  failedQueue = []
}

function isAuthRoute(url?: string): boolean {
  if (!url) {
    return false
  }

  return url.includes('/auth/refresh') || url.includes('/auth/login')
}

async function attemptTokenRefresh(
  originalRequest: ApiRetryableRequest
): Promise<ApiRetryableRequest> {
  originalRequest._retry = true
  isRefreshing = true

  try {
    const csrfToken = getCsrfToken()
    const response = await axios.post<RefreshResponse>(
      `${API_BASE_URL}/auth/refresh`,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken.length > 0 ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        timeout: REFRESH_TIMEOUT_MS,
      }
    )

    const { accessToken: newAccessToken } = response.data
    updateStoredAccessToken(newAccessToken)

    originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`
    processQueue(null, newAccessToken)
    return originalRequest
  } catch (refreshError) {
    processQueue(refreshError)
    clearAuthAndRedirect()
    throw refreshError
  } finally {
    isRefreshing = false
  }
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(config => {
  if (typeof window !== 'undefined') {
    const { accessToken, tenantId } = getAuthState()

    if (tenantId) {
      config.headers['X-Tenant-Id'] = tenantId
    }

    if (accessToken) {
      config.headers['Authorization'] = `Bearer ${accessToken}`
    }

    const method = config.method?.toUpperCase()
    if (method && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      const csrfToken = getCsrfToken()
      if (csrfToken.length > 0) {
        config.headers['X-CSRF-Token'] = csrfToken
      }
    }
  }

  return config
})

api.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as ApiRetryableRequest | undefined

    if (!originalRequest || error.response?.status !== 401) {
      throw error
    }

    if (originalRequest._retry) {
      clearAuthAndRedirect()
      throw error
    }

    if (isAuthRoute(originalRequest.url)) {
      throw error
    }

    if (isRefreshing) {
      return new Promise<InternalAxiosRequestConfig>((resolve, reject) => {
        failedQueue.push({ resolve, reject, config: originalRequest })
      }).then(config => api(config))
    }

    const refreshedConfig = await attemptTokenRefresh(originalRequest)
    return api(refreshedConfig)
  }
)

export default api
