'use client'

import { ChevronDown, Download, Edit, Trash2 } from 'lucide-react'
import {
  Badge,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui'
import { useReportDetailPanel } from '@/hooks'
import {
  REPORT_TYPE_LABEL_KEYS,
  REPORT_TYPE_CLASSES,
  REPORT_FORMAT_LABEL_KEYS,
  REPORT_FORMAT_CLASSES,
  REPORT_STATUS_LABEL_KEYS,
  REPORT_STATUS_CLASSES,
} from '@/lib/constants/reports'
import { formatRelativeTime, cn, lookup } from '@/lib/utils'
import type { ReportDetailPanelProps } from '@/types'

export function ReportDetailPanel({
  report,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: ReportDetailPanelProps) {
  const { t, fileSizeDisplay } = useReportDetailPanel({ report })

  if (!report) {
    return null
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{report.name}</SheetTitle>
          <SheetDescription>{report.description ?? t('noDescription')}</SheetDescription>
          {(onEdit ?? onDelete) && (
            <div className="flex items-center gap-2 pt-2">
              {onEdit && (
                <Button variant="outline" size="sm" onClick={onEdit} className="gap-1.5">
                  <Edit className="h-3.5 w-3.5" />
                  {t('editButton')}
                </Button>
              )}
              {onDelete && (
                <Button variant="destructive" size="sm" onClick={onDelete} className="gap-1.5">
                  <Trash2 className="h-3.5 w-3.5" />
                  {t('deleteButton')}
                </Button>
              )}
            </div>
          )}
        </SheetHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">{t('detailType')}:</span>
            <span
              className={cn(
                'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                lookup(REPORT_TYPE_CLASSES, report.type)
              )}
            >
              {t(lookup(REPORT_TYPE_LABEL_KEYS, report.type))}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">{t('detailFormat')}:</span>
            <span
              className={cn(
                'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                lookup(REPORT_FORMAT_CLASSES, report.format)
              )}
            >
              {t(lookup(REPORT_FORMAT_LABEL_KEYS, report.format))}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">{t('detailStatus')}:</span>
            <span
              className={cn(
                'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                lookup(REPORT_STATUS_CLASSES, report.status)
              )}
            >
              {t(lookup(REPORT_STATUS_LABEL_KEYS, report.status))}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="bg-muted rounded-lg p-3">
              <p className="text-muted-foreground text-xs">{t('detailGeneratedBy')}</p>
              <p className="text-foreground text-sm font-medium">{report.generatedByName ?? '-'}</p>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <p className="text-muted-foreground text-xs">{t('detailFileSize')}</p>
              <p className="text-foreground text-sm font-medium">{fileSizeDisplay}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">{t('detailCreated')}:</span>
            <Badge variant="outline">{formatRelativeTime(report.createdAt)}</Badge>
          </div>

          {report.generatedAt && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">{t('detailGenerated')}:</span>
              <Badge variant="outline">{formatRelativeTime(report.generatedAt)}</Badge>
            </div>
          )}

          {report.parameters && Object.keys(report.parameters).length > 0 && (
            <div className="border-border border-t pt-4">
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex w-full items-center justify-between py-1">
                  <h4 className="text-foreground text-sm font-semibold">{t('detailParameters')}</h4>
                  <ChevronDown className="text-muted-foreground h-4 w-4 transition-transform [[data-state=open]>&]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <pre className="bg-muted text-muted-foreground mt-2 max-h-40 overflow-auto rounded-lg p-3 text-xs">
                    {JSON.stringify(report.parameters, null, 2)}
                  </pre>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}

          {report.fileUrl && (
            <div className="border-border border-t pt-4">
              <Button asChild variant="outline" className="w-full">
                <a href={report.fileUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="me-2 h-4 w-4" />
                  {t('downloadButton')}
                </a>
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
