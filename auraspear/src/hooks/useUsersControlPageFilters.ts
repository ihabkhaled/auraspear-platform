'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { UserRole } from '@/enums'
import type { SortOrder, UsersControlUserSortField } from '@/enums'
import {
  USERS_CONTROL_DEFAULT_LIMIT,
  USERS_CONTROL_DEFAULT_SORT_FIELD,
  USERS_CONTROL_DEFAULT_SORT_ORDER,
} from '@/lib/constants/users-control'
import { isUsersControlSortField } from '@/lib/users-control'
import { useAuthStore, useTenantStore } from '@/stores'
import { useDebounce } from './useDebounce'
import { usePagination } from './usePagination'
import { useControlledUsers, useUsersControlSummary } from './useUsersControl'

export function useUsersControlPageFilters() {
  const t = useTranslations('admin.usersControl')
  const tCommon = useTranslations('common')
  const tRoleSettings = useTranslations('roleSettings')
  const locale = useLocale()
  const user = useAuthStore(s => s.user)
  const currentTenantId = useTenantStore(s => s.currentTenantId)
  const tenants = useTenantStore(s => s.tenants)

  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<UsersControlUserSortField>(USERS_CONTROL_DEFAULT_SORT_FIELD)
  const [sortOrder, setSortOrder] = useState<SortOrder>(USERS_CONTROL_DEFAULT_SORT_ORDER)

  const debouncedSearch = useDebounce(search, 400)
  const usersPagination = usePagination({ initialLimit: USERS_CONTROL_DEFAULT_LIMIT })
  const { resetPage: resetUsersPage } = usersPagination

  const summaryQuery = useUsersControlSummary(true)
  const usersQuery = useControlledUsers(
    {
      page: usersPagination.page,
      limit: usersPagination.limit,
      ...(debouncedSearch.length > 0 ? { search: debouncedSearch } : {}),
      sortBy,
      sortOrder,
    },
    true
  )

  useEffect(() => {
    if (usersQuery.data?.pagination) {
      usersPagination.setTotal(usersQuery.data.pagination.total)
    }
  }, [usersPagination, usersQuery.data?.pagination])

  useEffect(() => {
    resetUsersPage()
  }, [debouncedSearch, resetUsersPage])

  const scopeLabel = useMemo(() => {
    if (user?.role === UserRole.GLOBAL_ADMIN) {
      return t('scope.system')
    }

    const scopedTenant = tenants.find(tenant => tenant.id === currentTenantId)
    return scopedTenant?.name ?? user?.tenantSlug ?? t('scope.currentTenant')
  }, [currentTenantId, t, tenants, user?.role, user?.tenantSlug])

  const handleSort = useCallback(
    (key: string, nextSortOrder: SortOrder) => {
      if (!isUsersControlSortField(key)) {
        return
      }

      setSortBy(key)
      setSortOrder(nextSortOrder)
      usersPagination.resetPage()
    },
    [usersPagination]
  )

  return {
    t,
    tCommon,
    tRoleSettings,
    locale,
    user,
    search,
    setSearch,
    sortBy,
    sortOrder,
    scopeLabel,
    usersPagination,
    handleSort,
    summary: summaryQuery.data?.data,
    summaryLoading: summaryQuery.isLoading || summaryQuery.isFetching,
    summaryError: summaryQuery.isError,
    users: usersQuery.data?.data ?? [],
    usersLoading: usersQuery.isLoading || usersQuery.isFetching,
    usersError: usersQuery.isError,
  }
}
