'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { Permission } from '@/enums'
import { USERS_CONTROL_SESSION_LIMIT } from '@/lib/constants/users-control'
import { hasPermission } from '@/lib/permissions'
import { useAuthStore } from '@/stores'
import type { UsersControlUser } from '@/types'
import { usePagination } from './usePagination'
import { useControlledUserSessions } from './useUsersControl'

export function useUsersControlPageDialogs(users: UsersControlUser[]) {
  const permissions = useAuthStore(s => s.permissions)

  const [overviewOpen, setOverviewOpen] = useState(true)
  const [usersOpen, setUsersOpen] = useState(true)
  const [sessionsOpen, setSessionsOpen] = useState(true)
  const [selectedUserStateId, setSelectedUserStateId] = useState('')
  const sessionsSectionRef = useRef<HTMLDivElement | null>(null)

  const canViewSessions = hasPermission(permissions, Permission.USERS_CONTROL_VIEW_SESSIONS)

  const sessionsPagination = usePagination({ initialLimit: USERS_CONTROL_SESSION_LIMIT })

  const selectedUser = useMemo(() => {
    if (users.length === 0) {
      return null
    }

    const matchingUser =
      selectedUserStateId.length > 0
        ? (users.find(userItem => userItem.id === selectedUserStateId) ?? null)
        : null

    return matchingUser ?? users[0] ?? null
  }, [selectedUserStateId, users])

  const selectedUserId = selectedUser?.id ?? ''
  const sessionsQuery = useControlledUserSessions(
    selectedUserId,
    {
      page: sessionsPagination.page,
      limit: sessionsPagination.limit,
    },
    canViewSessions
  )

  const handleUserSelect = useCallback(
    (nextUser: UsersControlUser) => {
      setSelectedUserStateId(nextUser.id)
      sessionsPagination.resetPage()
      setSessionsOpen(true)

      if (typeof window !== 'undefined') {
        window.requestAnimationFrame(() => {
          sessionsSectionRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          })
        })
      }
    },
    [sessionsPagination]
  )

  return {
    overviewOpen,
    setOverviewOpen,
    usersOpen,
    setUsersOpen,
    sessionsOpen,
    setSessionsOpen,
    selectedUser,
    selectedUserId,
    selectedUserStateId,
    setSelectedUserStateId,
    sessionsSectionRef,
    sessionsPagination,
    canViewSessions,
    handleUserSelect,
    sessions: sessionsQuery.data?.data ?? [],
    sessionsLoading: sessionsQuery.isLoading || sessionsQuery.isFetching,
    sessionsError: sessionsQuery.isError,
  }
}
