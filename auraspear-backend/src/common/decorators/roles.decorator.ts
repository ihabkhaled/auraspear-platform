import { SetMetadata } from '@nestjs/common'
import type { CustomDecorator } from '@nestjs/common'
import { type UserRole } from '../interfaces/authenticated-request.interface'

export const ROLES_KEY = 'roles'

/**
 * Specifies which roles are allowed to access the decorated endpoint.
 * Roles listed are treated as the set of allowed roles; the RolesGuard
 * also supports hierarchy-based minimum-role checks.
 */
export const Roles = (...roles: UserRole[]): CustomDecorator<string> =>
  SetMetadata(ROLES_KEY, roles)
