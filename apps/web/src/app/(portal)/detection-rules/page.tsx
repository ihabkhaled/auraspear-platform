'use client'

import { Plus, ShieldCheck } from 'lucide-react'
import { DataTable, PageHeader, Pagination } from '@/components/common'
import { DetectionRuleCreateDialog } from '@/components/detection-rules/DetectionRuleCreateDialog'
import { DetectionRuleDetailPanel } from '@/components/detection-rules/DetectionRuleDetailPanel'
import { DetectionRuleEditDialog } from '@/components/detection-rules/DetectionRuleEditDialog'
import { DetectionRuleFilters } from '@/components/detection-rules/DetectionRuleFilters'
import { DetectionRuleKpiCards } from '@/components/detection-rules/DetectionRuleKpiCards'
import { DetectionRuleSeverity, DetectionRuleStatus, DetectionRuleType } from '@/enums'
import { useDetectionRulesPage } from '@/hooks'

export default function DetectionRulesPage() {
  const {
    t,
    data,
    stats,
    statsLoading,
    columns,
    isFetching,
    pagination,
    searchQuery,
    ruleTypeFilter,
    severityFilter,
    statusFilter,
    sortBy,
    sortOrder,
    createOpen,
    setCreateOpen,
    editOpen,
    setEditOpen,
    detailOpen,
    setDetailOpen,
    selectedRule,
    createLoading,
    editLoading,
    handleSearchChange,
    handleRuleTypeChange,
    handleSeverityChange,
    handleStatusChange,
    handleSort,
    handleCreate,
    handleEdit,
    handleDelete,
    handleOpenDetail,
    handleOpenEdit,
    deleteLoading,
    canManageRules,
    canToggleRule,
    handleToggle,
    toggleLoading,
  } = useDetectionRulesPage()

  const editInitialValues = selectedRule
    ? {
        name: selectedRule.name,
        ruleType: selectedRule.ruleType,
        severity: selectedRule.severity,
        status: selectedRule.status,
        conditions: JSON.stringify(selectedRule.conditions, null, 2),
        actions: JSON.stringify(selectedRule.actions, null, 2),
      }
    : {
        name: '',
        ruleType: DetectionRuleType.THRESHOLD,
        severity: DetectionRuleSeverity.MEDIUM,
        status: DetectionRuleStatus.ACTIVE,
        conditions: '{}',
        actions: '{}',
      }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('title')}
        description={t('description')}
        {...(canManageRules
          ? {
              action: {
                label: t('createRule'),
                icon: <Plus className="h-4 w-4" />,
                onClick: () => setCreateOpen(true),
              },
            }
          : {})}
      />

      <DetectionRuleKpiCards stats={stats} isLoading={statsLoading} />

      <DetectionRuleFilters
        searchQuery={searchQuery}
        ruleTypeFilter={ruleTypeFilter}
        severityFilter={severityFilter}
        statusFilter={statusFilter}
        onSearchChange={handleSearchChange}
        onRuleTypeChange={handleRuleTypeChange}
        onSeverityChange={handleSeverityChange}
        onStatusChange={handleStatusChange}
      />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        loading={isFetching}
        onRowClick={handleOpenDetail}
        emptyMessage={t('noRules')}
        emptyIcon={<ShieldCheck className="h-6 w-6" />}
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

      <DetectionRuleCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
        loading={createLoading}
      />

      <DetectionRuleEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={handleEdit}
        initialValues={editInitialValues}
        loading={editLoading}
      />

      <DetectionRuleDetailPanel
        rule={selectedRule}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={canManageRules ? handleOpenEdit : undefined}
        onDelete={canManageRules ? handleDelete : undefined}
        onToggle={canToggleRule ? handleToggle : undefined}
        deleteLoading={deleteLoading}
        toggleLoading={toggleLoading}
      />
    </div>
  )
}
