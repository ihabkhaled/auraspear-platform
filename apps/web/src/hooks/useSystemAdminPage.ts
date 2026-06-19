import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Permission, SortOrder, SystemAdminTab } from '@/enums'
import { hasPermission } from '@/lib/permissions'
import { useAuthStore } from '@/stores'
import type { ApplicationLogEntry } from '@/types'
import { useServiceHealth, useAuditLogs } from './useAdmin'
import { useAppLogs } from './useAppLogs'
import { useDebounce } from './useDebounce'
import { usePagination } from './usePagination'

export function useSystemAdminPage() {
  const t = useTranslations('admin')
  const permissions = useAuthStore(s => s.permissions)
  const { data: healthData, isLoading: healthLoading, isError: healthError } = useServiceHealth()

  const canCreateTenant = hasPermission(permissions, Permission.ADMIN_TENANTS_CREATE)
  const canEditTenant = hasPermission(permissions, Permission.ADMIN_TENANTS_UPDATE)
  const canDeleteTenant = hasPermission(permissions, Permission.ADMIN_TENANTS_DELETE)
  const canCreateUser = hasPermission(permissions, Permission.ADMIN_USERS_CREATE)
  const canEditUser = hasPermission(permissions, Permission.ADMIN_USERS_UPDATE)
  const canDeleteUser = hasPermission(permissions, Permission.ADMIN_USERS_DELETE)
  const canBlockUser = hasPermission(permissions, Permission.ADMIN_USERS_BLOCK)

  // App log detail dialog
  const [selectedLog, setSelectedLog] = useState<ApplicationLogEntry | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const handleLogClick = useCallback((log: ApplicationLogEntry) => {
    setSelectedLog(log)
    setDetailOpen(true)
  }, [])

  const handleDetailClose = useCallback(() => {
    setDetailOpen(false)
    setSelectedLog(null)
  }, [])

  // Active tab
  const [activeTab, setActiveTab] = useState<SystemAdminTab>(SystemAdminTab.AUDIT)

  // ── Audit logs state ──
  const auditPagination = usePagination({ initialPage: 1, initialLimit: 10 })
  const [auditSortBy, setAuditSortBy] = useState('createdAt')
  const [auditSortOrder, setAuditSortOrder] = useState<SortOrder>(SortOrder.DESC)

  const { data: auditData, isLoading: auditLoading } = useAuditLogs({
    page: auditPagination.page,
    limit: auditPagination.limit,
    sortBy: auditSortBy,
    sortOrder: auditSortOrder,
  })

  useEffect(() => {
    if (auditData?.pagination) {
      auditPagination.setTotal(auditData.pagination.total)
    }
  }, [auditData?.pagination, auditPagination])

  const handleAuditSort = useCallback(
    (key: string, order: SortOrder) => {
      auditPagination.resetPage()
      setAuditSortBy(key)
      setAuditSortOrder(order)
    },
    [auditPagination]
  )

  // ── App logs state ──
  const appLogPagination = usePagination({ initialPage: 1, initialLimit: 20 })
  const [appLogSortBy, setAppLogSortBy] = useState('createdAt')
  const [appLogSortOrder, setAppLogSortOrder] = useState<SortOrder>(SortOrder.DESC)
  const [appLogSearch, setAppLogSearch] = useState('')
  const [appLogLevel, setAppLogLevel] = useState('')
  const [appLogFeature, setAppLogFeature] = useState('')
  const [appLogActorEmail, setAppLogActorEmail] = useState('')
  const debouncedAppLogSearch = useDebounce(appLogSearch, 400)

  const { data: appLogData, isFetching: appLogFetching } = useAppLogs({
    page: appLogPagination.page,
    limit: appLogPagination.limit,
    sortBy: appLogSortBy,
    sortOrder: appLogSortOrder,
    query: debouncedAppLogSearch || undefined,
    level: appLogLevel || undefined,
    feature: appLogFeature || undefined,
    actorEmail: appLogActorEmail || undefined,
  })

  useEffect(() => {
    if (appLogData?.pagination) {
      appLogPagination.setTotal(appLogData.pagination.total)
    }
  }, [appLogData?.pagination, appLogPagination])

  // Reset page on filter change — use ref to avoid including pagination in deps
  // resetPage is a stable useCallback with [] deps, so initializing the ref once is safe
  const appLogResetPageRef = useRef(appLogPagination.resetPage)

  useEffect(() => {
    appLogResetPageRef.current = appLogPagination.resetPage
  }, [appLogPagination.resetPage])

  useEffect(() => {
    appLogResetPageRef.current()
  }, [debouncedAppLogSearch, appLogLevel, appLogFeature, appLogActorEmail])

  const handleAppLogSort = useCallback(
    (key: string, order: SortOrder) => {
      appLogPagination.resetPage()
      setAppLogSortBy(key)
      setAppLogSortOrder(order)
    },
    [appLogPagination]
  )

  const resetAppLogFilters = useCallback(() => {
    setAppLogSearch('')
    setAppLogLevel('')
    setAppLogFeature('')
    setAppLogActorEmail('')
    appLogPagination.resetPage()
  }, [appLogPagination])

  return {
    t,

    // Tab
    activeTab,
    setActiveTab,

    // Health
    healthData,
    healthLoading,
    healthError,

    // App log detail dialog
    selectedLog,
    detailOpen,
    handleLogClick,
    handleDetailClose,

    // Audit logs
    auditData,
    auditLoading,
    pagination: auditPagination,
    auditSortBy,
    auditSortOrder,
    handleAuditSort,

    // App logs
    appLogData,
    appLogFetching,
    appLogPagination,
    appLogSortBy,
    appLogSortOrder,
    handleAppLogSort,
    appLogSearch,
    setAppLogSearch,
    appLogLevel,
    setAppLogLevel,
    appLogFeature,
    setAppLogFeature,
    appLogActorEmail,
    setAppLogActorEmail,
    resetAppLogFilters,

    // Permissions
    canCreateTenant,
    canEditTenant,
    canDeleteTenant,
    canCreateUser,
    canEditUser,
    canDeleteUser,
    canBlockUser,
  }
}
