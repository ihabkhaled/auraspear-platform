import { SetMetadata } from '@nestjs/common'
import type { CustomDecorator } from '@nestjs/common'

export const SKIP_CSRF_KEY = 'skipCsrf'

/**
 * Marks an endpoint to bypass CSRF protection.
 * Use for webhook receivers or other endpoints that legitimately receive
 * cross-origin state-changing requests.
 */
export const SkipCsrf = (): CustomDecorator<string> => SetMetadata(SKIP_CSRF_KEY, true)
