'use client'

import { ChevronDown } from 'lucide-react'
import { AiFindingsPanel } from '@/components/common'
import {
  Badge,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Label,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui'
import type { IncidentCategory, IncidentSeverity, IncidentStatus } from '@/enums'
import { useIncidentDetailPanel } from '@/hooks'
import {
  INCIDENT_CATEGORY_LABEL_KEYS,
  INCIDENT_SEVERITY_CLASSES,
  INCIDENT_SEVERITY_LABEL_KEYS,
  INCIDENT_STATUS_CLASSES,
  INCIDENT_STATUS_LABEL_KEYS,
} from '@/lib/constants/incidents'
import { cn, lookup } from '@/lib/utils'
import type { IncidentDetailPanelProps } from '@/types'
import { IncidentTimeline } from './IncidentTimeline'

export function IncidentDetailPanel({
  incident,
  open,
  onOpenChange,
  canEditIncident = false,
  canChangeStatus = false,
  onEditIncident,
  onChangeStatus,
  isChangingStatus = false,
}: IncidentDetailPanelProps) {
  const {
    t,
    tCommon,
    formattedCreatedAt,
    formattedUpdatedAt,
    formattedResolvedAt,
    selectedStatus,
    statusOptions,
    isStatusDirty,
    handleStatusChange,
    handleStatusSubmit,
  } = useIncidentDetailPanel(incident, onChangeStatus)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {incident?.incidentNumber ?? ''} — {t('incidentDetail')}
          </SheetTitle>
          <SheetDescription>{incident?.title ?? ''}</SheetDescription>
        </SheetHeader>

        {incident && (
          <ScrollArea className="h-[calc(100vh-8rem)]">
            <div className="flex flex-col gap-5 pt-4">
              <div className="flex flex-wrap gap-2">
                <span
                  className={cn(
                    'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                    lookup(INCIDENT_SEVERITY_CLASSES, incident.severity as IncidentSeverity)
                  )}
                >
                  {t(lookup(INCIDENT_SEVERITY_LABEL_KEYS, incident.severity as IncidentSeverity))}
                </span>
                <span
                  className={cn(
                    'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                    lookup(INCIDENT_STATUS_CLASSES, incident.status as IncidentStatus)
                  )}
                >
                  {t(lookup(INCIDENT_STATUS_LABEL_KEYS, incident.status as IncidentStatus))}
                </span>
                <span className="text-muted-foreground inline-flex items-center text-xs capitalize">
                  {t(lookup(INCIDENT_CATEGORY_LABEL_KEYS, incident.category as IncidentCategory))}
                </span>
              </div>

              {incident.description && (
                <div className="flex flex-col gap-1">
                  <p className="text-muted-foreground text-xs font-medium">
                    {t('formDescription')}
                  </p>
                  <p className="text-sm">{incident.description}</p>
                </div>
              )}

              {canEditIncident || canChangeStatus ? (
                <div className="bg-muted/30 border-border grid gap-3 rounded-xl border p-4">
                  {canEditIncident && onEditIncident ? (
                    <div className="flex justify-end">
                      <Button type="button" variant="outline" onClick={onEditIncident}>
                        {t('editTitle')}
                      </Button>
                    </div>
                  ) : null}

                  {canChangeStatus ? (
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                      <div className="flex flex-col gap-2">
                        <Label>{t('formStatus')}</Label>
                        <Select value={selectedStatus} onValueChange={handleStatusChange}>
                          <SelectTrigger disabled={isChangingStatus}>
                            <SelectValue placeholder={t('formStatusPlaceholder')} />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map(status => (
                              <SelectItem key={status} value={status}>
                                {t(lookup(INCIDENT_STATUS_LABEL_KEYS, status))}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        type="button"
                        onClick={handleStatusSubmit}
                        disabled={!isStatusDirty || isChangingStatus}
                      >
                        {isChangingStatus ? t('saving') : tCommon('save')}
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <Separator />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <p className="text-muted-foreground text-xs font-medium">{tCommon('assignee')}</p>
                  <p className="text-sm">{incident.assigneeName ?? t('unassigned')}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-muted-foreground text-xs font-medium">
                    {t('detailCreatedBy')}
                  </p>
                  <p className="text-sm">{incident.createdByName ?? '-'}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-muted-foreground text-xs font-medium">
                    {t('detailCreatedAt')}
                  </p>
                  <p className="text-sm">{formattedCreatedAt}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-muted-foreground text-xs font-medium">
                    {t('detailUpdatedAt')}
                  </p>
                  <p className="text-sm">{formattedUpdatedAt}</p>
                </div>
                {formattedResolvedAt && (
                  <div className="flex flex-col gap-1">
                    <p className="text-muted-foreground text-xs font-medium">
                      {t('detailResolvedAt')}
                    </p>
                    <p className="text-sm">{formattedResolvedAt}</p>
                  </div>
                )}
              </div>

              {incident.mitreTechniques.length > 0 && (
                <>
                  <Separator />
                  <Collapsible defaultOpen>
                    <CollapsibleTrigger className="flex w-full items-center justify-between py-1">
                      <p className="text-sm font-semibold">{t('formMitreTechniques')}</p>
                      <ChevronDown className="text-muted-foreground h-4 w-4 transition-transform [[data-state=open]>&]:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {incident.mitreTechniques.map(technique => (
                          <Badge key={technique} variant="outline" className="font-mono text-xs">
                            {technique}
                          </Badge>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </>
              )}

              {incident.linkedAlertIds.length > 0 && (
                <>
                  <Separator />
                  <Collapsible defaultOpen>
                    <CollapsibleTrigger className="flex w-full items-center justify-between py-1">
                      <p className="text-sm font-semibold">{t('linkedAlerts')}</p>
                      <ChevronDown className="text-muted-foreground h-4 w-4 transition-transform [[data-state=open]>&]:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="flex flex-col gap-1 pt-2">
                        {incident.linkedAlertIds.map(alertId => (
                          <Badge key={alertId} variant="secondary" className="font-mono text-xs">
                            {alertId}
                          </Badge>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </>
              )}

              <Separator />

              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex w-full items-center justify-between py-1">
                  <p className="text-sm font-semibold">{t('incidentTimeline')}</p>
                  <ChevronDown className="text-muted-foreground h-4 w-4 transition-transform [[data-state=open]>&]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="pt-2">
                    <IncidentTimeline incidentId={incident.id} />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Separator />

              <AiFindingsPanel sourceModule="incident" sourceEntityId={incident.id} t={tCommon} />
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  )
}
