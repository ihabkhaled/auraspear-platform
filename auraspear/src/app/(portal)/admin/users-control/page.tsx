'use client'

import { Search } from 'lucide-react'
import { UserSessionsPanel, UsersControlOverviewCards, UsersControlTable } from '@/components/admin'
import { ErrorMessage, PageHeader, Pagination } from '@/components/common'
import { DashboardSectionCard } from '@/components/dashboard'
import { Input } from '@/components/ui'
import { useUsersControlPage } from '@/hooks'

export default function UsersControlPage() {
  const {
    t,
    tCommon,
    tRoleSettings,
    locale,
    overviewOpen,
    setOverviewOpen,
    usersOpen,
    setUsersOpen,
    sessionsOpen,
    setSessionsOpen,
    search,
    setSearch,
    sortBy,
    sortOrder,
    selectedUser,
    selectedUserId,
    sessionsSectionRef,
    scopeLabel,
    usersPagination,
    sessionsPagination,
    handleSort,
    handleUserSelect,
    handleForceLogoutUser,
    handleForceLogoutAll,
    handleTerminateSession,
    canManageTargetUser,
    canManageSelectedUser,
    canViewSessions,
    canForceLogoutUser,
    canForceLogoutAll,
    isForceLogoutAllPending,
    terminatingSessionId,
    summary,
    summaryLoading,
    summaryError,
    users,
    usersLoading,
    usersError,
    sessions,
    sessionsLoading,
    sessionsError,
  } = useUsersControlPage()

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={t('description')} />

      <DashboardSectionCard
        title={t('sections.overview')}
        open={overviewOpen}
        onOpenChange={setOverviewOpen}
      >
        {summaryError ? (
          <ErrorMessage message={t('loadSummaryError')} />
        ) : (
          <UsersControlOverviewCards
            summary={summary ?? null}
            loading={summaryLoading}
            canForceLogoutAll={canForceLogoutAll}
            isForceLogoutAllPending={isForceLogoutAllPending}
            onForceLogoutAll={handleForceLogoutAll}
            scopeLabel={scopeLabel}
            t={t}
          />
        )}
      </DashboardSectionCard>

      <DashboardSectionCard
        title={t('sections.users')}
        open={usersOpen}
        onOpenChange={setUsersOpen}
      >
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="text-muted-foreground absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={event => setSearch(event.currentTarget.value)}
              placeholder={t('searchPlaceholder')}
              className="ps-9"
            />
          </div>

          {usersError ? (
            <ErrorMessage message={t('loadUsersError')} />
          ) : (
            <>
              <UsersControlTable
                users={users}
                loading={usersLoading}
                locale={locale}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={handleSort}
                onUserSelect={handleUserSelect}
                onForceLogoutUser={handleForceLogoutUser}
                canForceLogoutUser={canForceLogoutUser}
                canManageTarget={canManageTargetUser}
                selectedUserId={selectedUserId}
                t={t}
                tCommon={tCommon}
                tRoleSettings={tRoleSettings}
              />
              <Pagination
                page={usersPagination.page}
                totalPages={usersPagination.totalPages}
                onPageChange={usersPagination.setPage}
                total={usersPagination.total}
              />
            </>
          )}
        </div>
      </DashboardSectionCard>

      <div ref={sessionsSectionRef}>
        <DashboardSectionCard
          title={t('sections.sessions')}
          open={sessionsOpen}
          onOpenChange={setSessionsOpen}
        >
          {sessionsError ? (
            <ErrorMessage message={t('loadSessionsError')} />
          ) : (
            <UserSessionsPanel
              user={selectedUser}
              sessions={sessions}
              loading={sessionsLoading}
              locale={locale}
              canViewSessions={canViewSessions}
              canForceLogoutUser={canForceLogoutUser}
              canManageTarget={canManageSelectedUser}
              onForceLogoutUser={handleForceLogoutUser}
              onTerminateSession={session => handleTerminateSession(session.id)}
              terminatingSessionId={terminatingSessionId}
              page={sessionsPagination.page}
              totalPages={sessionsPagination.totalPages}
              total={sessionsPagination.total}
              onPageChange={sessionsPagination.setPage}
              t={t}
            />
          )}
        </DashboardSectionCard>
      </div>
    </div>
  )
}
