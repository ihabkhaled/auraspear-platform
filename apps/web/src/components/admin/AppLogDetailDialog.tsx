'use client'

import { AppLogDetailRow } from '@/components/admin/AppLogDetailRow'
import {
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  ScrollArea,
} from '@/components/ui'
import { useAppLogDetailDialog } from '@/hooks'
import { getLevelClasses } from '@/lib/admin.utils'
import { cn, formatTimestamp } from '@/lib/utils'
import type { AppLogDetailDialogProps } from '@/types'

export function AppLogDetailDialog({ log, open, onClose }: AppLogDetailDialogProps) {
  const { t, extractedFields, remainingMetadata } = useAppLogDetailDialog(log)

  if (!log) {
    return null
  }

  return (
    <Dialog
      open={open}
      onOpenChange={isOpen => {
        if (!isOpen) {
          onClose()
        }
      }}
    >
      <DialogContent className="max-w-[95vw] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn('text-xs uppercase', getLevelClasses(log.level))}
            >
              {log.level}
            </Badge>
            <span className="truncate">{t('logDetail')}</span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-1">
            <AppLogDetailRow label={t('timestamp')} value={formatTimestamp(log.createdAt)} />
            <AppLogDetailRow label={t('message')} value={log.message} />
            <AppLogDetailRow label={t('feature')} value={log.feature} />
            <AppLogDetailRow label={t('action')} value={log.action} />
            <AppLogDetailRow label={t('functionName')} value={log.functionName} />
            <AppLogDetailRow label={t('className')} value={log.className} />
            <AppLogDetailRow label={t('actorEmail')} value={log.actorEmail} />
            <AppLogDetailRow label={t('actorUserId')} value={log.actorUserId} />
            <AppLogDetailRow label={t('tenantId')} value={log.tenantId} />
            <AppLogDetailRow label={t('requestId')} value={log.requestId} />
            <AppLogDetailRow label={t('targetResource')} value={log.targetResource} />
            <AppLogDetailRow label={t('targetResourceId')} value={log.targetResourceId} />
            <AppLogDetailRow label={t('outcome')} value={log.outcome} />
            <AppLogDetailRow label={t('sourceType')} value={log.sourceType} />
            <AppLogDetailRow label={t('ipAddress')} value={log.ipAddress} />
            <AppLogDetailRow label={t('httpMethod')} value={log.httpMethod} />
            <AppLogDetailRow label={t('httpRoute')} value={log.httpRoute} />
            <AppLogDetailRow
              label={t('httpStatusCode')}
              value={log.httpStatusCode?.toString() ?? null}
            />

            {extractedFields.map(field => (
              <AppLogDetailRow
                key={field.key}
                label={field.label}
                value={field.value}
                isError={field.isError}
              />
            ))}

            {remainingMetadata && (
              <div className="border-border border-b py-2">
                <span className="text-muted-foreground text-sm font-medium">{t('metadata')}</span>
                <pre className="bg-muted mt-1 overflow-x-auto rounded p-2 font-mono text-xs">
                  {JSON.stringify(remainingMetadata, null, 2)}
                </pre>
              </div>
            )}

            {log.stackTrace && (
              <div className="border-border border-b py-2">
                <span className="text-muted-foreground text-sm font-medium">{t('stackTrace')}</span>
                <pre className="bg-muted text-status-error mt-1 overflow-x-auto rounded p-2 font-mono text-xs">
                  {log.stackTrace}
                </pre>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
