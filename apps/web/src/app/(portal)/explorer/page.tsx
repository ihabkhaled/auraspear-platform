'use client'

import {
  FileText,
  BarChart3,
  LayoutDashboard,
  Shield,
  Monitor,
  Workflow,
  GitBranch,
  RefreshCw,
} from 'lucide-react'
import { PageHeader, LoadingSpinner, ErrorMessage } from '@/components/common'
import { ExplorerConnectorCard, ExplorerSyncSummaryCards } from '@/components/explorer'
import { ConnectorType } from '@/enums'
import { useExplorerOverviewPage } from '@/hooks'
import { lookup } from '@/lib/utils'
import type { ExplorerConnectorMeta, SyncJobStatusDetail } from '@/types'

// Constants containing React component references (LucideIcon) — acceptable inline per rule 33
const connectorExplorerMap: Record<string, ExplorerConnectorMeta> = {
  [ConnectorType.GRAYLOG]: {
    icon: FileText,
    label: 'Graylog',
    href: '/explorer/logs',
    color: 'text-status-info',
  },
  [ConnectorType.GRAFANA]: {
    icon: LayoutDashboard,
    label: 'Grafana',
    href: '/explorer/dashboards',
    color: 'text-status-warning',
  },
  [ConnectorType.INFLUXDB]: {
    icon: BarChart3,
    label: 'InfluxDB',
    href: '/explorer/metrics',
    color: 'text-status-success',
  },
  [ConnectorType.MISP]: {
    icon: Shield,
    label: 'MISP',
    href: '/explorer/threat-intel',
    color: 'text-severity-critical',
  },
  [ConnectorType.VELOCIRAPTOR]: {
    icon: Monitor,
    label: 'Velociraptor',
    href: '/explorer/endpoints',
    color: 'text-severity-high',
  },
  [ConnectorType.SHUFFLE]: {
    icon: Workflow,
    label: 'Shuffle',
    href: '/explorer/automation',
    color: 'text-severity-medium',
  },
  [ConnectorType.LOGSTASH]: {
    icon: GitBranch,
    label: 'Logstash',
    href: '/explorer/pipelines',
    color: 'text-severity-low',
  },
}

export default function ExplorerOverviewPage() {
  const { t, router, data, isLoading, error } = useExplorerOverviewPage()

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={t('overview.loadError')} />

  const overview = data?.data
  const connectors = overview?.connectors ?? []
  const defaultDetail: SyncJobStatusDetail = { count: 0, connectors: [] }
  const summary = overview?.syncJobsSummary ?? {
    running: defaultDetail,
    completed: defaultDetail,
    failed: defaultDetail,
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('overview.title')}
        description={t('overview.description')}
        action={{
          label: t('overview.syncJobs'),
          icon: <RefreshCw className="h-4 w-4" />,
          onClick: () => router.push('/explorer/sync-jobs'),
        }}
      />

      <ExplorerSyncSummaryCards summary={summary} t={t} />

      <div>
        <h2 className="mb-4 text-lg font-semibold">{t('overview.connectors')}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {connectors
            .filter(c => c.type in connectorExplorerMap)
            .map(connector => {
              const meta = lookup(connectorExplorerMap, connector.type)
              if (!meta) return null
              return (
                <ExplorerConnectorCard
                  key={connector.type}
                  connector={connector}
                  meta={meta}
                  onClick={() => router.push(meta.href)}
                  t={t}
                />
              )
            })}
        </div>
      </div>
    </div>
  )
}
