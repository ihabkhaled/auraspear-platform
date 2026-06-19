import { SetMetadata } from '@nestjs/common'
import type { CustomDecorator } from '@nestjs/common'

export const IS_PUBLIC_KEY = 'isPublic'

/**
 * Marks an endpoint as public -- bypasses AuthGuard and TenantGuard.
 */
export const Public = (): CustomDecorator<string> => SetMetadata(IS_PUBLIC_KEY, true)
