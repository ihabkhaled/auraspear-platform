'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Toast } from '@/components/common'
import { AiFindingStatus, AiFindingType, AlertSeverity, Permission, SortOrder } from '@/enums'
import { hasPermission } from '@/lib/permissions'
import { buildErrorToastHandler } from '@/lib/toast.utils'
import { agentConfigService, aiHandoffService } from '@/services'
import { useAuthStore, useTenantStore } from '@/stores'
import type { AiExecutionFinding, AiFindingsStats } from '@/types'

export function useAiFindingsPage() {
  const t = useTranslations('aiFindings')
  const tErrors = useTranslations('errors')
  const tenantId = useTenantStore(s => s.currentTenantId)
  const permissions = useAuthStore(s => s.permissions)
  const queryClient = useQueryClient()

  // Filter state
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [agentId, setAgentId] = useState('')
  const [sourceModule, setSourceModule] = useState('')
  const [status, setStatus] = useState('')
  const [findingType, setFindingType] = useState('')
  const [severity, setSeverity] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.DESC)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [selectedFinding, setSelectedFinding] = useState<AiExecutionFinding | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [detailOpen, setDetailOpen] = useState(false)

  // Debounce timer ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value)
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(value)
      setPage(1)
    }, 400)
  }, [])

  const handleFilterChange = useCallback(
    (filter: string, value: string) => {
      const resolved = value === 'all' ? '' : value
      switch (filter) {
        case 'agentId':
          setAgentId(resolved)
          break
        case 'sourceModule':
          setSourceModule(resolved)
          break
        case 'status':
          setStatus(resolved)
          break
        case 'findingType':
          setFindingType(resolved)
          break
        case 'severity':
          setSeverity(resolved)
          break
        default:
          break
      }
      setPage(1)
    },
    []
  )

  const handleSort = useCallback((field: string, order: SortOrder) => {
    setSortBy(field)
    setSortOrder(order)
    setPage(1)
  }, [])

  const handleClearFilters = useCallback(() => {
    setQuery('')
    setDebouncedQuery('')
    setAgentId('')
    setSourceModule('')
    setStatus('')
    setFindingType('')
    setSeverity('')
    setPage(1)
  }, [])

  const handleRowClick = useCallback((finding: AiExecutionFinding) => {
    setSelectedFinding(finding)
    setDetailOpen(true)
  }, [])

  const handleLimitChange = useCallback((value: string) => {
    setLimit(Number(value))
    setPage(1)
  }, [])

  // Build query params
  const queryParams = useMemo(() => {
    const params: Record<string, string | number> = { page, limit }
    if (debouncedQuery) {
      params['query'] = debouncedQuery
    }
    if (agentId) {
      params['agentId'] = agentId
    }
    if (sourceModule) {
      params['sourceModule'] = sourceModule
    }
    if (status) {
      params['status'] = status
    }
    if (findingType) {
      params['findingType'] = findingType
    }
    if (severity) {
      params['severity'] = severity
    }
    if (sortBy) {
      params['sortBy'] = sortBy
    }
    if (sortOrder) {
      params['sortOrder'] = sortOrder
    }
    return params
  }, [page, limit, debouncedQuery, agentId, sourceModule, status, findingType, severity, sortBy, sortOrder])

  // Findings list query
  const findingsQuery = useQuery({
    queryKey: ['ai-findings', 'page', tenantId, queryParams],
    queryFn: () => agentConfigService.getFindings(queryParams),
    placeholderData: keepPreviousData,
  })

  // Stats query
  const statsQuery = useQuery({
    queryKey: ['ai-findings-stats', tenantId],
    queryFn: () => agentConfigService.getFindingsStats(),
  })

  // Status update mutation
  const statusMutation = useMutation({
    mutationFn: ({ id, newStatus }: { id: string; newStatus: string }) =>
      agentConfigService.updateFindingStatus(id, newStatus),
    onSuccess: () => {
      Toast.success(t('statusUpdated'))
      queryClient.invalidateQueries({ queryKey: ['ai-findings', 'page', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['ai-findings-stats', tenantId] })
    },
    onError: buildErrorToastHandler(tErrors),
  })

  const handleUpdateStatus = useCallback(
    (id: string, newStatus: string) => {
      statusMutation.mutate({ id, newStatus })
    },
    [statusMutation]
  )

  const canPromote = hasPermission(permissions, Permission.AI_HANDOFF_PROMOTE)

  const promoteMutation = useMutation({
    mutationFn: ({ findingId, targetModule }: { findingId: string; targetModule: string }) =>
      aiHandoffService.promote({ findingId, targetModule }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['ai-findings'] })
      void queryClient.invalidateQueries({ queryKey: ['ai-findings-stats'] })
      void queryClient.invalidateQueries({ queryKey: ['ai-handoffs-stats'] })
      void queryClient.invalidateQueries({ queryKey: ['ai-handoffs-history'] })
      Toast.success(`${t('promotedTo')} ${result.targetModule} (${result.createdEntityId.slice(0, 8)})`)
      setDetailOpen(false)
    },
    onError: buildErrorToastHandler(tErrors),
  })

  const handlePromote = useCallback(
    (findingId: string, targetModule: string) => {
      promoteMutation.mutate({ findingId, targetModule })
    },
    [promoteMutation]
  )

  const bulkStatusMutation = useMutation({
    mutationFn: ({ ids, newStatus }: { ids: string[]; newStatus: string }) =>
      agentConfigService.bulkUpdateFindingStatus(ids, newStatus),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['ai-findings'] })
      void queryClient.invalidateQueries({ queryKey: ['ai-findings-stats'] })
      const updated = (result as { data?: { updated?: number } })?.data?.updated ?? 0
      Toast.success(`${t('bulkStatusUpdated')}: ${String(updated)}`)
    },
    onError: buildErrorToastHandler(tErrors),
  })

  function handleExportFindings() {
    // If findings are selected, export only those; otherwise export with current filters
    if (selectedIds.size > 0) {
      const selected = findings.filter(f => selectedIds.has(f.id))
      const blob = new Blob([JSON.stringify(selected, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ai-findings-export-${String(selectedIds.size)}.json`
      a.click()
      URL.revokeObjectURL(url)
      Toast.success(t('exportDone'))
      return
    }

    agentConfigService
      .exportFindings((() => {
        const params: Record<string, string> = {}
        if (status) params['status'] = status
        if (agentId) params['agentId'] = agentId
        if (sourceModule) params['sourceModule'] = sourceModule
        return params
      })())
      .then(result => {
        const exportData = (result as { data?: AiExecutionFinding[] })?.data ?? []
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `ai-findings-export.json`
        a.click()
        URL.revokeObjectURL(url)
        Toast.success(t('exportDone'))
      })
      .catch(buildErrorToastHandler(tErrors))
  }

  function handleBulkDismiss() {
    bulkStatusMutation.mutate({ ids: [...selectedIds], newStatus: AiFindingStatus.DISMISSED })
    setSelectedIds(new Set())
  }

  function handleBulkApply() {
    bulkStatusMutation.mutate({ ids: [...selectedIds], newStatus: AiFindingStatus.APPLIED })
    setSelectedIds(new Set())
  }

  function toggleSelectFinding(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === findings.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(findings.map(f => f.id)))
    }
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  const findings: AiExecutionFinding[] = findingsQuery.data?.data ?? []
  const pagination = findingsQuery.data?.pagination ?? null

  const stats: AiFindingsStats = statsQuery.data?.data ?? {
    total: 0,
    proposed: 0,
    applied: 0,
    dismissed: 0,
    failed: 0,
    highConfidence: 0,
    bySeverity: {},
    byAgent: [],
    byModule: [],
  }

  // Active filters for chips
  const activeFilters = useMemo(() => {
    const filters: Array<{ key: string; label: string; value: string }> = []
    if (debouncedQuery) {
      filters.push({ key: 'query', label: t('searchPlaceholder'), value: debouncedQuery })
    }
    if (agentId) {
      filters.push({ key: 'agentId', label: t('agent'), value: agentId })
    }
    if (sourceModule) {
      filters.push({ key: 'sourceModule', label: t('module'), value: sourceModule })
    }
    if (status) {
      filters.push({ key: 'status', label: t('status'), value: status })
    }
    if (findingType) {
      filters.push({ key: 'findingType', label: t('type'), value: findingType })
    }
    if (severity) {
      filters.push({ key: 'severity', label: t('severity'), value: severity })
    }
    return filters
  }, [debouncedQuery, agentId, sourceModule, status, findingType, severity, t])

  const handleRemoveFilter = useCallback(
    (key: string) => {
      switch (key) {
        case 'query':
          setQuery('')
          setDebouncedQuery('')
          break
        case 'agentId':
          setAgentId('')
          break
        case 'sourceModule':
          setSourceModule('')
          break
        case 'status':
          setStatus('')
          break
        case 'findingType':
          setFindingType('')
          break
        case 'severity':
          setSeverity('')
          break
        default:
          break
      }
      setPage(1)
    },
    []
  )

  // Dropdown options from stats
  const agentOptions = useMemo(
    () => stats.byAgent.map(a => a.agentId).sort(),
    [stats.byAgent]
  )

  const moduleOptions = useMemo(
    () => stats.byModule.map(m => m.sourceModule).sort(),
    [stats.byModule]
  )

  const statusOptions = useMemo(
    () =>
      Object.values(AiFindingStatus) as string[],
    []
  )

  const findingTypeOptions = useMemo(
    () =>
      Object.values(AiFindingType) as string[],
    []
  )

  const severityOptions = useMemo(
    () =>
      Object.values(AlertSeverity) as string[],
    []
  )

  const totalPages = pagination?.totalPages ?? 1

  return {
    t,
    permissions,
    findings,
    pagination,
    stats,
    isLoading: findingsQuery.isLoading,
    isFetching: findingsQuery.isFetching,
    statsLoading: statsQuery.isLoading,
    query,
    agentId,
    sourceModule,
    status,
    findingType,
    severity,
    sortBy,
    sortOrder,
    page,
    limit,
    totalPages,
    selectedFinding,
    detailOpen,
    activeFilters,
    agentOptions,
    moduleOptions,
    statusOptions,
    findingTypeOptions,
    severityOptions,
    handleQueryChange,
    handleFilterChange,
    handleSort,
    handleClearFilters,
    handleRowClick,
    handleRemoveFilter,
    handleUpdateStatus,
    statusLoading: statusMutation.isPending,
    handlePromote,
    promoteLoading: promoteMutation.isPending,
    canPromote,
    handleExportFindings,
    handleBulkDismiss,
    handleBulkApply,
    isBulkLoading: bulkStatusMutation.isPending,
    selectedIds,
    toggleSelectFinding,
    toggleSelectAll,
    clearSelection,
    setPage,
    setDetailOpen,
    handleLimitChange,
  }
}
