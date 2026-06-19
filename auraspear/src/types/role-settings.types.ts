import type { Permission } from '@/enums'

export interface PermissionMatrix {
  [role: string]: Permission[]
}

export interface RoleSettingsResponse {
  matrix: PermissionMatrix
  configurableRoles: string[]
}

export interface PermissionDefinition {
  key: string
  module: string
  labelKey: string
  sortOrder: number
}

export interface PermissionGroup {
  key: string
  labelKey: string
  permissions: string[]
}

export interface RoleSettingsMatrixProps {
  permissionGroups: PermissionGroup[]
  configurableRoles: string[]
  isChecked: (role: string, permission: string) => boolean
  onToggle: (role: string, permission: string, checked: boolean) => void
  isToggleDisabled?: ((role: string, permission: string) => boolean) | undefined
  disabled: boolean
  permissionLabelMap: Record<string, string>
  t: (key: string) => string
}

export interface RoleSettingsToolbarProps {
  isDirty: boolean
  isSaving: boolean
  isResetting: boolean
  showReset?: boolean | undefined
  onSave: () => void
  onReset: () => void
  t: (key: string) => string
}
