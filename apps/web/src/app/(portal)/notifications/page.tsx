'use client'

import { Bell, CheckCheck } from 'lucide-react'
import { DataTable, PageHeader, Pagination } from '@/components/common'
import {
  AiNotificationDigest,
  NotificationFilters,
  getNotificationColumns,
} from '@/components/notifications'
import { Button } from '@/components/ui'
import { useNotificationsPage } from '@/hooks'

export default function NotificationsPage() {
  const {
    t,
    tCommon,
    locale,
    data,
    isFetching,
    pagination,
    searchQuery,
    typeFilter,
    readFilter,
    sortBy,
    sortOrder,
    handleSearchChange,
    handleTypeChange,
    handleReadChange,
    handleClearAllFilters,
    handleSort,
    handleNotificationClick,
    handleMarkAllRead,
    markAllReadPending,
    resolveMessage,
    canManageNotifications,
    aiDigest,
  } = useNotificationsPage()

  return (
    <div className="space-y-4">
      <PageHeader title={t('pageTitle')} description={t('pageDescription')}>
        {canManageNotifications && (
          <Button onClick={handleMarkAllRead} disabled={markAllReadPending}>
            <CheckCheck className="me-1 h-4 w-4" />
            {t('markAllRead')}
          </Button>
        )}
      </PageHeader>

      <AiNotificationDigest
        isLoading={aiDigest.isLoading}
        digestResult={aiDigest.digestResult}
        onGenerateDigest={aiDigest.handleGenerateDigest}
        tCommon={aiDigest.tCommon}
        t={t}
      />

      <NotificationFilters
        searchQuery={searchQuery}
        typeFilter={typeFilter}
        readFilter={readFilter}
        onSearchChange={handleSearchChange}
        onTypeChange={handleTypeChange}
        onReadChange={handleReadChange}
        onClearAll={handleClearAllFilters}
        t={t}
      />

      <DataTable
        columns={getNotificationColumns({
          notifications: t,
          common: tCommon,
          resolveMessage,
          locale,
        })}
        data={data?.data ?? []}
        loading={isFetching}
        onRowClick={handleNotificationClick}
        emptyMessage={t('empty')}
        emptyIcon={<Bell className="h-6 w-6" />}
        emptyDescription={t('emptyDescription')}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
      />

      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        onPageChange={pagination.setPage}
        total={pagination.total}
      />
    </div>
  )
}
