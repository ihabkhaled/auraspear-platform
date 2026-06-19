'use client'

import { Cloud, Plus } from 'lucide-react'
import { CloudAccountCreateDialog } from '@/components/cloud-security/CloudAccountCreateDialog'
import { CloudAccountDetailPanel } from '@/components/cloud-security/CloudAccountDetailPanel'
import { CloudAccountEditDialog } from '@/components/cloud-security/CloudAccountEditDialog'
import { CloudSecurityFilters } from '@/components/cloud-security/CloudSecurityFilters'
import { CloudSecurityKpiCards } from '@/components/cloud-security/CloudSecurityKpiCards'
import { DataTable, PageHeader, Pagination } from '@/components/common'
import { CloudProvider } from '@/enums'
import { useCloudSecurityPage } from '@/hooks'

export default function CloudSecurityPage() {
  const {
    t,
    data,
    stats,
    statsLoading,
    columns,
    isFetching,
    pagination,
    searchQuery,
    providerFilter,
    statusFilter,
    sortBy,
    sortOrder,
    createOpen,
    setCreateOpen,
    editOpen,
    setEditOpen,
    detailOpen,
    setDetailOpen,
    selectedAccount,
    accountFindings,
    createLoading,
    editLoading,
    handleSearchChange,
    handleProviderChange,
    handleStatusChange,
    handleSort,
    handleCreate,
    handleEdit,
    handleRowClick,
    canCreate,
    canEdit,
  } = useCloudSecurityPage()

  const editInitialValues = selectedAccount
    ? {
        provider: selectedAccount.provider,
        accountId: selectedAccount.accountId,
        alias: selectedAccount.alias ?? '',
        region: selectedAccount.region ?? '',
      }
    : {
        provider: CloudProvider.AWS,
        accountId: '',
        alias: '',
        region: '',
      }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('title')}
        description={t('description')}
        {...(canCreate
          ? {
              action: {
                label: t('addAccount'),
                icon: <Plus className="h-4 w-4" />,
                onClick: () => setCreateOpen(true),
              },
            }
          : {})}
      />

      <CloudSecurityKpiCards stats={stats} isLoading={statsLoading} />

      <CloudSecurityFilters
        searchQuery={searchQuery}
        providerFilter={providerFilter}
        statusFilter={statusFilter}
        onSearchChange={handleSearchChange}
        onProviderChange={handleProviderChange}
        onStatusChange={handleStatusChange}
      />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        loading={isFetching}
        onRowClick={handleRowClick}
        emptyMessage={t('noAccounts')}
        emptyIcon={<Cloud className="h-6 w-6" />}
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

      {canCreate && (
        <CloudAccountCreateDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSubmit={handleCreate}
          loading={createLoading}
        />
      )}

      {canEdit && (
        <CloudAccountEditDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          onSubmit={handleEdit}
          initialValues={editInitialValues}
          loading={editLoading}
        />
      )}

      <CloudAccountDetailPanel
        account={selectedAccount}
        findings={accountFindings}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  )
}
