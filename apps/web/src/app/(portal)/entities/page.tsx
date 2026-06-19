'use client'

import { Network } from 'lucide-react'
import {
  PageHeader,
  DataTable,
  Pagination,
  LoadingSpinner,
  OsintEnrichButton,
  OsintFileUploadButton,
} from '@/components/common'
import { EntityFilters, EntityGraphPanel, RiskScoreBadge } from '@/components/entities'
import { Badge, Button } from '@/components/ui'
import { useEntitiesPage } from '@/hooks'
import { isEnrichableEntityType, isFileOrHashType, normalizeIocType } from '@/lib/entity.utils'
import { formatTimestamp } from '@/lib/utils'
import type { Column, EntityRecord } from '@/types'

export default function EntitiesPage() {
  const {
    t,
    tCommon,
    searchQuery,
    typeFilter,
    sortBy,
    sortOrder,
    pagination,
    data,
    isFetching,
    handleSearchChange,
    handleTypeChange,
    handleSort,
    graphOpen,
    setGraphOpen,
    graphData,
    graphLoading,
    handleOpenGraph,
  } = useEntitiesPage()

  const entities: EntityRecord[] = data?.data ?? []

  const columns: Column<EntityRecord>[] = [
    {
      key: 'type',
      label: t('colType'),
      sortable: true,
      render: value => (
        <Badge variant="outline" className="text-xs uppercase">
          {value as string}
        </Badge>
      ),
    },
    {
      key: 'value',
      label: t('colValue'),
      sortable: true,
    },
    {
      key: 'riskScore',
      label: t('colRiskScore'),
      sortable: true,
      render: value => <RiskScoreBadge score={value as number} />,
    },
    {
      key: 'firstSeen',
      label: t('colFirstSeen'),
      sortable: true,
      render: value => formatTimestamp(value as string),
    },
    {
      key: 'lastSeen',
      label: t('colLastSeen'),
      sortable: true,
      render: value => formatTimestamp(value as string),
    },
    {
      key: 'id',
      label: t('colActions'),
      render: (_value, row) => (
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 px-2"
            onClick={e => {
              e.stopPropagation()
              handleOpenGraph(row.id)
            }}
          >
            <Network className="h-3.5 w-3.5" />
            {t('viewGraph')}
          </Button>
          {isEnrichableEntityType(row.type) && (
            <OsintEnrichButton
              iocType={normalizeIocType(row.type)}
              iocValue={row.value}
              t={tCommon}
            />
          )}
          {isFileOrHashType(row.type) && <OsintFileUploadButton t={tCommon} />}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader title={t('title')} description={t('description')} />

      <EntityFilters
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        typeFilter={typeFilter}
        onTypeChange={handleTypeChange}
        t={t}
      />

      {isFetching && entities.length === 0 ? (
        <LoadingSpinner />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={entities}
            emptyMessage={t('noEntities')}
            loading={isFetching}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
          />
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={pagination.setPage}
          />
        </>
      )}

      <EntityGraphPanel
        open={graphOpen}
        onOpenChange={setGraphOpen}
        graphData={graphData}
        graphLoading={graphLoading}
        t={t}
      />
    </div>
  )
}
