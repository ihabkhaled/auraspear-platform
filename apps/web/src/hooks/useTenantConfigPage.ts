import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Toast, SweetAlertDialog, SweetAlertIcon } from '@/components/common'
import { UserRole, type SortOrder } from '@/enums'
import { buildErrorToastHandler } from '@/lib/toast.utils'
import { useAuthStore, useTenantStore } from '@/stores'
import type {
  AddUserFormValues,
  AssignUserInput,
  CreateTenantFormValues,
  EditTenantFormValues,
  Tenant,
  TenantUser,
} from '@/types'
import {
  useTenants,
  useCurrentTenant,
  useCreateTenant,
  useTenantUsers,
  useAddUser,
  useUpdateTenant,
  useDeleteTenant,
  useUpdateUser,
  useRemoveUser,
  useBlockUser,
  useUnblockUser,
  useRestoreUser,
  useAssignUser,
  useImpersonateUser,
} from './useAdmin'
import { useDebounce } from './useDebounce'
import { usePagination } from './usePagination'

export function useTenantConfigPage() {
  const t = useTranslations('admin')
  const tErrors = useTranslations('errors')
  const tImpersonation = useTranslations('impersonation')
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user, setTokens, setUser, startImpersonation } = useAuthStore()
  const { currentTenantId, setCurrentTenant, setTenants } = useTenantStore()

  const userRole = user?.role as UserRole | undefined
  const isGlobalAdmin = userRole === UserRole.GLOBAL_ADMIN
  const isTenantAdmin = userRole === UserRole.TENANT_ADMIN
  const canManageUsers = isGlobalAdmin || isTenantAdmin

  // Section collapse states
  const [tenantsOpen, setTenantsOpen] = useState(true)
  const [usersOpen, setUsersOpen] = useState(true)

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false)
  const [assignUserDialogOpen, setAssignUserDialogOpen] = useState(false)
  const [editTenantDialogOpen, setEditTenantDialogOpen] = useState(false)
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false)
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null)
  const [editingUser, setEditingUser] = useState<TenantUser | null>(null)

  // Tenant table: sorting, search, pagination
  const [tenantSortBy, setTenantSortBy] = useState<string | undefined>()
  const [tenantSortOrder, setTenantSortOrder] = useState<SortOrder | undefined>()
  const [tenantSearch, setTenantSearch] = useState('')
  const debouncedTenantSearch = useDebounce(tenantSearch, 400)
  const tenantPagination = usePagination({ initialLimit: 5 })

  // User table: sorting, search, pagination
  const [userSortBy, setUserSortBy] = useState<string | undefined>()
  const [userSortOrder, setUserSortOrder] = useState<SortOrder | undefined>()
  const [userSearch, setUserSearch] = useState('')
  const debouncedUserSearch = useDebounce(userSearch, 400)
  const userPagination = usePagination({ initialLimit: 5 })

  // Reset page on search change — use refs to avoid including pagination in deps
  const tenantResetPageRef = useRef(tenantPagination.resetPage)
  const userResetPageRef = useRef(userPagination.resetPage)

  useEffect(() => {
    tenantResetPageRef.current = tenantPagination.resetPage
  }, [tenantPagination.resetPage])

  useEffect(() => {
    userResetPageRef.current = userPagination.resetPage
  }, [userPagination.resetPage])

  useEffect(() => {
    tenantResetPageRef.current()
  }, [debouncedTenantSearch])

  useEffect(() => {
    userResetPageRef.current()
  }, [debouncedUserSearch])

  // Only Global Admin fetches all tenants
  const {
    data: allTenantsData,
    isLoading: allTenantsLoading,
    isFetching: allTenantsFetching,
    isError: allTenantsError,
  } = useTenants(
    {
      page: tenantPagination.page,
      limit: tenantPagination.limit,
      ...(debouncedTenantSearch.length > 0 ? { search: debouncedTenantSearch } : {}),
      ...(tenantSortBy ? { sortBy: tenantSortBy } : {}),
      ...(tenantSortOrder ? { sortOrder: tenantSortOrder } : {}),
    },
    isGlobalAdmin
  )

  // Tenant Admin fetches only their own tenant
  const { data: currentTenantData, isLoading: currentTenantLoading } =
    useCurrentTenant(isTenantAdmin)

  // Merge into unified tenants data
  const tenantsData = useMemo(() => {
    if (isGlobalAdmin) {
      return allTenantsData
    }
    if (currentTenantData?.data) {
      return { data: [currentTenantData.data] }
    }
    return
  }, [isGlobalAdmin, allTenantsData, currentTenantData])

  const tenantsLoading = isGlobalAdmin ? allTenantsLoading : currentTenantLoading
  const tenantsFetching = isGlobalAdmin ? allTenantsFetching : false
  const tenantsError = isGlobalAdmin ? allTenantsError : false

  // Sync tenant pagination total
  useEffect(() => {
    if (allTenantsData?.pagination) {
      tenantPagination.setTotal(allTenantsData.pagination.total)
    }
  }, [allTenantsData?.pagination, tenantPagination])

  const {
    data: usersData,
    isLoading: usersLoading,
    isFetching: usersFetching,
    isError: usersError,
  } = useTenantUsers(currentTenantId, {
    page: userPagination.page,
    limit: userPagination.limit,
    ...(debouncedUserSearch.length > 0 ? { search: debouncedUserSearch } : {}),
    ...(userSortBy ? { sortBy: userSortBy } : {}),
    ...(userSortOrder ? { sortOrder: userSortOrder } : {}),
  })

  // Sync user pagination total
  useEffect(() => {
    if (usersData?.pagination) {
      userPagination.setTotal(usersData.pagination.total)
    }
  }, [usersData?.pagination, userPagination])

  const createTenant = useCreateTenant()
  const addUser = useAddUser()
  const assignUser = useAssignUser()
  const updateTenant = useUpdateTenant()
  const deleteTenant = useDeleteTenant()
  const updateUser = useUpdateUser()
  const removeUser = useRemoveUser()
  const blockUser = useBlockUser()
  const unblockUser = useUnblockUser()
  const restoreUser = useRestoreUser()
  const impersonateUser = useImpersonateUser()

  useEffect(() => {
    if (tenantsData?.data) {
      setTenants(tenantsData.data)
    }
  }, [tenantsData?.data, setTenants])

  // Auto-select tenant for Tenant Admin
  useEffect(() => {
    if (isTenantAdmin && currentTenantData?.data && currentTenantId.length === 0) {
      setCurrentTenant(currentTenantData.data.id)
    }
  }, [isTenantAdmin, currentTenantData?.data, currentTenantId, setCurrentTenant])

  const handleCreateTenant = useCallback(
    (formData: CreateTenantFormValues) => {
      createTenant.mutate(
        { name: formData.name, slug: formData.slug },
        {
          onSuccess: () => {
            setCreateDialogOpen(false)
            Toast.success(t('tenants.tenantCreated'))
          },
          onError: buildErrorToastHandler(tErrors),
        }
      )
    },
    [createTenant, t, tErrors]
  )

  const handleAddUser = useCallback(
    (formData: AddUserFormValues) => {
      addUser.mutate(
        {
          tenantId: currentTenantId,
          data: {
            name: formData.name,
            email: formData.email,
            password: formData.password,
            role: formData.role,
          },
        },
        {
          onSuccess: () => {
            setAddUserDialogOpen(false)
            Toast.success(t('users.userCreated'))
          },
          onError: buildErrorToastHandler(tErrors),
        }
      )
    },
    [addUser, currentTenantId, t, tErrors]
  )

  const handleAssignUser = useCallback(
    (data: AssignUserInput) => {
      assignUser.mutate(
        { tenantId: currentTenantId, data },
        {
          onSuccess: () => {
            setAssignUserDialogOpen(false)
            Toast.success(t('users.userAssigned'))
          },
          onError: buildErrorToastHandler(tErrors),
        }
      )
    },
    [assignUser, currentTenantId, t, tErrors]
  )

  const handleTenantClick = useCallback(
    (tenant: Tenant) => {
      setCurrentTenant(tenant.id)
    },
    [setCurrentTenant]
  )

  const handleEditTenant = useCallback((tenant: Tenant) => {
    setEditingTenant(tenant)
    setEditTenantDialogOpen(true)
  }, [])

  const handleEditTenantSubmit = useCallback(
    (formData: EditTenantFormValues) => {
      if (!editingTenant) {
        return
      }
      updateTenant.mutate(
        { tenantId: editingTenant.id, data: { name: formData.name } },
        {
          onSuccess: () => {
            setEditTenantDialogOpen(false)
            setEditingTenant(null)
            Toast.success(t('tenants.tenantUpdated'))
          },
          onError: buildErrorToastHandler(tErrors),
        }
      )
    },
    [editingTenant, updateTenant, t, tErrors]
  )

  const handleDeleteTenant = useCallback(
    async (tenant: Tenant) => {
      const confirmed = await SweetAlertDialog.show({
        title: t('tenants.deleteTenant'),
        text: t('tenants.confirmDeleteTenant'),
        icon: SweetAlertIcon.WARNING,
      })

      if (!confirmed) {
        return
      }

      deleteTenant.mutate(tenant.id, {
        onSuccess: () => {
          if (currentTenantId === tenant.id) {
            setCurrentTenant('')
          }
          Toast.success(t('tenants.tenantDeleted'))
        },
        onError: buildErrorToastHandler(tErrors),
      })
    },
    [deleteTenant, currentTenantId, setCurrentTenant, t, tErrors]
  )

  const handleEditUser = useCallback((tenantUser: TenantUser) => {
    setEditingUser(tenantUser)
    setEditUserDialogOpen(true)
  }, [])

  const handleEditUserSubmit = useCallback(
    (data: { name: string; role: string; password?: string }) => {
      if (!editingUser) {
        return
      }
      const payload: { name?: string; role?: string; password?: string } = {
        name: data.name,
        role: data.role,
      }
      if (data.password && data.password.length > 0) {
        payload.password = data.password
      }
      updateUser.mutate(
        { tenantId: currentTenantId, userId: editingUser.id, data: payload },
        {
          onSuccess: () => {
            setEditUserDialogOpen(false)
            setEditingUser(null)
            Toast.success(t('users.userUpdated'))
          },
          onError: buildErrorToastHandler(tErrors),
        }
      )
    },
    [editingUser, updateUser, currentTenantId, t, tErrors]
  )

  const handleRemoveUser = useCallback(
    async (tenantUser: TenantUser) => {
      const confirmed = await SweetAlertDialog.show({
        title: t('users.removeUser'),
        text: t('users.confirmRemoveUser'),
        icon: SweetAlertIcon.WARNING,
      })

      if (!confirmed) {
        return
      }

      removeUser.mutate(
        { tenantId: currentTenantId, userId: tenantUser.id },
        {
          onSuccess: () => {
            Toast.success(t('users.userRemoved'))
          },
          onError: buildErrorToastHandler(tErrors),
        }
      )
    },
    [removeUser, currentTenantId, t, tErrors]
  )

  const handleBlockUser = useCallback(
    async (tenantUser: TenantUser) => {
      const confirmed = await SweetAlertDialog.show({
        title: t('users.blockUser'),
        text: t('users.confirmBlockUser'),
        icon: SweetAlertIcon.WARNING,
      })

      if (!confirmed) {
        return
      }

      blockUser.mutate(
        { tenantId: currentTenantId, userId: tenantUser.id },
        {
          onSuccess: () => {
            Toast.success(t('users.userBlocked'))
          },
          onError: buildErrorToastHandler(tErrors),
        }
      )
    },
    [blockUser, currentTenantId, t, tErrors]
  )

  const handleUnblockUser = useCallback(
    async (tenantUser: TenantUser) => {
      const confirmed = await SweetAlertDialog.show({
        title: t('users.unblockUser'),
        text: t('users.confirmUnblockUser'),
        icon: SweetAlertIcon.QUESTION,
      })

      if (!confirmed) {
        return
      }

      unblockUser.mutate(
        { tenantId: currentTenantId, userId: tenantUser.id },
        {
          onSuccess: () => {
            Toast.success(t('users.userUnblocked'))
          },
          onError: buildErrorToastHandler(tErrors),
        }
      )
    },
    [unblockUser, currentTenantId, t, tErrors]
  )

  const handleUserSort = useCallback(
    (key: string, order: SortOrder) => {
      setUserSortBy(key)
      setUserSortOrder(order)
      userPagination.resetPage()
    },
    [userPagination]
  )

  const handleTenantSort = useCallback(
    (key: string, order: SortOrder) => {
      setTenantSortBy(key)
      setTenantSortOrder(order)
      tenantPagination.resetPage()
    },
    [tenantPagination]
  )

  const handleRestoreUser = useCallback(
    async (tenantUser: TenantUser) => {
      const confirmed = await SweetAlertDialog.show({
        title: t('users.restoreUser'),
        text: t('users.confirmRestoreUser'),
        icon: SweetAlertIcon.QUESTION,
      })

      if (!confirmed) {
        return
      }

      restoreUser.mutate(
        { tenantId: currentTenantId, userId: tenantUser.id },
        {
          onSuccess: () => {
            Toast.success(t('users.userRestored'))
          },
          onError: buildErrorToastHandler(tErrors),
        }
      )
    },
    [restoreUser, currentTenantId, t, tErrors]
  )

  const handleImpersonateUser = useCallback(
    async (tenantUser: TenantUser) => {
      const confirmed = await SweetAlertDialog.show({
        title: tImpersonation('confirmTitle'),
        text: tImpersonation('confirmText', { user: tenantUser.email }),
        icon: SweetAlertIcon.WARNING,
      })

      if (!confirmed) {
        return
      }

      impersonateUser.mutate(
        { tenantId: currentTenantId, userId: tenantUser.id },
        {
          onSuccess: response => {
            const { data } = response
            if (!data) {
              return
            }
            setTokens(data.accessToken)
            setUser({
              sub: data.user.sub,
              email: data.user.email,
              tenantId: data.user.tenantId,
              tenantSlug: data.user.tenantSlug,
              role: data.user.role as UserRole,
            })
            startImpersonation(data.impersonator)
            setCurrentTenant(data.user.tenantId)
            queryClient.clear()
            Toast.success(tImpersonation('started', { user: tenantUser.email }))
            router.push('/dashboard')
          },
          onError: buildErrorToastHandler(tErrors),
        }
      )
    },
    [
      impersonateUser,
      currentTenantId,
      setTokens,
      setUser,
      startImpersonation,
      setCurrentTenant,
      queryClient,
      router,
      tImpersonation,
      tErrors,
    ]
  )

  return {
    t,
    currentTenantId,
    userRole,
    isGlobalAdmin,
    canManageUsers,
    tenantsOpen,
    setTenantsOpen,
    usersOpen,
    setUsersOpen,
    createDialogOpen,
    setCreateDialogOpen,
    addUserDialogOpen,
    setAddUserDialogOpen,
    assignUserDialogOpen,
    setAssignUserDialogOpen,
    editTenantDialogOpen,
    setEditTenantDialogOpen,
    editUserDialogOpen,
    setEditUserDialogOpen,
    editingTenant,
    editingUser,
    tenantsData,
    tenantsLoading,
    tenantsFetching,
    tenantsError,
    usersData,
    usersLoading,
    usersFetching,
    usersError,
    createTenantPending: createTenant.isPending,
    addUserPending: addUser.isPending,
    assignUserPending: assignUser.isPending,
    updateTenantPending: updateTenant.isPending,
    updateUserPending: updateUser.isPending,
    handleCreateTenant,
    handleAddUser,
    handleAssignUser,
    handleTenantClick,
    handleEditTenant,
    handleEditTenantSubmit,
    handleDeleteTenant,
    handleEditUser,
    handleEditUserSubmit,
    handleRemoveUser,
    currentUserId: user?.sub ?? '',
    handleBlockUser,
    handleUnblockUser,
    handleRestoreUser,
    handleImpersonateUser,
    // User table sorting/search/pagination
    userSortBy,
    userSortOrder,
    handleUserSort,
    userSearch,
    setUserSearch,
    userPagination,
    // Tenant table sorting/search/pagination
    tenantSortBy,
    tenantSortOrder,
    handleTenantSort,
    tenantSearch,
    setTenantSearch,
    tenantPagination,
  }
}
