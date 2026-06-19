'use client'

import { useSystemHealthPageDetail } from './useSystemHealthPageDetail'
import { useSystemHealthPageFilters } from './useSystemHealthPageFilters'

export function useSystemHealthPage() {
  const filters = useSystemHealthPageFilters()
  const detail = useSystemHealthPageDetail({ metricsData: filters.metricsData })

  return {
    t: filters.t,
    tCommon: filters.tCommon,
    data: filters.data,
    stats: filters.stats,
    statsLoading: filters.statsLoading,
    latestChecks: filters.latestChecks,
    columns: filters.columns,
    searchQuery: filters.searchQuery,
    handleSearchChange: filters.handleSearchChange,
    isFetching: filters.isFetching,
    pagination: filters.pagination,
    serviceTypeFilter: filters.serviceTypeFilter,
    statusFilter: filters.statusFilter,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    detailOpen: detail.detailOpen,
    setDetailOpen: detail.setDetailOpen,
    selectedCheck: detail.selectedCheck,
    detailMetrics: detail.detailMetrics,
    handleServiceTypeChange: filters.handleServiceTypeChange,
    handleStatusChange: filters.handleStatusChange,
    handleSort: filters.handleSort,
    handleOpenDetail: detail.handleOpenDetail,
  }
}
