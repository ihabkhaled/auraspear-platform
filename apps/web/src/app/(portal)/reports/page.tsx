'use client'

import { FileText, Plus } from 'lucide-react'
import { DataTable, PageHeader, Pagination } from '@/components/common'
import { DashboardSectionCard } from '@/components/dashboard'
import {
  AiReportPanel,
  ReportKpiCards,
  ReportFilters,
  ReportCreateDialog,
  ReportEditDialog,
  ReportDeleteDialog,
  ReportDetailPanel,
  ReportTemplateGrid,
} from '@/components/reports'
import { useReportsPage } from '@/hooks'

export default function ReportsPage() {
  const {
    t,
    data,
    stats,
    columns,
    isFetching,
    pagination,
    searchQuery,
    typeFilter,
    formatFilter,
    statusFilter,
    sortBy,
    sortOrder,
    handleSearchChange,
    handleTypeChange,
    handleFormatChange,
    handleStatusChange,
    handleSort,
    handleRowClick,
    createOpen,
    setCreateOpen,
    editOpen,
    setEditOpen,
    detailOpen,
    setDetailOpen,
    selectedReport,
    deleteReportId,
    deleteReportName,
    editInitialValues,
    handleCreate,
    handleEdit,
    handleDelete,
    createLoading,
    editLoading,
    templates,
    templatesLoading,
    handleGenerateFromTemplate,
    generatingTemplateKey,
    openEditDialog,
    openDeleteDialog,
    canManageReports,
    aiReport,
    aiReportTimeRange,
    aiReportLoading,
    handleAiTimeRangeChange,
    handleGenerateAiReport,
    aiReportTCommon,
  } = useReportsPage()

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('title')}
        description={t('description')}
        {...(canManageReports
          ? {
              action: {
                label: t('createReport'),
                icon: <Plus className="h-4 w-4" />,
                onClick: () => setCreateOpen(true),
              },
            }
          : {})}
      />

      <ReportKpiCards stats={stats} />

      <AiReportPanel
        t={t}
        report={aiReport}
        selectedTimeRange={aiReportTimeRange}
        onTimeRangeChange={handleAiTimeRangeChange}
        onGenerate={handleGenerateAiReport}
        isLoading={aiReportLoading}
        tCommon={aiReportTCommon}
      />

      <DashboardSectionCard title={t('templatesTitle')} defaultOpen={false}>
        <ReportTemplateGrid
          templates={templates}
          loading={templatesLoading}
          generatingTemplateKey={generatingTemplateKey}
          onGenerate={handleGenerateFromTemplate}
          t={t}
        />
      </DashboardSectionCard>

      <ReportFilters
        searchQuery={searchQuery}
        typeFilter={typeFilter}
        formatFilter={formatFilter}
        statusFilter={statusFilter}
        onSearchChange={handleSearchChange}
        onTypeChange={handleTypeChange}
        onFormatChange={handleFormatChange}
        onStatusChange={handleStatusChange}
      />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        loading={isFetching}
        onRowClick={handleRowClick}
        emptyMessage={t('noReports')}
        emptyIcon={<FileText className="h-6 w-6" />}
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

      <ReportCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
        loading={createLoading}
      />

      <ReportEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={handleEdit}
        initialValues={editInitialValues}
        loading={editLoading}
      />

      <ReportDeleteDialog
        reportId={deleteReportId}
        reportName={deleteReportName}
        onConfirm={handleDelete}
      />

      <ReportDetailPanel
        report={selectedReport}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={canManageReports ? openEditDialog : undefined}
        onDelete={canManageReports ? openDeleteDialog : undefined}
      />
    </div>
  )
}
