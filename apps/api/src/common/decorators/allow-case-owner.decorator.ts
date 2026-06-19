import { SetMetadata } from '@nestjs/common'
import type { CustomDecorator } from '@nestjs/common'

export const ALLOW_CASE_OWNER_KEY = 'allowCaseOwner'

/**
 * Marks an endpoint as allowing case owners to bypass the permission check.
 * When applied alongside @RequirePermission, users who don't have the
 * required permission can still access the endpoint if they own the case
 * (determined by matching the route param :id against the case's ownerUserId).
 */
export const AllowCaseOwner = (): CustomDecorator<string> => SetMetadata(ALLOW_CASE_OWNER_KEY, true)
