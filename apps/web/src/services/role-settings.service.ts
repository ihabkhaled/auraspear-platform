import api from '@/lib/api'
import type { ApiResponse, PermissionDefinition, RoleSettingsResponse } from '@/types'

export const roleSettingsService = {
  getPermissionDefinitions: () =>
    api.get<ApiResponse<PermissionDefinition[]>>('/role-settings/definitions').then(r => r.data),

  getPermissionMatrix: () =>
    api.get<ApiResponse<RoleSettingsResponse>>('/role-settings').then(r => r.data),

  updatePermissionMatrix: (matrix: Record<string, string[]>) =>
    api.put<ApiResponse<RoleSettingsResponse>>('/role-settings', { matrix }).then(r => r.data),

  resetToDefaults: () =>
    api.post<ApiResponse<RoleSettingsResponse>>('/role-settings/reset').then(r => r.data),
}
