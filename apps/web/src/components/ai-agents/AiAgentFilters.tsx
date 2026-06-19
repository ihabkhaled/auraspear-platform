'use client'

import { Plus, Search } from 'lucide-react'
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { AiAgentStatus, AiAgentTier } from '@/enums'
import { useAiAgentFilters } from '@/hooks'
import { AI_AGENT_STATUS_LABEL_KEYS, AI_AGENT_TIER_LABEL_KEYS } from '@/lib/constants/ai-agents'
import { lookup } from '@/lib/utils'
import type { AiAgentFiltersProps } from '@/types'

export function AiAgentFilters(props: AiAgentFiltersProps) {
  const {
    t,
    searchQuery,
    handleSearchInput,
    statusFilter,
    onStatusChange,
    tierFilter,
    onTierChange,
    onCreateClick,
  } = useAiAgentFilters(props)

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-[200px] flex-1">
        <Search className="text-muted-foreground absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder={t('searchPlaceholder')}
          value={searchQuery}
          onChange={handleSearchInput}
          className="ps-9"
        />
      </div>

      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="w-full sm:w-36">
          <SelectValue placeholder={t('statusFilter')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{t('all')}</SelectItem>
          {Object.values(AiAgentStatus).map(status => (
            <SelectItem key={status} value={status}>
              {t(lookup(AI_AGENT_STATUS_LABEL_KEYS, status))}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={tierFilter} onValueChange={onTierChange}>
        <SelectTrigger className="w-full sm:w-36">
          <SelectValue placeholder={t('tierFilter')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{t('all')}</SelectItem>
          {Object.values(AiAgentTier).map(tier => (
            <SelectItem key={tier} value={tier}>
              {t(lookup(AI_AGENT_TIER_LABEL_KEYS, tier))}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {onCreateClick && (
        <Button onClick={onCreateClick} className="gap-1.5">
          <Plus className="h-4 w-4" />
          {t('createAgent')}
        </Button>
      )}
    </div>
  )
}
