'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Toast } from '@/components/common'
import { Permission } from '@/enums'
import { hasPermission } from '@/lib/permissions'
import { buildErrorToastHandler } from '@/lib/toast.utils'
import { aiTranscriptService } from '@/services'
import { useAuthStore, useTenantStore } from '@/stores'
import type {
  AiAuditLogEntry,
  AiTranscriptMessage,
  AiTranscriptPolicy,
  AiTranscriptStats,
  AiTranscriptThread,
} from '@/types'

export function useAiTranscripts() {
  const t = useTranslations('aiTranscripts')
  const tErrors = useTranslations('errors')
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  const queryClient = useQueryClient()

  const canView = hasPermission(permissions, Permission.AI_TRANSCRIPT_VIEW)
  const canManage = hasPermission(permissions, Permission.AI_TRANSCRIPT_MANAGE)
  const canExport = hasPermission(permissions, Permission.AI_TRANSCRIPT_EXPORT)

  const [threadSearch, setThreadSearch] = useState('')
  const [legalHoldFilter, setLegalHoldFilter] = useState('')
  const [threadPage, setThreadPage] = useState(1)
  const [auditPage, setAuditPage] = useState(1)
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const limit = 25

  // Stats
  const statsQuery = useQuery<AiTranscriptStats>({
    queryKey: ['ai-transcripts-stats', tenantId],
    queryFn: () => aiTranscriptService.getStats(),
    enabled: canView,
    staleTime: 30_000,
  })

  // Threads
  const threadsQuery = useQuery<{ data: AiTranscriptThread[]; total: number }>({
    queryKey: ['ai-transcripts-threads', tenantId, threadSearch, legalHoldFilter, threadPage],
    queryFn: () => {
      const params: Record<string, string | number> = { limit, offset: (threadPage - 1) * limit }
      if (threadSearch) params['search'] = threadSearch
      if (legalHoldFilter) params['legalHold'] = legalHoldFilter
      return aiTranscriptService.listThreads(params)
    },
    enabled: canView,
    staleTime: 15_000,
  })

  // Thread messages (when selected)
  const messagesQuery = useQuery<AiTranscriptMessage[]>({
    queryKey: ['ai-transcripts-messages', tenantId, selectedThreadId],
    queryFn: () => aiTranscriptService.getThreadMessages(selectedThreadId!),
    enabled: canView && selectedThreadId !== null,
    staleTime: 30_000,
  })

  // Audit logs
  const auditQuery = useQuery<{ data: AiAuditLogEntry[]; total: number }>({
    queryKey: ['ai-transcripts-audit', tenantId, auditPage],
    queryFn: () => {
      const params: Record<string, string | number> = { limit, offset: (auditPage - 1) * limit }
      return aiTranscriptService.listAuditLogs(params)
    },
    enabled: canView,
    staleTime: 15_000,
  })

  // Policy
  const policyQuery = useQuery<AiTranscriptPolicy | null>({
    queryKey: ['ai-transcripts-policy', tenantId],
    queryFn: () => aiTranscriptService.getPolicy(),
    enabled: canView,
    staleTime: 60_000,
  })

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: ['ai-transcripts-stats', tenantId] })
    void queryClient.invalidateQueries({ queryKey: ['ai-transcripts-threads', tenantId] })
    void queryClient.invalidateQueries({ queryKey: ['ai-transcripts-audit', tenantId] })
  }

  // Mutations
  const legalHoldMutation = useMutation({
    mutationFn: ({ threadId, legalHold }: { threadId: string; legalHold: boolean }) =>
      aiTranscriptService.toggleLegalHold(threadId, legalHold),
    onSuccess: () => {
      invalidateAll()
      Toast.success(t('legalHoldUpdated'))
    },
    onError: buildErrorToastHandler(tErrors),
  })

  const redactMutation = useMutation({
    mutationFn: (threadId: string) => aiTranscriptService.redactThread(threadId),
    onSuccess: () => {
      invalidateAll()
      Toast.success(t('threadRedacted'))
    },
    onError: buildErrorToastHandler(tErrors),
  })

  const policyMutation = useMutation({
    mutationFn: (data: {
      chatRetentionDays: number
      auditRetentionDays: number
      autoRedactPii: boolean
      requireLegalHold: boolean
    }) => aiTranscriptService.upsertPolicy(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ai-transcripts-policy', tenantId] })
      Toast.success(t('policySaved'))
    },
    onError: buildErrorToastHandler(tErrors),
  })

  const cleanupMutation = useMutation({
    mutationFn: () => aiTranscriptService.runCleanup(),
    onSuccess: (result) => {
      invalidateAll()
      Toast.success(`${t('cleanupDone')}: ${String(result.chats)} chats, ${String(result.audits)} audits`)
    },
    onError: buildErrorToastHandler(tErrors),
  })

  function handleExportThread(threadId: string) {
    aiTranscriptService.exportThread(threadId).then(result => {
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `transcript-${threadId.slice(0, 8)}.json`
      a.click()
      URL.revokeObjectURL(url)
      Toast.success(t('exportDone'))
    }).catch(buildErrorToastHandler(tErrors))
  }

  function handleExportAuditLogs() {
    aiTranscriptService.exportAuditLogs().then(result => {
      const exportData = Array.isArray(result) ? result : []
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ai-audit-logs-${tenantId ?? 'tenant'}.json`
      a.click()
      URL.revokeObjectURL(url)
      Toast.success(t('exportDone'))
    }).catch(buildErrorToastHandler(tErrors))
  }

  const stats = statsQuery.data ?? null
  const threads = Array.isArray(threadsQuery.data?.data) ? threadsQuery.data.data : []
  const totalThreads = Number(threadsQuery.data?.total ?? 0)
  const messages = Array.isArray(messagesQuery.data) ? messagesQuery.data : []
  const auditLogs = Array.isArray(auditQuery.data?.data) ? auditQuery.data.data : []
  const totalAuditLogs = Number(auditQuery.data?.total ?? 0)
  const policy = policyQuery.data ?? null

  return {
    t,
    canView,
    canManage,
    canExport,
    stats,
    threads,
    totalThreads,
    messages,
    auditLogs,
    totalAuditLogs,
    policy,
    isLoading: statsQuery.isLoading,
    isFetchingThreads: threadsQuery.isFetching,
    isFetchingAudit: auditQuery.isFetching,
    isLoadingMessages: messagesQuery.isLoading,
    threadSearch,
    legalHoldFilter,
    threadPage,
    auditPage,
    limit,
    selectedThreadId,
    setThreadSearch: (v: string) => { setThreadSearch(v); setThreadPage(1) },
    setLegalHoldFilter: (v: string) => { setLegalHoldFilter(v); setThreadPage(1) },
    setThreadPage,
    setAuditPage,
    setSelectedThreadId,
    toggleLegalHold: legalHoldMutation.mutate,
    redactThread: redactMutation.mutate,
    savePolicy: policyMutation.mutate,
    isSavingPolicy: policyMutation.isPending,
    runCleanup: () => cleanupMutation.mutate(),
    isCleaningUp: cleanupMutation.isPending,
    handleExportThread,
    handleExportAuditLogs,
  }
}
