'use client'

import { Cable, CheckCircle2, Plus, Plug, ShieldAlert, Power, TriangleAlert } from 'lucide-react'
import { KpiCard, LoadingSpinner, PageHeader } from '@/components/common'
import { ConnectorCard, AddConnectorCard, LlmConnectorCard } from '@/components/connectors'
import { Button } from '@/components/ui'
import { useConnectorsPage } from '@/hooks'

export default function ConnectorsPage() {
  const {
    t,
    tLlm,
    list,
    llmConnectors,
    llmFetching,
    stats,
    statsLoading,
    isLoading,
    isFetching,
    unconfiguredTypes,
    canCreate,
    canCreateLlm,
    handleNavigateToLlm,
  } = useConnectorsPage()

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={t('description')} />

      {!statsLoading && stats ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label={t('stats.totalConnectors')}
            value={stats.totalConnectors}
            icon={<Plug className="h-5 w-5" />}
            accentColor="var(--primary)"
          />
          <KpiCard
            label={t('stats.enabledConnectors')}
            value={stats.enabledConnectors}
            icon={<Power className="h-5 w-5" />}
            accentColor="var(--status-info)"
          />
          <KpiCard
            label={t('stats.healthyConnectors')}
            value={stats.healthyConnectors}
            icon={<CheckCircle2 className="h-5 w-5" />}
            accentColor="var(--status-success)"
          />
          <KpiCard
            label={t('stats.failingConnectors')}
            value={stats.failingConnectors}
            icon={<ShieldAlert className="h-5 w-5" />}
            accentColor="var(--severity-critical)"
            trendLabel={
              stats.untestedConnectors > 0
                ? t('stats.untestedConnectors', { count: stats.untestedConnectors })
                : t('stats.allTested')
            }
          />
        </div>
      ) : null}

      {list.length === 0 && unconfiguredTypes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <TriangleAlert className="text-muted-foreground mb-4 h-12 w-12" />
          <h3 className="text-lg font-semibold">{t('noConnectors')}</h3>
          <p className="text-muted-foreground mt-1 text-sm">{t('noConnectorsDescription')}</p>
        </div>
      ) : (
        <>
          {list.length > 0 && (
            <div
              className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${isFetching ? 'opacity-70' : ''}`}
            >
              {list.map(c => (
                <ConnectorCard key={c.type} connector={c} />
              ))}
            </div>
          )}

          {canCreate && unconfiguredTypes.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold">{t('availableConnectors')}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {unconfiguredTypes.map(ct => (
                  <AddConnectorCard key={ct} connectorType={ct} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cable className="text-muted-foreground h-4 w-4" />
            <h2 className="text-sm font-semibold">{tLlm('title')}</h2>
          </div>
          <div className="flex items-center gap-2">
            {canCreateLlm && (
              <Button variant="outline" size="sm" onClick={handleNavigateToLlm}>
                <Plus className="me-1 h-3.5 w-3.5" />
                {tLlm('createConnector')}
              </Button>
            )}
          </div>
        </div>
        {llmConnectors.length > 0 ? (
          <div
            className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${llmFetching ? 'opacity-70' : ''}`}
          >
            {llmConnectors.map(c => (
              <LlmConnectorCard key={c.id} connector={c} t={t} />
            ))}
          </div>
        ) : (
          <div className="bg-muted/50 flex flex-col items-center gap-2 rounded-lg py-8">
            <Cable className="text-muted-foreground h-8 w-8" />
            <p className="text-muted-foreground text-sm">{tLlm('noConnectors')}</p>
            <p className="text-muted-foreground text-xs">{tLlm('noConnectorsDescription')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
