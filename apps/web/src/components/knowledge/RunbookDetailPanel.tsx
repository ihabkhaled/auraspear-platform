'use client'

import { X } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui'
import { formatDate } from '@/lib/utils'
import type { RunbookDetailPanelProps } from '@/types'

export function RunbookDetailPanel({ runbook, onClose, t }: RunbookDetailPanelProps) {
  if (!runbook) {
    return null
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">{runbook.title}</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label={t('close')}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-muted-foreground text-xs font-medium uppercase">{t('fieldCategory')}</p>
          <Badge variant="secondary">{runbook.category}</Badge>
        </div>

        {runbook.tags.length > 0 && (
          <div>
            <p className="text-muted-foreground text-xs font-medium uppercase">{t('fieldTags')}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {runbook.tags.map(tag => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-muted-foreground text-xs font-medium uppercase">{t('colCreatedBy')}</p>
          <p className="text-foreground text-sm">{runbook.createdBy}</p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground text-xs font-medium uppercase">{t('createdAt')}</p>
            <p className="text-foreground text-sm">{formatDate(runbook.createdAt)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-medium uppercase">{t('updatedAt')}</p>
            <p className="text-foreground text-sm">{formatDate(runbook.updatedAt)}</p>
          </div>
        </div>

        <div>
          <p className="text-muted-foreground text-xs font-medium uppercase">{t('fieldContent')}</p>
          <pre className="bg-muted mt-1 max-h-[400px] overflow-auto whitespace-pre-wrap rounded-md p-3 text-xs">
            {runbook.content}
          </pre>
        </div>
      </CardContent>
    </Card>
  )
}
