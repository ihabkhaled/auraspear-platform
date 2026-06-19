'use client'

import { Plus, Building2, Users, UserPlus, UserCheck, Search, ChevronDown } from 'lucide-react'
import {
  TenantUserTable,
  TenantListTable,
  CreateTenantDialog,
  AddUserDialog,
  AssignUserDialog,
  EditTenantDialog,
  EditUserDialog,
} from '@/components/admin'
import {
  PageHeader,
  LoadingSpinner,
  ErrorMessage,
  EmptyState,
  Pagination,
} from '@/components/common'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Input,
} from '@/components/ui'
import { useTenantConfigPage } from '@/hooks'
import { cn } from '@/lib/utils'

export default function TenantConfigPage() {
  const {
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
    createTenantPending,
    addUserPending,
    assignUserPending,
    updateTenantPending,
    updateUserPending,
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
    currentUserId,
    handleBlockUser,
    handleUnblockUser,
    handleRestoreUser,
    handleImpersonateUser,
    userSortBy,
    userSortOrder,
    handleUserSort,
    userSearch,
    setUserSearch,
    userPagination,
    tenantSortBy,
    tenantSortOrder,
    handleTenantSort,
    tenantSearch,
    setTenantSearch,
    tenantPagination,
  } = useTenantConfigPage()

  function renderTenants() {
    if (tenantsLoading) return <LoadingSpinner />
    if (tenantsError) return <ErrorMessage message={t('tenants.loadError')} />
    if ((tenantsData?.data?.length ?? 0) === 0) {
      return (
        <EmptyState
          icon={<Building2 className="h-6 w-6" />}
          title={t('tenants.noTenants')}
          description={t('tenants.noTenantsDescription')}
        />
      )
    }
    return (
      <>
        <TenantListTable
          tenants={tenantsData?.data ?? []}
          loading={tenantsFetching}
          onTenantClick={handleTenantClick}
          onEditTenant={handleEditTenant}
          onDeleteTenant={handleDeleteTenant}
          {...(userRole ? { userRole } : {})}
          sortBy={tenantSortBy}
          sortOrder={tenantSortOrder}
          onSort={handleTenantSort}
        />
        <div className="pt-4">
          <Pagination
            page={tenantPagination.page}
            totalPages={tenantPagination.totalPages}
            onPageChange={tenantPagination.setPage}
            total={tenantPagination.total}
          />
        </div>
      </>
    )
  }

  function renderUsers() {
    if (usersLoading) return <LoadingSpinner />
    if (usersError) return <ErrorMessage message={t('users.loadError')} />
    if ((usersData?.data?.length ?? 0) === 0) {
      return (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title={t('users.noUsers')}
          description={t('users.noUsersDescription')}
        />
      )
    }
    return (
      <>
        <TenantUserTable
          users={usersData?.data ?? []}
          loading={usersFetching}
          onEditUser={handleEditUser}
          onRemoveUser={handleRemoveUser}
          onBlockUser={handleBlockUser}
          onUnblockUser={handleUnblockUser}
          onRestoreUser={handleRestoreUser}
          onImpersonateUser={handleImpersonateUser}
          showActions={canManageUsers}
          callerRole={userRole}
          currentUserId={currentUserId}
          sortBy={userSortBy}
          sortOrder={userSortOrder}
          onSort={handleUserSort}
        />
        <div className="pt-4">
          <Pagination
            page={userPagination.page}
            totalPages={userPagination.totalPages}
            onPageChange={userPagination.setPage}
            total={userPagination.total}
          />
        </div>
      </>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('tenant.title')}
        description={t('tenant.description')}
        {...(isGlobalAdmin
          ? {
              action: {
                label: t('tenants.addTenant'),
                icon: <Plus className="h-4 w-4" />,
                onClick: () => setCreateDialogOpen(true),
              },
            }
          : {})}
      />

      <Collapsible open={tenantsOpen} onOpenChange={setTenantsOpen}>
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CollapsibleTrigger asChild>
              <button type="button" className="flex cursor-pointer items-center gap-2 text-start">
                <ChevronDown
                  className={cn(
                    'text-muted-foreground h-4 w-4 shrink-0 transition-transform',
                    !tenantsOpen && '-rotate-90'
                  )}
                />
                <CardTitle className="text-base">
                  {t('tenants.title')}
                  {tenantPagination.total > 0 && (
                    <span className="text-muted-foreground ms-2 text-sm font-normal">
                      ({tenantPagination.total})
                    </span>
                  )}
                </CardTitle>
              </button>
            </CollapsibleTrigger>
            {isGlobalAdmin && tenantsOpen && (
              <div className="relative w-full sm:w-64">
                <Search className="text-muted-foreground absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                <Input
                  value={tenantSearch}
                  onChange={e => setTenantSearch(e.currentTarget.value)}
                  placeholder={t('tenants.searchPlaceholder')}
                  className="ps-9"
                />
              </div>
            )}
          </CardHeader>
          <CollapsibleContent>
            <CardContent>{renderTenants()}</CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Collapsible open={usersOpen} onOpenChange={setUsersOpen}>
        <Card>
          <CardHeader className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CollapsibleTrigger asChild>
                <button type="button" className="flex cursor-pointer items-center gap-2 text-start">
                  <ChevronDown
                    className={cn(
                      'text-muted-foreground h-4 w-4 shrink-0 transition-transform',
                      !usersOpen && '-rotate-90'
                    )}
                  />
                  <CardTitle className="text-base">
                    {t('users.title')}
                    {tenantsData?.data && (
                      <span className="text-muted-foreground ms-2 text-sm font-normal">
                        (
                        {tenantsData.data.find(tenant => tenant.id === currentTenantId)?.name ??
                          currentTenantId}
                        )
                      </span>
                    )}
                  </CardTitle>
                </button>
              </CollapsibleTrigger>
              {currentTenantId.length > 0 && canManageUsers && usersOpen && (
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setAssignUserDialogOpen(true)}>
                    <UserCheck className="me-2 h-4 w-4" />
                    {t('users.assignUser')}
                  </Button>
                  <Button size="sm" onClick={() => setAddUserDialogOpen(true)}>
                    <UserPlus className="me-2 h-4 w-4" />
                    {t('users.addUser')}
                  </Button>
                </div>
              )}
            </div>
            {currentTenantId.length > 0 && usersOpen && (
              <div className="relative w-full sm:w-64">
                <Search className="text-muted-foreground absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                <Input
                  value={userSearch}
                  onChange={e => setUserSearch(e.currentTarget.value)}
                  placeholder={t('users.searchPlaceholder')}
                  className="ps-9"
                />
              </div>
            )}
          </CardHeader>
          <CollapsibleContent>
            <CardContent>{renderUsers()}</CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <CreateTenantDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateTenant}
        loading={createTenantPending}
      />

      <AddUserDialog
        open={addUserDialogOpen}
        onOpenChange={setAddUserDialogOpen}
        onSubmit={handleAddUser}
        loading={addUserPending}
        callerRole={userRole}
      />

      <AssignUserDialog
        open={assignUserDialogOpen}
        onOpenChange={setAssignUserDialogOpen}
        onSubmit={handleAssignUser}
        loading={assignUserPending}
        tenantId={currentTenantId}
        callerRole={userRole}
      />

      <EditTenantDialog
        open={editTenantDialogOpen}
        onOpenChange={setEditTenantDialogOpen}
        tenant={editingTenant}
        onSubmit={handleEditTenantSubmit}
        loading={updateTenantPending}
      />

      <EditUserDialog
        open={editUserDialogOpen}
        onOpenChange={setEditUserDialogOpen}
        user={editingUser}
        onSubmit={handleEditUserSubmit}
        loading={updateUserPending}
        callerRole={userRole}
      />
    </div>
  )
}
