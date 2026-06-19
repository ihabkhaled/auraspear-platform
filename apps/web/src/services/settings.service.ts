import api from '@/lib/api'
import type { PreferencesResponse, UserPreferences } from '@/types/profile.types'

export const settingsService = {
  getPreferences: () => api.get<PreferencesResponse>('/users/preferences').then(r => r.data.data),

  updatePreferences: (data: Partial<UserPreferences>) =>
    api.patch<PreferencesResponse>('/users/preferences', data).then(r => r.data.data),
}
