'use client'

import { Bug, Plus, Upload } from 'lucide-react'
import { PageHeader, DataTable, Pagination, LoadingSpinner } from '@/components/common'
import { Button } from '@/components/ui'
import {
  VulnerabilityKpiCards,
  VulnerabilityFilters,
  VulnerabilityCreateDialog,
  VulnerabilityEditDialog,
  VulnerabilityDetailPanel,
  VulnerabilityBulkImportDialog,
} from '@/components/vulnerabilities'
import { useVulnerabilitiesPage } from '@/hooks'

export default function VulnerabilitiesPage() {
  const {
    t,
    searchQuery,
    setSearchQuery,
    severityFilter,
    setSeverityFilter,
    patchStatusFilter,
    setPatchStatusFilter,
    exploitFilter,
    setExploitFilter,
    isFetching,
    data,
    stats,
    pagination,
    columns,
    createOpen,
    setCreateOpen,
    editOpen,
    setEditOpen,
    detailOpen,
    setDetailOpen,
    bulkImportOpen,
    setBulkImportOpen,
    selectedVulnerability,
    handleRowClick,
    handleEditFromDetail,
    handleDeleteFromDetail,
    handleOpenCreate,
    handleOpenBulkImport,
    canCreate,
    canEdit,
    canDelete,
  } = useVulnerabilitiesPage()

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('title')}
        description={t('description')}
        {...(canCreate
          ? {
              action: {
                label: t('addVulnerability'),
                icon: <Plus className="h-4 w-4" />,
                onClick: handleOpenCreate,
              },
            }
          : {})}
      >
        {canCreate && (
          <Button variant="outline" size="sm" onClick={handleOpenBulkImport}>
            <Upload className="h-4 w-4" />
            {t('bulkImportButton')}
          </Button>
        )}
      </PageHeader>

      <VulnerabilityKpiCards stats={stats} />

      <VulnerabilityFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        severityFilter={severityFilter}
        onSeverityChange={setSeverityFilter}
        patchStatusFilter={patchStatusFilter}
        onPatchStatusChange={setPatchStatusFilter}
        exploitFilter={exploitFilter}
        onExploitChange={setExploitFilter}
      />

      {isFetching ? (
        <LoadingSpinner />
      ) : (
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          emptyMessage={t('noVulnerabilities')}
          emptyIcon={<Bug className="h-6 w-6" />}
          emptyDescription={t('emptyDescription')}
          loading={isFetching}
          onRowClick={handleRowClick}
        />
      )}

      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        onPageChange={pagination.setPage}
        total={pagination.total}
      />

      {canCreate && <VulnerabilityCreateDialog open={createOpen} onOpenChange={setCreateOpen} />}

      {canEdit && (
        <VulnerabilityEditDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          vulnerability={selectedVulnerability}
        />
      )}

      <VulnerabilityDetailPanel
        open={detailOpen}
        onOpenChange={setDetailOpen}
        vulnerability={selectedVulnerability}
        onEdit={canEdit ? handleEditFromDetail : undefined}
        onDelete={canDelete ? handleDeleteFromDetail : undefined}
      />

      {canCreate && (
        <VulnerabilityBulkImportDialog open={bulkImportOpen} onOpenChange={setBulkImportOpen} />
      )}
    </div>
  )
}
