import { SetMetadata } from '@nestjs/common'
import type { CustomDecorator } from '@nestjs/common'
import type { Permission } from '../enums/permission.enum'

export const PERMISSIONS_KEY = 'permissions'

/**
 * Marks an endpoint as requiring one or more permissions.
 * The PermissionsGuard reads this metadata and checks the user's
 * role-permission matrix in the database.
 *
 * All listed permissions must be satisfied (AND logic).
 */
export const RequirePermission = (...permissions: Permission[]): CustomDecorator<string> =>
  SetMetadata(PERMISSIONS_KEY, permissions)
