import api from '@/lib/api'
import type {
  ApiResponse,
  UsersControlForceLogoutResult,
  UsersControlListParams,
  UsersControlSession,
  UsersControlSessionListParams,
  UsersControlSummary,
  UsersControlUser,
} from '@/types'

export const usersControlService = {
  getSummary: () =>
    api.get<ApiResponse<UsersControlSummary>>('/admin/users-control/summary').then(r => r.data),

  getUsers: (params?: UsersControlListParams) =>
    api
      .get<ApiResponse<UsersControlUser[]>>('/admin/users-control/users', { params })
      .then(r => r.data),

  getUserSessions: (userId: string, params?: UsersControlSessionListParams) =>
    api
      .get<ApiResponse<UsersControlSession[]>>(`/admin/users-control/users/${userId}/sessions`, {
        params,
      })
      .then(r => r.data),

  forceLogoutUser: (userId: string) =>
    api
      .post<
        ApiResponse<UsersControlForceLogoutResult>
      >(`/admin/users-control/users/${userId}/force-logout`, {})
      .then(r => r.data),

  terminateSession: (userId: string, sessionId: string) =>
    api
      .post<
        ApiResponse<UsersControlForceLogoutResult>
      >(`/admin/users-control/users/${userId}/sessions/${sessionId}/force-logout`, {})
      .then(r => r.data),

  forceLogoutAll: () =>
    api
      .post<ApiResponse<UsersControlForceLogoutResult>>('/admin/users-control/force-logout-all', {})
      .then(r => r.data),
}
