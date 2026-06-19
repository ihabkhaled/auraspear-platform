'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { getAlertColumns } from '@/components/alerts'
import { Toast } from '@/components/common'
import { Permission, SortOrder, type AlertSeverity, type TimeRange } from '@/enums'
import { SEVERITY_ORDER, parseKQLQuery } from '@/lib/alert.utils'
import { VALID_SEVERITIES, VALID_TIME_RANGES } from '@/lib/constants/alerts'
import { hasPermission } from '@/lib/permissions'
import { copyToClipboard } from '@/lib/utils'
import { useAuthStore, useFilterStore } from '@/stores'
import type { Alert, AIInvestigation, AlertSearchParams, CreateCaseFormValues } from '@/types'
import { useAiAlertTriage } from './useAiAlertTriage'
import { useAlertBulkActions } from './useAlertBulkActions'
import { useAlerts, useInvestigateAlert } from './useAlerts'
import { useCreateCase, useTenantMembers } from './useCases'
import { useDebounce } from './useDebounce'
import { usePagination } from './usePagination'

export function useAlertsPage() {
  const t = useTranslations('alerts')
  const tCommon = useTranslations('common')
  const urlSearchParams = useSearchParams()
  const urlAppliedRef = useRef(false)

  const permissions = useAuthStore(s => s.permissions)
  const canInvestigate = hasPermission(permissions, Permission.ALERTS_INVESTIGATE)
  const canAcknowledge = hasPermission(permissions, Permission.ALERTS_ACKNOWLEDGE)
  const canClose = hasPermission(permissions, Permission.ALERTS_CLOSE)
  const canEscalate =
    hasPermission(permissions, Permission.ALERTS_ESCALATE) &&
    hasPermission(permissions, Permission.INCIDENTS_CREATE)
  const canCreateCase = hasPermission(permissions, Permission.CASES_CREATE)
  const canSelect = canAcknowledge || canClose

  const {
    severity: selectedSeverities,
    setSeverity,
    timeRange,
    setTimeRange,
    kqlQuery,
    setKqlQuery,
  } = useFilterStore()

  // Apply URL search params to filter store on initial mount
  useEffect(() => {
    if (urlAppliedRef.current) {
      return
    }
    urlAppliedRef.current = true

    const urlTimeRange = urlSearchParams.get('timeRange')
    if (urlTimeRange && VALID_TIME_RANGES.includes(urlTimeRange)) {
      setTimeRange(urlTimeRange as TimeRange)
    }

    const urlSeverity = urlSearchParams.get('severity')
    if (urlSeverity) {
      const severities = urlSeverity
        .split(',')
        .filter(s => VALID_SEVERITIES.includes(s)) as AlertSeverity[]
      if (severities.length > 0) {
        setSeverity(severities)
      }
    }
  }, [urlSearchParams, setTimeRange, setSeverity])

  const [agentFilter, setAgentFilter] = useState('')
  const [ruleGroup, setRuleGroup] = useState('')
  const [sortBy, setSortBy] = useState('timestamp')
  const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.DESC)
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [investigation, setInvestigation] = useState<AIInvestigation | null>(null)
  const [investigationOpen, setInvestigationOpen] = useState(false)
  const [createCaseOpen, setCreateCaseOpen] = useState(false)
  const [createCaseAlert, setCreateCaseAlert] = useState<Alert | null>(null)
  const [escalateOpen, setEscalateOpen] = useState(false)
  const [escalateAlert, setEscalateAlert] = useState<Alert | null>(null)

  const bulkActions = useAlertBulkActions()
  const triage = useAiAlertTriage(selectedAlert?.id ?? '')

  const pagination = usePagination({ initialPage: 1, initialLimit: 10 })
  const debouncedQuery = useDebounce(kqlQuery, 400)
  const debouncedAgentFilter = useDebounce(agentFilter, 400)
  const debouncedRuleGroup = useDebounce(ruleGroup, 400)

  // Parse KQL query: field:value tokens are extracted and sent as dedicated params
  const parsed = parseKQLQuery(debouncedQuery)

  const searchParams: AlertSearchParams = {
    page: pagination.page,
    limit: pagination.limit,
    timeRange,
    sortBy,
    sortOrder,
  }

  // KQL-parsed severity takes precedence over checkbox selection when present
  if (parsed.severity) {
    searchParams.severity = parsed.severity
  } else if (selectedSeverities.length > 0) {
    searchParams.severity = selectedSeverities.join(',')
  }

  if (parsed.status) {
    searchParams.status = parsed.status
  }

  if (parsed.source) {
    searchParams.source = parsed.source
  }

  // KQL-parsed agentName takes precedence over dedicated agent filter
  if (parsed.agentName) {
    searchParams.agentName = parsed.agentName
  } else if (debouncedAgentFilter.length > 0) {
    searchParams.agentName = debouncedAgentFilter
  }

  // KQL-parsed ruleGroup takes precedence over dedicated rule group filter
  if (parsed.ruleGroup) {
    searchParams.ruleGroup = parsed.ruleGroup
  } else if (debouncedRuleGroup.length > 0) {
    searchParams.ruleGroup = debouncedRuleGroup
  }

  // Only send the free-text portion (non-field tokens) as full-text query
  if (parsed.query && parsed.query.length > 0) {
    searchParams.query = parsed.query
  }

  const { data, isLoading } = useAlerts(searchParams)
  const { data: membersData } = useTenantMembers()

  const assigneeOptions = useMemo(
    () =>
      (membersData?.data ?? []).map(m => ({
        label: `${m.name} (${m.email})`,
        value: m.id,
      })),
    [membersData]
  )

  const investigateMutation = useInvestigateAlert()
  const createCaseMutation = useCreateCase()

  useEffect(() => {
    if (data?.pagination) {
      pagination.setTotal(data.pagination.total)
    }
  }, [data?.pagination, pagination])

  const severityCounts = useMemo(() => {
    return SEVERITY_ORDER.map(sev => ({
      severity: sev,
      count: data?.data?.filter(a => a.severity === sev).length ?? 0,
    }))
  }, [data?.data])

  const handleRowClick = useCallback((alert: Alert) => {
    setSelectedAlert(alert)
    setDrawerOpen(true)
  }, [])

  const handleInvestigate = useCallback(
    (alert: Alert) => {
      investigateMutation.mutate(alert.id, {
        onSuccess: result => {
          setInvestigation(result.data)
          setInvestigationOpen(true)
          setDrawerOpen(false)
        },
        onError: () => {
          Toast.error(t('investigateError'))
        },
      })
    },
    [investigateMutation, t]
  )

  const handleCreateCase = useCallback((alert: Alert) => {
    setCreateCaseAlert(alert)
    setCreateCaseOpen(true)
  }, [])

  const handleEscalateToIncident = useCallback((alert: Alert) => {
    setEscalateAlert(alert)
    setEscalateOpen(true)
    setDrawerOpen(false)
  }, [])

  const handleCreateCaseSubmit = useCallback(
    (formData: CreateCaseFormValues) => {
      createCaseMutation.mutate(
        {
          title: formData.title,
          description: formData.description,
          severity: formData.severity,
          ...(formData.assignee ? { ownerUserId: formData.assignee } : {}),
          linkedAlertIds: createCaseAlert ? [createCaseAlert.id] : [],
        },
        {
          onSuccess: () => {
            setCreateCaseOpen(false)
            setCreateCaseAlert(null)
            Toast.success(t('createCaseSuccess'))
          },
          onError: () => {
            Toast.error(t('createCaseError'))
          },
        }
      )
    },
    [createCaseMutation, createCaseAlert, t]
  )

  const handleCopyId = useCallback(
    (id: string) => {
      void copyToClipboard(id)
      Toast.success(tCommon('copied'))
    },
    [tCommon]
  )

  // Wrap filter store setters to reset page on every filter change
  const handleTimeRangeChange = useCallback(
    (range: TimeRange) => {
      pagination.setPage(1)
      setTimeRange(range)
    },
    [pagination, setTimeRange]
  )

  const handleSeverityChange = useCallback(
    (severities: AlertSeverity[]) => {
      pagination.setPage(1)
      setSeverity(severities)
    },
    [pagination, setSeverity]
  )

  const handleSearchSubmit = useCallback(() => {
    pagination.setPage(1)
  }, [pagination])

  const handleSort = useCallback(
    (key: string, order: SortOrder) => {
      pagination.setPage(1)
      setSortBy(key)
      setSortOrder(order)
    },
    [pagination]
  )

  const columns = useMemo(() => {
    return getAlertColumns(
      { alerts: t, common: tCommon },
      {
        onView: handleRowClick,
        onInvestigate: canInvestigate ? handleInvestigate : undefined,
        onCreateCase: handleCreateCase,
        onCopyId: handleCopyId,
      }
    )
  }, [
    t,
    tCommon,
    handleRowClick,
    handleInvestigate,
    handleCreateCase,
    handleCopyId,
    canInvestigate,
  ])

  return {
    t,
    selectedSeverities,
    setSeverity: handleSeverityChange,
    timeRange,
    setTimeRange: handleTimeRangeChange,
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
    createCasePending: createCaseMutation.isPending,
    handleCreateCaseSubmit,
    handleCreateCase,
    assigneeOptions,
    createCaseAlert,
    isLoading,
    data,
    pagination,
    severityCounts,
    columns,
    handleRowClick,
    handleInvestigate,
    handleSearchSubmit,
    sortBy,
    sortOrder,
    handleSort,
    isInvestigating: investigateMutation.isPending,
    canInvestigate,
    canAcknowledge,
    canClose,
    canEscalate,
    canCreateCase,
    canSelect,
    // Bulk actions
    selectedIds: bulkActions.selectedIds,
    setSelectedIds: bulkActions.setSelectedIds,
    handleBulkAcknowledge: bulkActions.handleBulkAcknowledge,
    handleBulkClose: bulkActions.handleBulkClose,
    handleClearSelection: bulkActions.handleClearSelection,
    isAcknowledging: bulkActions.isAcknowledging,
    isClosing: bulkActions.isClosing,
    // Escalation
    escalateOpen,
    setEscalateOpen,
    escalateAlert,
    handleEscalateToIncident,
    // AI Triage
    triageProps: {
      canTriage: triage.canTriage,
      results: triage.results,
      activeTask: triage.activeTask,
      isLoading: triage.isLoading,
      onSummarize: triage.handleSummarize,
      onExplainSeverity: triage.handleExplainSeverity,
      onFalsePositiveScore: triage.handleFalsePositiveScore,
      onNextAction: triage.handleNextAction,
      tCommon: triage.tCommon,
    },
  }
}
