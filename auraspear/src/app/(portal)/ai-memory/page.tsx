'use client'

import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { CollapsibleSection, LoadingSpinner, PageHeader, SearchInput } from '@/components/common'
import {
  MemoryGovernanceKpis,
  MemoryGovernanceTable,
  MemoryRetentionPanel,
} from '@/components/ai-memory'
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { MemoryCategory } from '@/enums'
import { useAiMemoryGovernance } from '@/hooks'

export default function AiMemoryGovernancePage() {
  const {
    t,
    canAdmin,
    canExport,
    stats,
    memories,
    totalMemories,
    retention,
    isLoading,
    isFetching,
    searchQuery,
    categoryFilter,
    userFilter,
    page,
    limit,
    setPage,
    handleSearchChange,
    handleCategoryChange,
    handleUserChange,
    handleExport,
    saveRetention,
    isSavingRetention,
    runCleanup,
    isCleaningUp,
    deleteUserMemories,
  } = useAiMemoryGovernance()

  if (!canAdmin) {
    return (
      <div className="text-muted-foreground flex h-64 items-center justify-center">
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

  const totalPages = Math.ceil(totalMemories / limit)

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
        action={
          canExport
            ? {
                label: t('export'),
                icon: <Download className="h-4 w-4" />,
                onClick: handleExport,
              }
            : undefined
        }
      />

      <MemoryGovernanceKpis t={t} stats={stats} />

      <CollapsibleSection title={t('sections.retention')} defaultOpen>
        <MemoryRetentionPanel
          t={t}
          retention={retention}
          onSave={saveRetention}
          isSaving={isSavingRetention}
          onRunCleanup={runCleanup}
          isCleaningUp={isCleaningUp}
        />
      </CollapsibleSection>

      <CollapsibleSection title={t('sections.allMemories')} defaultOpen>
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="w-full sm:w-64">
              <SearchInput
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder={t('searchPlaceholder')}
              />
            </div>
            <Select
              value={categoryFilter || 'all'}
              onValueChange={v => handleCategoryChange(v === 'all' ? '' : v)}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder={t('allCategories')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allCategories')}</SelectItem>
                <SelectItem value={MemoryCategory.FACT}>{t('categoryFact')}</SelectItem>
                <SelectItem value={MemoryCategory.PREFERENCE}>{t('categoryPreference')}</SelectItem>
                <SelectItem value={MemoryCategory.INSTRUCTION}>
                  {t('categoryInstruction')}
                </SelectItem>
                <SelectItem value={MemoryCategory.CONTEXT}>{t('categoryContext')}</SelectItem>
              </SelectContent>
            </Select>
            <Input
              className="w-full sm:w-48"
              placeholder={t('filterByUser')}
              value={userFilter}
              onChange={e => handleUserChange(e.currentTarget.value)}
            />
          </div>

          <MemoryGovernanceTable
            t={t}
            data={memories}
            loading={isFetching}
            canAdmin={canAdmin}
            onDeleteUserMemories={deleteUserMemories}
          />

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-muted-foreground text-sm">
                {String(page)} / {String(totalPages)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CollapsibleSection>
    </div>
  )
}
