'use client'

import { useUsersControlPageCrud } from './useUsersControlPageCrud'
import { useUsersControlPageDialogs } from './useUsersControlPageDialogs'
import { useUsersControlPageFilters } from './useUsersControlPageFilters'

export function useUsersControlPage() {
  const filters = useUsersControlPageFilters()
  const dialogs = useUsersControlPageDialogs(filters.users)
  const crud = useUsersControlPageCrud(dialogs.selectedUser, filters.scopeLabel)

  return {
    t: filters.t,
    tCommon: filters.tCommon,
    tRoleSettings: filters.tRoleSettings,
    locale: filters.locale,
    overviewOpen: dialogs.overviewOpen,
    setOverviewOpen: dialogs.setOverviewOpen,
    usersOpen: dialogs.usersOpen,
    setUsersOpen: dialogs.setUsersOpen,
    sessionsOpen: dialogs.sessionsOpen,
    setSessionsOpen: dialogs.setSessionsOpen,
    search: filters.search,
    setSearch: filters.setSearch,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    selectedUser: dialogs.selectedUser,
    selectedUserId: dialogs.selectedUserId,
    sessionsSectionRef: dialogs.sessionsSectionRef,
    scopeLabel: filters.scopeLabel,
    usersPagination: filters.usersPagination,
    sessionsPagination: dialogs.sessionsPagination,
    handleSort: filters.handleSort,
    handleUserSelect: dialogs.handleUserSelect,
    handleForceLogoutUser: crud.handleForceLogoutUser,
    handleForceLogoutAll: crud.handleForceLogoutAll,
    handleTerminateSession: crud.handleTerminateSession,
    canManageTargetUser: crud.canManageTargetUser,
    canManageSelectedUser: crud.canManageSelectedUser,
    canViewSessions: dialogs.canViewSessions,
    canForceLogoutUser: crud.canForceLogoutUser,
    canForceLogoutAll: crud.canForceLogoutAll,
    isForceLogoutUserPending: crud.isForceLogoutUserPending,
    terminatingSessionId: crud.terminatingSessionId,
    isForceLogoutAllPending: crud.isForceLogoutAllPending,
    summary: filters.summary,
    summaryLoading: filters.summaryLoading,
    summaryError: filters.summaryError,
    users: filters.users,
    usersLoading: filters.usersLoading,
    usersError: filters.usersError,
    sessions: dialogs.sessions,
    sessionsLoading: dialogs.sessionsLoading,
    sessionsError: dialogs.sessionsError,
  }
}
