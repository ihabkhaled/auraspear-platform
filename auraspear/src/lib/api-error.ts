import { ErrorMessageKey } from '@/enums'
import { PermissionError } from '@/lib/roles'
import type { ApiErrorResponse } from '@/types'
import type { AxiosError } from 'axios'

const ERROR_PREFIX = 'errors.'
const DEFAULT_ERROR_KEY = ErrorMessageKey.COMMON_UNKNOWN.replace(ERROR_PREFIX, '')

/**
 * Extracts the i18n messageKey from an API error response.
 * Falls back to 'common.unknown' if no key is found.
 * The 'errors.' prefix is stripped so the key works with useTranslations('errors').
 */
export function getErrorKey(error: unknown): string {
  if (error instanceof PermissionError) {
    return error.messageKey.replace(ERROR_PREFIX, '')
  }

  const axiosError = error as AxiosError<ApiErrorResponse>
  const data = axiosError?.response?.data

  if (data?.messageKey) {
    return data.messageKey.replace(ERROR_PREFIX, '')
  }

  return DEFAULT_ERROR_KEY
}

/**
 * Extracts field-level validation error messageKeys from an API error response.
 * Each entry in the errors array is an i18n key (e.g. 'errors.validation.email.required').
 * Returns an empty array if no field errors are present.
 */
export function getFieldErrors(error: unknown): string[] {
  const axiosError = error as AxiosError<ApiErrorResponse>
  const data = axiosError?.response?.data

  return data?.errors ?? []
}

/**
 * Returns the most specific error messageKey from an API error.
 * Prefers the first field-level error, falls back to the main messageKey.
 */
export function getFirstFieldError(error: unknown): string {
  const axiosError = error as AxiosError<ApiErrorResponse>
  const data = axiosError?.response?.data

  const firstError = data?.errors?.[0]
  if (firstError) {
    return firstError.replace(ERROR_PREFIX, '')
  }

  if (data?.messageKey) {
    return data.messageKey.replace(ERROR_PREFIX, '')
  }

  return DEFAULT_ERROR_KEY
}
