import api from '@/lib/api'
import type { ChangePasswordInput, UpdateProfileInput, UserProfile } from '@/types'

export const profileService = {
  getProfile: () => api.get<{ data: UserProfile }>('/users/profile').then(r => r.data.data),

  updateProfile: (data: UpdateProfileInput) =>
    api.patch<{ data: UserProfile }>('/users/profile', data).then(r => r.data.data),

  changePassword: (data: ChangePasswordInput) =>
    api.post<{ data: unknown }>('/users/change-password', data).then(r => r.data.data),
}
