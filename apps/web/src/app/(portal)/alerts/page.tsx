'use client'

import { Filter, ShieldAlert } from 'lucide-react'
import {
  KqlSearchBar,
  AlertFilterSidebar,
  AlertDetailDrawer,
  AiInvestigationModal,
  AlertBulkActionBar,
  EscalateToIncidentDialog,
} from '@/components/alerts'
import { CreateCaseDialog } from '@/components/cases'
import { PageHeader, DataTable, Pagination, LoadingSpinner } from '@/components/common'
import {
  Button,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui'
import { useAlertsPage } from '@/hooks'

export default function AlertsPage() {
  const {
    t,
    selectedSeverities,
    setSeverity,
    timeRange,
    setTimeRange,
    kqlQuery,
    setKqlQuery,
    agentFilter,
    setAgentFilter,
    ruleGroup,
    setRuleGroup,
    selectedAlert,
    drawerOpen,
    setDrawerOpen,
    investigation,
    investigationOpen,
    setInvestigationOpen,
    createCaseOpen,
    setCreateCaseOpen,
    createCasePending,
    handleCreateCaseSubmit,
    handleCreateCase,
    assigneeOptions,
    isLoading,
    data,
    pagination,
    severityCounts,
    columns,
    handleRowClick,
    handleInvestigate,
    isInvestigating,
    canInvestigate,
    canAcknowledge,
    canClose,
    canEscalate,
    canCreateCase,
    canSelect,
    handleSearchSubmit,
    sortBy,
    sortOrder,
    handleSort,
    selectedIds,
    setSelectedIds,
    handleBulkAcknowledge,
    handleBulkClose,
    handleClearSelection,
    isAcknowledging,
    isClosing,
    escalateOpen,
    setEscalateOpen,
    escalateAlert,
    handleEscalateToIncident,
    triageProps,
  } = useAlertsPage()

  return (
    <div className="space-y-4">
      <PageHeader title={t('title')} description={t('description')} />

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <KqlSearchBar value={kqlQuery} onChange={setKqlQuery} onSubmit={handleSearchSubmit} />
        </div>

        {/* Mobile filter button */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="xl:hidden">
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">{t('filters')}</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[90vw] max-w-xs overflow-y-auto sm:w-80">
            <SheetHeader>
              <SheetTitle>{t('filters')}</SheetTitle>
            </SheetHeader>
            <div className="py-4">
              <AlertFilterSidebar
                timeRange={timeRange}
                onTimeRangeChange={setTimeRange}
                selectedSeverities={selectedSeverities}
                onSeverityChange={setSeverity}
                severityCounts={severityCounts}
                agentFilter={agentFilter}
                onAgentFilterChange={setAgentFilter}
                ruleGroup={ruleGroup}
                onRuleGroupChange={setRuleGroup}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex gap-6">
        <div className="hidden xl:block">
          <AlertFilterSidebar
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
            selectedSeverities={selectedSeverities}
            onSeverityChange={setSeverity}
            severityCounts={severityCounts}
            agentFilter={agentFilter}
            onAgentFilterChange={setAgentFilter}
            ruleGroup={ruleGroup}
            onRuleGroupChange={setRuleGroup}
          />
        </div>

        <div className="flex flex-1 flex-col gap-4">
          {isLoading ? (
            <LoadingSpinner />
          ) : (
            <DataTable
              columns={columns}
              data={data?.data ?? []}
              onRowClick={handleRowClick}
              emptyMessage={t('noAlerts')}
              emptyIcon={<ShieldAlert className="h-6 w-6" />}
              emptyDescription={t('emptyDescription')}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
              selectedIds={canSelect ? selectedIds : undefined}
              onSelectionChange={canSelect ? setSelectedIds : undefined}
            />
          )}

          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={pagination.setPage}
            total={pagination.total}
          />
        </div>
      </div>

      <AlertDetailDrawer
        alert={selectedAlert}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onInvestigate={canInvestigate ? handleInvestigate : undefined}
        isInvestigating={isInvestigating}
        onCreateCase={
          canCreateCase
            ? alert => {
                setDrawerOpen(false)
                handleCreateCase(alert)
              }
            : undefined
        }
        onEscalateToIncident={canEscalate ? handleEscalateToIncident : undefined}
        onClose={() => setDrawerOpen(false)}
        triageProps={triageProps.canTriage ? triageProps : undefined}
      />

      <AiInvestigationModal
        investigation={investigation}
        open={investigationOpen}
        onOpenChange={setInvestigationOpen}
      />

      <CreateCaseDialog
        open={createCaseOpen}
        onOpenChange={setCreateCaseOpen}
        onSubmit={handleCreateCaseSubmit}
        assigneeOptions={assigneeOptions}
        loading={createCasePending}
      />

      <EscalateToIncidentDialog
        alert={escalateAlert}
        open={escalateOpen}
        onOpenChange={setEscalateOpen}
      />

      {canSelect && (
        <AlertBulkActionBar
          selectedCount={selectedIds.length}
          onAcknowledge={canAcknowledge ? handleBulkAcknowledge : undefined}
          onClose={canClose ? handleBulkClose : undefined}
          onClear={handleClearSelection}
          isAcknowledging={isAcknowledging}
          isClosing={isClosing}
        />
      )}
    </div>
  )
}
