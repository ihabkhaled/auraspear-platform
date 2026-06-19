'use client'

import { Search } from 'lucide-react'
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { RuleSeverity, RuleStatus } from '@/enums'
import { useCorrelationFilters } from '@/hooks'
import { SOURCE_TABS } from '@/lib/constants/correlation'
import type { CorrelationFiltersProps } from '@/types'

export function CorrelationFilters(props: CorrelationFiltersProps) {
  const {
    t,
    searchQuery,
    onSearchChange,
    activeTab,
    onTabChange,
    severityFilter,
    onSeverityChange,
    statusFilter,
    onStatusChange,
  } = useCorrelationFilters(props)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {SOURCE_TABS.map(tab => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'default' : 'outline'}
            size="sm"
            onClick={() => onTabChange(tab)}
          >
            {tab === 'all' && t('allRules')}
            {tab === 'sigma' && t('sigmaCommunity')}
            {tab === 'custom' && t('custom')}
            {tab === 'ai' && t('aiGenerated')}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-64">
          <Search className="text-muted-foreground absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={e => onSearchChange(e.currentTarget.value)}
            className="ps-9"
          />
        </div>
        <Select value={severityFilter} onValueChange={onSeverityChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t('severityFilter')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allRules')}</SelectItem>
            {Object.values(RuleSeverity).map(sev => (
              <SelectItem key={sev} value={sev}>
                {t(`severity${sev.charAt(0).toUpperCase()}${sev.slice(1)}` as 'severityCritical')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t('statusFilter')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allRules')}</SelectItem>
            {Object.values(RuleStatus).map(st => (
              <SelectItem key={st} value={st}>
                {t(`status${st.charAt(0).toUpperCase()}${st.slice(1)}` as 'statusActive')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
