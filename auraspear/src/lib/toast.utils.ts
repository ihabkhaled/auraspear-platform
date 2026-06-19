import { Toast } from '@/components/common'
import { getErrorKey } from '@/lib/api-error'

/**
 * Builds an onError callback for mutations that shows a translated error toast.
 * Usage: onError: buildErrorToastHandler(tErrors)
 */
export function buildErrorToastHandler(
  tErrors: (key: string) => string
): (error: unknown) => void {
  return (error: unknown) => {
    Toast.error(tErrors(getErrorKey(error)))
  }
}
