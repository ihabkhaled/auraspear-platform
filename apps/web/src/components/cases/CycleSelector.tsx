'use client'

import { RefreshCw } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { CaseCycleStatus } from '@/enums'
import { useCycleSelector } from '@/hooks'
import type { CycleSelectorProps } from '@/types'

export function CycleSelector({
  cycles,
  activeCycleId,
  selectedCycleId,
  onCycleChange,
  loading,
}: CycleSelectorProps) {
  const { t } = useCycleSelector()

  return (
    <div className="flex items-center gap-2">
      {loading && <RefreshCw className="text-muted-foreground h-4 w-4 animate-spin" />}
      <Select
        value={selectedCycleId ?? 'all'}
        onValueChange={value => onCycleChange(value === 'all' ? undefined : value)}
      >
        <SelectTrigger className="w-[240px]">
          <SelectValue placeholder={t('selectCycle')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('allCycles')}</SelectItem>
          <SelectItem value="none">{t('noCycle')}</SelectItem>
          {cycles.map(cycle => (
            <SelectItem key={cycle.id} value={cycle.id}>
              {cycle.name}
              {cycle.id === activeCycleId && cycle.status === CaseCycleStatus.ACTIVE
                ? ` (${t('active')})`
                : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
