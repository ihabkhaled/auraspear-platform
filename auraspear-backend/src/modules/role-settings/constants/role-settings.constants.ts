import { Permission } from '../../../common/enums'
import {
  USERS_CONTROL_MODULE,
  USERS_CONTROL_PERMISSION_KEYS,
} from '../../users-control/users-control.constants'

export const ROLE_SETTINGS_MODULE = 'roleSettings'
export { USERS_CONTROL_MODULE }
export const TENANT_ADMIN_PROTECTED_PERMISSIONS = new Set<string>([
  Permission.ROLE_SETTINGS_VIEW,
  Permission.ROLE_SETTINGS_UPDATE,
  ...USERS_CONTROL_PERMISSION_KEYS,
])
