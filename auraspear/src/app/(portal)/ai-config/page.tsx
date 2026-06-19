'use client'

import {
  BookText,
  Calendar,
  Globe,
  Layers,
  Plus,
  Settings2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import {
  AgentConfigCard,
  AgentConfigEditDialog,
  AiFindingsTable,
  AiScheduleEditDialog,
  AiScheduleTable,
  ApprovalCard,
  FeatureEditDialog,
  FeatureTable,
  OsintSourceCard,
  OsintSourceDialog,
  PromptDialog,
  PromptTable,
} from '@/components/ai-config'
import { LoadingSpinner, OrchestratorStatsBar, PageHeader } from '@/components/common'
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui'
import { ApprovalStatus } from '@/enums'
import { useAiConfigPage } from '@/hooks'

export default function AiConfigPage() {
  const {
    t,
    activeTab,
    setActiveTab,
    canEdit,
    canManageOsint,
    canManageApprovals,
    canManagePrompts,
    orchestratorStats,
    orchestratorStatsFetching,
    agentConfigs,
    agentConfigsLoading,
    editDialogOpen,
    setEditDialogOpen,
    selectedConfig,
    handleEditAgent,
    handleUpdateAgent,
    updateConfigLoading,
    handleToggleAgent,
    availableConnectors,
    osintSources,
    osintSourcesLoading,
    osintDialogOpen,
    setOsintDialogOpen,
    selectedOsintSource,
    handleOpenOsintCreate,
    handleEditOsint,
    handleOsintSubmit,
    osintSubmitLoading,
    handleDeleteOsint,
    handleTestOsint,
    handleToggleOsint,
    testOsintLoading,
    approvals,
    approvalsLoading,
    approvalFilter,
    setApprovalFilter,
    handleResolveApproval,
    resolveApprovalLoading,
    prompts,
    promptsLoading,
    promptDialogOpen,
    setPromptDialogOpen,
    selectedPrompt,
    handleOpenPromptCreate,
    handleEditPrompt,
    handlePromptSubmit,
    promptSubmitLoading,
    handleActivatePrompt,
    handleDeletePrompt,
    features,
    featuresLoading,
    featureDialogOpen,
    setFeatureDialogOpen,
    selectedFeature,
    handleEditFeature,
    handleUpdateFeature,
    handleToggleFeature,
    featureUpdateLoading,
    schedules,
    schedulesLoading,
    scheduleDialogOpen,
    setScheduleDialogOpen,
    selectedSchedule,
    handleEditSchedule,
    handleUpdateSchedule,
    handleToggleSchedule,
    handlePauseSchedule,
    handleRunScheduleNow,
    handleResetSchedule,
    scheduleUpdateLoading,
    handleBulkToggle,
  } = useAiConfigPage()

  return (
    <div className="space-y-4">
      <PageHeader title={t('title')} description={t('description')} />

      {!orchestratorStatsFetching && orchestratorStats && (
        <OrchestratorStatsBar stats={orchestratorStats} t={t} />
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="agents">
            <Settings2 className="mr-1.5 h-3.5 w-3.5" />
            {t('tabAgents')}
          </TabsTrigger>
          <TabsTrigger value="osint">
            <Globe className="mr-1.5 h-3.5 w-3.5" />
            {t('tabOsint')}
          </TabsTrigger>
          <TabsTrigger value="approvals">
            <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
            {t('tabApprovals')}
          </TabsTrigger>
          <TabsTrigger value="prompts">
            <BookText className="mr-1.5 h-3.5 w-3.5" />
            {t('promptsTab')}
          </TabsTrigger>
          <TabsTrigger value="features">
            <Layers className="mr-1.5 h-3.5 w-3.5" />
            {t('featuresTab')}
          </TabsTrigger>
          <TabsTrigger value="schedules">
            <Calendar className="mr-1.5 h-3.5 w-3.5" />
            {t('schedules.title')}
          </TabsTrigger>
          <TabsTrigger value="findings">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            {t('aiFindings.title')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="mt-4">
          {canEdit && (
            <div className="mb-4 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleBulkToggle('agents', true)}
              >
                {t('enableAll')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleBulkToggle('agents', false)}
              >
                {t('disableAll')}
              </Button>
            </div>
          )}
          {agentConfigsLoading ? (
            <LoadingSpinner />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {agentConfigs.map(config => (
                <AgentConfigCard
                  key={config.agentId}
                  config={config}
                  onEdit={canEdit ? handleEditAgent : () => {}}
                  onToggle={canEdit ? handleToggleAgent : () => {}}
                  availableConnectors={availableConnectors}
                  t={t}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="osint" className="mt-4">
          {canManageOsint && (
            <div className="mb-4 flex flex-wrap justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleBulkToggle('osint', true)}
              >
                {t('enableAll')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleBulkToggle('osint', false)}
              >
                {t('disableAll')}
              </Button>
              <Button onClick={handleOpenOsintCreate}>
                <Plus className="mr-1.5 h-4 w-4" />
                {t('addSource')}
              </Button>
            </div>
          )}

          {osintSourcesLoading && <LoadingSpinner />}
          {!osintSourcesLoading && osintSources.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <Globe className="text-muted-foreground mb-4 h-12 w-12" />
              <p className="text-muted-foreground text-sm font-medium">{t('noSources')}</p>
              <p className="text-muted-foreground mt-1 text-xs">{t('noSourcesDesc')}</p>
            </div>
          )}
          {!osintSourcesLoading && osintSources.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {osintSources.map(source => (
                <OsintSourceCard
                  key={source.id}
                  source={source}
                  onEdit={canManageOsint ? handleEditOsint : () => {}}
                  onDelete={canManageOsint ? s => void handleDeleteOsint(s) : () => {}}
                  onTest={handleTestOsint}
                  onToggle={canManageOsint ? handleToggleOsint : () => {}}
                  testLoading={testOsintLoading}
                  t={t}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="approvals" className="mt-4">
          <div className="mb-4 flex justify-end">
            <Select value={approvalFilter} onValueChange={setApprovalFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ApprovalStatus.PENDING}>{t('pendingApprovals')}</SelectItem>
                <SelectItem value="all">{t('allApprovals')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {approvalsLoading && <LoadingSpinner />}
          {!approvalsLoading && approvals.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <ShieldCheck className="text-muted-foreground mb-4 h-12 w-12" />
              <p className="text-muted-foreground text-sm font-medium">{t('noApprovals')}</p>
              <p className="text-muted-foreground mt-1 text-xs">{t('noApprovalsDesc')}</p>
            </div>
          )}
          {!approvalsLoading && approvals.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {approvals.map(approval => (
                <ApprovalCard
                  key={approval.id}
                  approval={approval}
                  onResolve={canManageApprovals ? handleResolveApproval : () => {}}
                  resolveLoading={resolveApprovalLoading}
                  t={t}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="prompts" className="mt-4">
          {canManagePrompts && (
            <div className="mb-4 flex justify-end">
              <Button onClick={handleOpenPromptCreate}>
                <Plus className="mr-1.5 h-4 w-4" />
                {t('createPrompt')}
              </Button>
            </div>
          )}

          <PromptTable
            prompts={prompts}
            loading={promptsLoading}
            onEdit={handleEditPrompt}
            onActivate={handleActivatePrompt}
            onDelete={handleDeletePrompt}
            t={t}
          />
        </TabsContent>

        <TabsContent value="features" className="mt-4">
          {canEdit && (
            <div className="mb-4 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleBulkToggle('features', true)}
              >
                {t('enableAll')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleBulkToggle('features', false)}
              >
                {t('disableAll')}
              </Button>
            </div>
          )}
          <FeatureTable
            features={features}
            loading={featuresLoading}
            onEdit={handleEditFeature}
            {...(canEdit ? { onToggle: handleToggleFeature } : {})}
            availableConnectors={availableConnectors}
            t={t}
          />
        </TabsContent>

        <TabsContent value="schedules" className="mt-4">
          {canEdit && (
            <div className="mb-4 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleBulkToggle('schedules', true)}
              >
                {t('enableAll')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleBulkToggle('schedules', false)}
              >
                {t('disableAll')}
              </Button>
            </div>
          )}
          <AiScheduleTable
            schedules={schedules}
            isLoading={schedulesLoading}
            onToggle={handleToggleSchedule}
            onPause={handlePauseSchedule}
            onRunNow={handleRunScheduleNow}
            onEdit={handleEditSchedule}
            onReset={handleResetSchedule}
            t={t}
          />
        </TabsContent>

        <TabsContent value="findings" className="mt-4">
          <AiFindingsTable t={t} />
        </TabsContent>
      </Tabs>

      <AgentConfigEditDialog
        key={selectedConfig?.agentId ?? 'none'}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        config={selectedConfig}
        onSubmit={handleUpdateAgent}
        loading={updateConfigLoading}
        availableConnectors={availableConnectors}
        t={t}
      />

      <OsintSourceDialog
        open={osintDialogOpen}
        onOpenChange={setOsintDialogOpen}
        source={selectedOsintSource}
        onSubmit={handleOsintSubmit}
        loading={osintSubmitLoading}
        t={t}
      />

      <PromptDialog
        key={selectedPrompt?.id ?? 'new-prompt'}
        open={promptDialogOpen}
        onOpenChange={setPromptDialogOpen}
        prompt={selectedPrompt}
        onSubmit={handlePromptSubmit}
        loading={promptSubmitLoading}
        t={t}
      />

      <FeatureEditDialog
        key={selectedFeature?.id ?? 'no-feature'}
        open={featureDialogOpen}
        onOpenChange={setFeatureDialogOpen}
        feature={selectedFeature}
        onSubmit={handleUpdateFeature}
        loading={featureUpdateLoading}
        availableConnectors={availableConnectors}
        t={t}
      />

      <AiScheduleEditDialog
        key={selectedSchedule?.id ?? 'no-schedule'}
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        schedule={selectedSchedule}
        onSubmit={handleUpdateSchedule}
        loading={scheduleUpdateLoading}
        t={t}
      />
    </div>
  )
}
