import { useRoleSettingsPageCrud } from './useRoleSettingsPageCrud'
import { useRoleSettingsPageFilters } from './useRoleSettingsPageFilters'

export function useRoleSettingsPage() {
  const filters = useRoleSettingsPageFilters()
  const crud = useRoleSettingsPageCrud(filters)

  return {
    t: filters.t,
    isLoading: filters.isLoading,
    isFetching: filters.isFetching,
    isDirty: filters.isDirty,
    isSaving: crud.isSaving,
    isResetting: crud.isResetting,
    permissionGroups: filters.permissionGroups,
    permissionLabelMap: filters.permissionLabelMap,
    configurableRoles: filters.configurableRoles,
    handleToggle: filters.handleToggle,
    handleSave: crud.handleSave,
    handleReset: crud.handleReset,
    isChecked: filters.isChecked,
    isToggleDisabled: filters.isToggleDisabled,
    canEditRoles: filters.canEditRoles,
    canResetDefaults: filters.canResetDefaults,
  }
}
