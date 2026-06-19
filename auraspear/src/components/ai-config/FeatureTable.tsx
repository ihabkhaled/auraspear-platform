'use client'

import { Pen } from 'lucide-react'
import { DataTable } from '@/components/common'
import { Badge, Button, Switch } from '@/components/ui'
import type { AiFeatureConfig, Column, FeatureTableProps } from '@/types'

export function FeatureTable({ features, loading, onEdit, onToggle, availableConnectors, t }: FeatureTableProps) {
  // Columns contain JSX render functions — acceptable inline per CLAUDE.md rule 33
  const columns: Column<AiFeatureConfig>[] = [
    { key: 'featureKey', label: t('featureKey') },
    {
      key: 'enabled',
      label: t('featureEnabled'),
      render: (value: unknown, row: AiFeatureConfig) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={Boolean(value)}
            onCheckedChange={checked => onToggle?.(row.featureKey, checked)}
            aria-label={t('featureEnabled')}
          />
          <Badge variant={value ? 'success' : 'secondary'}>
            {value ? t('enabled') : t('disabled')}
          </Badge>
        </div>
      ),
    },
    {
      key: 'preferredProvider',
      label: t('featureProvider'),
      render: (value: unknown) => {
        const providerKey = value as string | null
        if (!providerKey) return <span>-</span>
        const connector = availableConnectors?.find(c => c.key === providerKey)
        return <span>{connector?.label ?? providerKey}</span>
      },
    },
    { key: 'maxTokens', label: t('featureMaxTokens') },
    { key: 'approvalLevel', label: t('featureApproval') },
    {
      key: 'monthlyTokenBudget',
      label: t('featureBudget'),
      render: (value: unknown) => (
        <span>{value !== null && value !== undefined ? String(value) : '-'}</span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (_value: unknown, row: AiFeatureConfig) => (
        <Button variant="ghost" size="sm" onClick={() => onEdit(row)}>
          <Pen className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={features}
      emptyMessage={t('noFeatures')}
      loading={loading}
      keyField="featureKey"
    />
  )
}
