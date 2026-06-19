'use client'

import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { CollapsibleSection, LoadingSpinner, PageHeader, SearchInput } from '@/components/common'
import {
  TranscriptAuditTable,
  TranscriptKpis,
  TranscriptPolicyPanel,
  TranscriptThreadsTable,
} from '@/components/ai-transcripts'
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui'
import { useAiTranscripts } from '@/hooks'

export default function AiTranscriptsPage() {
  const {
    t,
    canView,
    canManage,
    canExport,
    stats,
    threads,
    totalThreads,
    auditLogs,
    totalAuditLogs,
    policy,
    isLoading,
    isFetchingThreads,
    isFetchingAudit,
    threadSearch,
    legalHoldFilter,
    threadPage,
    auditPage,
    limit,
    setThreadSearch,
    setLegalHoldFilter,
    setThreadPage,
    setAuditPage,
    setSelectedThreadId,
    toggleLegalHold,
    redactThread,
    savePolicy,
    isSavingPolicy,
    runCleanup,
    isCleaningUp,
    handleExportThread,
    handleExportAuditLogs,
  } = useAiTranscripts()

  if (!canView) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        {t('noAccess')}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  const threadPages = Math.ceil(totalThreads / limit)
  const auditPages = Math.ceil(totalAuditLogs / limit)

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
        action={canExport ? {
          label: t('exportAuditLogs'),
          icon: <Download className="h-4 w-4" />,
          onClick: handleExportAuditLogs,
        } : undefined}
      />

      <TranscriptKpis t={t} stats={stats} />

      {canManage && (
        <CollapsibleSection title={t('sections.policy')} defaultOpen>
          <TranscriptPolicyPanel
            t={t}
            policy={policy}
            onSave={savePolicy}
            isSaving={isSavingPolicy}
            onRunCleanup={runCleanup}
            isCleaningUp={isCleaningUp}
          />
        </CollapsibleSection>
      )}

      <CollapsibleSection title={t('sections.threads')} defaultOpen>
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="w-full sm:w-64">
              <SearchInput value={threadSearch} onChange={setThreadSearch} placeholder={t('searchThreads')} />
            </div>
            <Select value={legalHoldFilter || 'all'} onValueChange={v => setLegalHoldFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder={t('allThreads')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allThreads')}</SelectItem>
                <SelectItem value="true">{t('onHoldOnly')}</SelectItem>
                <SelectItem value="false">{t('noHoldOnly')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <TranscriptThreadsTable
            t={t}
            data={threads}
            loading={isFetchingThreads}
            canManage={canManage}
            canExport={canExport}
            onToggleLegalHold={toggleLegalHold}
            onRedact={redactThread}
            onExport={handleExportThread}
            onSelect={setSelectedThreadId}
          />
          {threadPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={threadPage <= 1} onClick={() => setThreadPage(threadPage - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-muted-foreground text-sm">{String(threadPage)} / {String(threadPages)}</span>
              <Button variant="outline" size="sm" disabled={threadPage >= threadPages} onClick={() => setThreadPage(threadPage + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title={t('sections.auditLogs')} defaultOpen>
        <div className="space-y-4">
          <TranscriptAuditTable t={t} data={auditLogs} loading={isFetchingAudit} />
          {auditPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={auditPage <= 1} onClick={() => setAuditPage(auditPage - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-muted-foreground text-sm">{String(auditPage)} / {String(auditPages)}</span>
              <Button variant="outline" size="sm" disabled={auditPage >= auditPages} onClick={() => setAuditPage(auditPage + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CollapsibleSection>
    </div>
  )
}
