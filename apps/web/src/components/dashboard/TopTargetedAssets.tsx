'use client'

import { Monitor } from 'lucide-react'
import { EmptyState } from '@/components/common'
import { Badge } from '@/components/ui'
import { useTopTargetedAssets } from '@/hooks'
import { getRiskBadgeClass } from '@/lib/dashboard.utils'
import { cn } from '@/lib/utils'
import type { TopTargetedAssetsProps } from '@/types'

export function TopTargetedAssets({ assets }: TopTargetedAssetsProps) {
  const { t } = useTopTargetedAssets()

  if (assets.length === 0) {
    return (
      <EmptyState
        icon={<Monitor className="h-6 w-6" />}
        title={t('assetsEmptyTitle')}
        description={t('assetsEmptyDescription')}
        className="py-6"
      />
    )
  }

  return (
    <div className="space-y-1">
      <div className="text-muted-foreground border-border grid grid-cols-2 gap-2 border-b pb-2 text-xs font-bold tracking-wider uppercase sm:grid-cols-3">
        <span>{t('asset')}</span>
        <span className="hidden sm:block">{t('ip')}</span>
        <span className="text-end">{t('riskScore')}</span>
      </div>
      {assets.map(asset => (
        <div
          key={asset.id}
          className="border-border grid grid-cols-2 items-center gap-2 border-b py-2 text-sm last:border-b-0 sm:grid-cols-3"
        >
          <span className="text-foreground truncate font-medium">{asset.name}</span>
          <span className="text-muted-foreground hidden font-mono text-xs sm:block">
            {asset.ip}
          </span>
          <div className="flex justify-end">
            <Badge
              variant="outline"
              className={cn('text-xs tabular-nums', getRiskBadgeClass(asset.riskScore))}
            >
              {asset.riskScore}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  )
}
