'use client'

import { memo } from 'react'
import { CheckCircle, Edit, Globe, Trash2, XCircle, Zap } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Switch,
} from '@/components/ui'
import { OSINT_AUTH_TYPE_LABELS } from '@/lib/constants/ai-config'
import { lookupBuiltinOsintDefaults } from '@/lib/osint.utils'
import { lookup } from '@/lib/utils'
import type { OsintSourceCardProps } from '@/types'

export const OsintSourceCard = memo(
  ({ source, onEdit, onDelete, onTest, onToggle, testLoading, t }: OsintSourceCardProps) => {
    const builtinDefaults = lookupBuiltinOsintDefaults(source.sourceType)

    return (
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <Globe className="text-primary h-4 w-4" />
            <div>
              <h3 className="text-sm font-semibold">{source.name}</h3>
              <p className="text-muted-foreground text-xs">{source.sourceType}</p>
              {builtinDefaults?.supportedIocTypes &&
                builtinDefaults.supportedIocTypes.length > 0 && (
                  <div className="mt-0.5 flex flex-wrap gap-0.5">
                    {builtinDefaults.supportedIocTypes.map(ioc => (
                      <Badge key={ioc} variant="outline" className="px-1 py-0 text-[9px]">
                        {ioc.toUpperCase()}
                      </Badge>
                    ))}
                  </div>
                )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={source.isEnabled ? 'success' : 'secondary'}>
              {source.isEnabled ? t('enabled') : t('disabled')}
            </Badge>
            <Switch
              checked={source.isEnabled}
              onCheckedChange={checked => onToggle(source.id, checked)}
              aria-label={t('enabled')}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">{t('authType')}: </span>
              <span>
                {lookup(OSINT_AUTH_TYPE_LABELS, source.authType) ?? source.authType}
                {source.headerName ? ` (${source.headerName})` : ''}
                {source.queryParamName ? ` (${source.queryParamName})` : ''}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('requestMethod')}: </span>
              <span>{source.requestMethod}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('timeout')}: </span>
              <span>{String(source.timeout)}ms</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">{t('testConnection')}: </span>
              {source.lastTestAt === null && <span className="text-muted-foreground">-</span>}
              {source.lastTestAt !== null && source.lastTestOk && (
                <CheckCircle className="text-status-success h-3.5 w-3.5" />
              )}
              {source.lastTestAt !== null && !source.lastTestOk && (
                <XCircle className="text-status-error h-3.5 w-3.5" />
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onTest(source.id)}
              disabled={testLoading}
            >
              <Zap className="mr-1.5 h-3.5 w-3.5" />
              {t('testConnection')}
            </Button>
            <Button variant="outline" size="icon" onClick={() => onEdit(source)}>
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => onDelete(source)}>
              <Trash2 className="text-destructive h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }
)

OsintSourceCard.displayName = 'OsintSourceCard'
