'use client'

import { Search, X } from 'lucide-react'
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { NotificationType } from '@/enums'
import { ALL_FILTER } from '@/lib/constants/filters'
import type { NotificationFiltersProps } from '@/types'

export function NotificationFilters({
  searchQuery,
  typeFilter,
  readFilter,
  onSearchChange,
  onTypeChange,
  onReadChange,
  onClearAll,
  t,
}: NotificationFiltersProps) {
  const hasFilters = searchQuery.length > 0 || typeFilter.length > 0 || readFilter.length > 0

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="text-muted-foreground absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder={t('searchPlaceholder')}
          value={searchQuery}
          onChange={e => onSearchChange(e.currentTarget.value)}
          className="ps-9"
        />
      </div>
      <Select value={typeFilter || ALL_FILTER} onValueChange={onTypeChange}>
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder={t('filterByType')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_FILTER}>{t('allTypes')}</SelectItem>
          <SelectItem value={NotificationType.MENTION}>{t('mention')}</SelectItem>
          <SelectItem value={NotificationType.CASE_ASSIGNED}>{t('caseAssigned')}</SelectItem>
          <SelectItem value={NotificationType.CASE_UNASSIGNED}>{t('caseUnassigned')}</SelectItem>
          <SelectItem value={NotificationType.CASE_COMMENT_ADDED}>
            {t('caseCommentAdded')}
          </SelectItem>
          <SelectItem value={NotificationType.CASE_TASK_ADDED}>{t('caseTaskAdded')}</SelectItem>
          <SelectItem value={NotificationType.CASE_ARTIFACT_ADDED}>
            {t('caseArtifactAdded')}
          </SelectItem>
          <SelectItem value={NotificationType.CASE_STATUS_CHANGED}>
            {t('caseStatusChanged')}
          </SelectItem>
          <SelectItem value={NotificationType.CASE_UPDATED}>{t('caseUpdated')}</SelectItem>
          <SelectItem value={NotificationType.TENANT_ASSIGNED}>{t('tenantAssigned')}</SelectItem>
          <SelectItem value={NotificationType.ROLE_CHANGED}>{t('roleChanged')}</SelectItem>
          <SelectItem value={NotificationType.USER_BLOCKED}>{t('userBlocked')}</SelectItem>
          <SelectItem value={NotificationType.USER_UNBLOCKED}>{t('userUnblocked')}</SelectItem>
          <SelectItem value={NotificationType.USER_REMOVED}>{t('userRemoved')}</SelectItem>
          <SelectItem value={NotificationType.USER_RESTORED}>{t('userRestored')}</SelectItem>
        </SelectContent>
      </Select>
      <Select value={readFilter || ALL_FILTER} onValueChange={onReadChange}>
        <SelectTrigger className="w-full sm:w-36">
          <SelectValue placeholder={t('filterByRead')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_FILTER}>{t('allStatus')}</SelectItem>
          <SelectItem value="false">{t('unread')}</SelectItem>
          <SelectItem value="true">{t('read')}</SelectItem>
        </SelectContent>
      </Select>
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClearAll}>
          <X className="me-1 h-4 w-4" />
          {t('clearFilters')}
        </Button>
      )}
    </div>
  )
}
