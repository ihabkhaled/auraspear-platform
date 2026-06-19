'use client'

import { Calendar, User, UserCheck, Edit, Trash2, ExternalLink, FolderClosed } from 'lucide-react'
import { SeverityBadge } from '@/components/common'
import {
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { CaseCycleStatus, CaseStatus } from '@/enums'
import { useCaseDetailHeader } from '@/hooks'
import { getAvailableTransitions, STATUS_VARIANT_MAP } from '@/lib/case.utils'
import { CASE_STATUS_LABEL_KEYS, NO_CYCLE_VALUE, UNASSIGNED_VALUE } from '@/lib/constants/cases'
import { formatDate, lookup } from '@/lib/utils'
import type { CaseDetailHeaderProps } from '@/types'

export function CaseDetailHeader({
  caseItem,
  ownerName,
  members,
  cycles,
  onEdit,
  onDelete,
  onEscalate,
  onStatusChange,
  onAssigneeChange,
  onCycleChange,
}: CaseDetailHeaderProps) {
  const { t } = useCaseDetailHeader()

  const availableTransitions = getAvailableTransitions(caseItem.status)

  return (
    <div className="border-border flex flex-col gap-4 border-b pb-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground font-mono text-sm">{caseItem.caseNumber}</span>
            <Badge variant={lookup(STATUS_VARIANT_MAP, caseItem.status)} className="capitalize">
              {t(lookup(CASE_STATUS_LABEL_KEYS, caseItem.status))}
            </Badge>
            <SeverityBadge severity={caseItem.severity} />
          </div>
          <h1 className="text-xl font-bold">{caseItem.title}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onStatusChange && availableTransitions.length > 0 && (
            <Select
              key={caseItem.status}
              onValueChange={value => onStatusChange(value as CaseStatus)}
            >
              <SelectTrigger size="sm" className="w-auto cursor-pointer">
                <SelectValue placeholder={t('changeStatus')} />
              </SelectTrigger>
              <SelectContent>
                {availableTransitions.map(status => (
                  <SelectItem key={status} value={status}>
                    {t(lookup(CASE_STATUS_LABEL_KEYS, status))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {onEscalate && caseItem.status !== CaseStatus.CLOSED && (
            <Button variant="outline" size="sm" onClick={onEscalate}>
              <ExternalLink className="h-4 w-4" />
              {t('escalate')}
            </Button>
          )}
          {onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4" />
              {t('edit')}
            </Button>
          )}
          {onDelete && (
            <Button variant="destructive" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
              {t('delete')}
            </Button>
          )}
        </div>
      </div>

      <div className="text-muted-foreground flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span className="flex items-center gap-1.5">
          <UserCheck className="h-3.5 w-3.5" />
          {t('assignee')}:
          {onAssigneeChange && members ? (
            <Select
              value={caseItem.ownerUserId ?? UNASSIGNED_VALUE}
              onValueChange={value => onAssigneeChange(value === UNASSIGNED_VALUE ? null : value)}
            >
              <SelectTrigger
                size="sm"
                className="h-7 w-auto cursor-pointer gap-1 text-sm font-medium"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED_VALUE}>{t('unassigned')}</SelectItem>
                {members.map(member => (
                  <SelectItem key={member.id} value={member.id}>
                    {`${member.name} (${member.email})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-foreground font-medium">
              {ownerName
                ? `${ownerName}${caseItem.ownerEmail ? ` (${caseItem.ownerEmail})` : ''}`
                : t('unassigned')}
            </span>
          )}
        </span>
        <span className="flex items-center gap-1.5">
          <FolderClosed className="h-3.5 w-3.5" />
          {t('cycles.cycle')}:
          {onCycleChange && cycles ? (
            <Select
              value={caseItem.cycleId ?? NO_CYCLE_VALUE}
              onValueChange={value => onCycleChange(value === NO_CYCLE_VALUE ? null : value)}
            >
              <SelectTrigger
                size="sm"
                className="h-7 w-auto cursor-pointer gap-1 text-sm font-medium"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CYCLE_VALUE}>{t('cycles.noCycle')}</SelectItem>
                {cycles.map(cycle => (
                  <SelectItem key={cycle.id} value={cycle.id}>
                    {cycle.name}
                    {cycle.status === CaseCycleStatus.ACTIVE ? ` (${t('cycles.active')})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-foreground font-medium">—</span>
          )}
        </span>
        <span className="flex items-center gap-1.5">
          <User className="h-3.5 w-3.5" />
          {t('createdBy')}:{' '}
          <span className="text-foreground font-medium">
            {caseItem.createdByName
              ? `${caseItem.createdByName}${caseItem.createdBy ? ` (${caseItem.createdBy})` : ''}`
              : (caseItem.createdBy ?? '—')}
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          {t('created')}: {formatDate(caseItem.createdAt)}
        </span>
        <span className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          {t('updated')}: {formatDate(caseItem.updatedAt)}
        </span>
        {caseItem.closedAt && (
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {t('closed')}: {formatDate(caseItem.closedAt)}
          </span>
        )}
      </div>
    </div>
  )
}
