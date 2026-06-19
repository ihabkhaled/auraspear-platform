'use client'

import { OpsKpiGrid, OpsRecentActivity } from '@/components/ai-ops'
import { CollapsibleSection, LoadingSpinner, PageHeader } from '@/components/common'
import { useAiOpsWorkspace } from '@/hooks'

export default function AiOpsPage() {
  const { t, canView, workspace, isLoading } = useAiOpsWorkspace()

  if (!canView) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        {t('noAccess')}
      </div>
    )
  }

  if (isLoading || !workspace) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={t('description')} />

      <OpsKpiGrid t={t} workspace={workspace} />

      <CollapsibleSection title={t('sections.recentActivity')} defaultOpen>
        <OpsRecentActivity
          t={t}
          data={Array.isArray(workspace.recentActivity) ? workspace.recentActivity : []}
        />
      </CollapsibleSection>
    </div>
  )
}
