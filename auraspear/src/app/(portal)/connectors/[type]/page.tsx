'use client'

import { use } from 'react'
import { ArrowLeft, Play, RefreshCw, Trash2 } from 'lucide-react'
import { LoadingSpinner } from '@/components/common'
import { ConnectorForm, SecurityIndicators } from '@/components/connectors'
import {
  WorkspaceHeader,
  WorkspaceSummaryGrid,
  WorkspaceRecentActivity,
  WorkspaceEntities,
  WorkspaceSearchPanel,
  WorkspaceActionsPanel,
} from '@/components/connectors/workspace'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui'
import { ConnectorAuthType, WorkspaceTab } from '@/enums'
import { useConnectorWorkspacePage } from '@/hooks'
import { mapConfigForBackend } from '@/lib/connector-utils'
import { isSyncableConnector } from '@/lib/constants/connectors.constants'
import type { ConnectorDetailPageProps } from '@/types'

export default function ConnectorDetailPage({ params }: ConnectorDetailPageProps) {
  const { type: rawType } = use(params)

  const {
    t,
    tWorkspace,
    router,
    isValidType,
    isLoading,
    connector,
    type,
    meta,
    Icon,
    isEditor,
    isAdmin,
    testing,
    deletePending,
    createPending,
    isCreateMode,
    handleTest,
    handleDelete,
    handleCreate,
    activeTab,
    setActiveTab,
    overview,
    overviewFetching,
    recentActivity,
    activityFetching,
    entities,
    entitiesFetching,
    entitiesPage,
    setEntitiesPage,
    searchResults,
    searchPending,
    handleSearch,
    actionPending,
    handleAction,
    handleSync,
    syncPending,
    workspaceEnabled,
  } = useConnectorWorkspacePage(rawType)

  if (!isValidType) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/connectors')}>
          <ArrowLeft className="me-1 h-4 w-4" />
          {t('backToConnectors')}
        </Button>
        <div className="py-20 text-center">
          <h3 className="text-lg font-semibold">{t('connectorNotFound')}</h3>
          <p className="text-muted-foreground mt-1 text-sm">{t('connectorNotFoundDescription')}</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  // Create mode: show form without existing connector data
  if (isCreateMode && type && meta && Icon) {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/connectors')}>
            <ArrowLeft className="me-1 h-4 w-4" />
            {t('backToConnectors')}
          </Button>
          <div className="flex items-center gap-3">
            <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
              <Icon className="text-muted-foreground h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold sm:text-xl">
                {t('createConnector')}: {meta.label}
              </h1>
              <p className="text-muted-foreground truncate text-sm">{t(meta.descriptionKey)}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('configuration')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ConnectorForm
                  type={type}
                  connector={undefined}
                  readOnly={false}
                  onCreateSubmit={data => {
                    const { name, enabled, authType, tags, notes, ...configFields } = data
                    handleCreate({
                      type,
                      name: name || meta.label,
                      enabled: Boolean(enabled),
                      authType: authType || ConnectorAuthType.BASIC,
                      config: mapConfigForBackend(type, {
                        ...configFields,
                        tags: tags
                          .split(',')
                          .map(tag => tag.trim())
                          .filter(Boolean),
                        notes: notes ?? '',
                      }),
                    })
                  }}
                  createPending={createPending}
                />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-4">
            <SecurityIndicators type={type} />
          </div>
        </div>
      </div>
    )
  }

  if (!connector || !type || !meta || !Icon) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/connectors')}>
          <ArrowLeft className="me-1 h-4 w-4" />
          {t('backToConnectors')}
        </Button>
        <div className="py-20 text-center">
          <h3 className="text-lg font-semibold">{t('connectorNotFound')}</h3>
          <p className="text-muted-foreground mt-1 text-sm">{t('connectorNotFoundDescription')}</p>
        </div>
      </div>
    )
  }

  const connectorStatus = overview?.connector?.status ?? 'unknown'

  return (
    <div className="space-y-6">
      <WorkspaceHeader
        name={connector.name}
        description={t(meta.descriptionKey)}
        status={connectorStatus}
        lastTestedAt={connector.lastTestAt ?? null}
        Icon={Icon}
        onBack={() => router.push('/connectors')}
      />

      <Tabs value={activeTab} onValueChange={val => setActiveTab(val as typeof activeTab)}>
        <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
          <TabsList className="w-max md:w-auto">
            <TabsTrigger value={WorkspaceTab.OVERVIEW}>{tWorkspace('tabOverview')}</TabsTrigger>
            <TabsTrigger value={WorkspaceTab.DATA}>{tWorkspace('tabData')}</TabsTrigger>
            <TabsTrigger value={WorkspaceTab.SEARCH}>{tWorkspace('tabSearch')}</TabsTrigger>
            <TabsTrigger value={WorkspaceTab.ACTIONS}>{tWorkspace('tabActions')}</TabsTrigger>
            <TabsTrigger value={WorkspaceTab.CONFIG}>{tWorkspace('tabConfig')}</TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value={WorkspaceTab.OVERVIEW}>
          {workspaceEnabled ? (
            <div className="space-y-6">
              <WorkspaceSummaryGrid
                cards={overview?.summaryCards ?? []}
                loading={overviewFetching && !overview}
              />
              <div className="grid gap-6 lg:grid-cols-2">
                <WorkspaceRecentActivity
                  items={overview?.recentItems ?? []}
                  loading={overviewFetching && !overview}
                />
                <WorkspaceActionsPanel
                  actions={overview?.quickActions ?? []}
                  onExecute={handleAction}
                  loading={actionPending}
                  isEditor={isEditor}
                />
              </div>
            </div>
          ) : (
            <div className="py-16 text-center">
              <p className="text-muted-foreground text-sm">{tWorkspace('enableConnector')}</p>
            </div>
          )}
        </TabsContent>

        {/* Data Tab */}
        <TabsContent value={WorkspaceTab.DATA}>
          {workspaceEnabled ? (
            <div className="space-y-6">
              <WorkspaceRecentActivity
                items={recentActivity?.items ?? []}
                loading={activityFetching && !recentActivity}
                title={tWorkspace('recentActivity')}
              />
              <WorkspaceEntities
                entities={entities?.entities ?? []}
                total={entities?.total ?? 0}
                page={entitiesPage}
                pageSize={20}
                loading={entitiesFetching && !entities}
                onPageChange={setEntitiesPage}
              />
            </div>
          ) : (
            <div className="py-16 text-center">
              <p className="text-muted-foreground text-sm">{tWorkspace('enableConnector')}</p>
            </div>
          )}
        </TabsContent>

        {/* Search Tab */}
        <TabsContent value={WorkspaceTab.SEARCH}>
          {workspaceEnabled ? (
            <WorkspaceSearchPanel
              onSearch={handleSearch}
              results={searchResults}
              loading={searchPending}
            />
          ) : (
            <div className="py-16 text-center">
              <p className="text-muted-foreground text-sm">{tWorkspace('enableConnector')}</p>
            </div>
          )}
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value={WorkspaceTab.ACTIONS}>
          <div className="grid gap-6 lg:grid-cols-2">
            <WorkspaceActionsPanel
              actions={overview?.quickActions ?? []}
              onExecute={handleAction}
              loading={actionPending}
              isEditor={isEditor}
            />
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t('actions')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  size="sm"
                  onClick={handleTest}
                  disabled={testing}
                >
                  <Play className="me-2 h-3.5 w-3.5" />
                  {t('testConnection')}
                </Button>
                {isEditor && type && isSyncableConnector(type) && (
                  <Button
                    className="w-full justify-start"
                    variant="default"
                    size="sm"
                    onClick={handleSync}
                    disabled={syncPending}
                  >
                    <RefreshCw
                      className={`me-2 h-3.5 w-3.5 ${syncPending ? 'animate-spin' : ''}`}
                    />
                    {t('syncNow')}
                  </Button>
                )}
                {isAdmin && (
                  <Button
                    className="w-full justify-start"
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={deletePending}
                  >
                    <Trash2 className="me-2 h-3.5 w-3.5" />
                    {t('deleteConnector')}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Config Tab */}
        <TabsContent value={WorkspaceTab.CONFIG}>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('configuration')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ConnectorForm type={type} connector={connector} readOnly={!isEditor} />
                </CardContent>
              </Card>
            </div>
            <div className="space-y-4">
              <SecurityIndicators type={type} />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
