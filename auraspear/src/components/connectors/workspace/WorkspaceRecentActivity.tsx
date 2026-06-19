'use client'

import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui'
import { useWorkspaceRecentActivityComponent } from '@/hooks'
import { SEVERITY_CLASSES } from '@/lib/constants/connectors.constants'
import { cn, formatTimestamp, lookup } from '@/lib/utils'
import type { WorkspaceRecentActivityProps } from '@/types'

export function WorkspaceRecentActivity({ items, loading, title }: WorkspaceRecentActivityProps) {
  const { t } = useWorkspaceRecentActivityComponent()

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{title ?? t('recentActivity')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="bg-muted h-12 animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title ?? t('recentActivity')}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">{t('noRecentActivity')}</p>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <div
                key={item.id}
                className={cn(
                  'border-border flex items-start gap-3 rounded-lg border p-3 transition-colors',
                  'hover:bg-muted/50'
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    {item.severity && (
                      <Badge
                        variant="outline"
                        className={cn(
                          'shrink-0 text-[10px]',
                          lookup(SEVERITY_CLASSES, item.severity)
                        )}
                      >
                        {item.severity}
                      </Badge>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-muted-foreground mt-0.5 truncate text-xs">
                      {item.description}
                    </p>
                  )}
                  {item.timestamp && (
                    <p className="text-muted-foreground mt-1 text-[10px]">
                      {formatTimestamp(item.timestamp)}
                    </p>
                  )}
                </div>
                {item.type && (
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {item.type}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
