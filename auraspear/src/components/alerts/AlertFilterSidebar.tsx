'use client'

import { Search } from 'lucide-react'
import {
  Button,
  Checkbox,
  Input,
  Label,
} from '@/components/ui'
import { type AlertSeverity } from '@/enums'
import { useAlertFilterSidebar } from '@/hooks'
import { getSeverityDotClass } from '@/lib/alert.utils'
import { ALERT_TIME_RANGES } from '@/lib/constants/alerts'
import { cn } from '@/lib/utils'
import type { AlertFilterSidebarProps } from '@/types'

export function AlertFilterSidebar({
  timeRange,
  onTimeRangeChange,
  selectedSeverities,
  onSeverityChange,
  severityCounts,
  agentFilter,
  onAgentFilterChange,
  ruleGroup,
  onRuleGroupChange,
}: AlertFilterSidebarProps) {
  const { t, tCommon } = useAlertFilterSidebar()

  const handleSeverityToggle = (severity: AlertSeverity) => {
    if (selectedSeverities.includes(severity)) {
      onSeverityChange(selectedSeverities.filter(s => s !== severity))
    } else {
      onSeverityChange([...selectedSeverities, severity])
    }
  }

  return (
    <aside className="w-full shrink-0 space-y-6 xl:w-64">
      <div>
        <h3 className="text-muted-foreground mb-3 text-xs font-bold tracking-wider uppercase">
          {t('timeRange')}
        </h3>
        <div className="flex gap-1">
          {ALERT_TIME_RANGES.map(range => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => onTimeRangeChange(range)}
            >
              {range}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-muted-foreground mb-3 text-xs font-bold tracking-wider uppercase">
          {t('filterBySeverity')}
        </h3>
        <div className="space-y-2">
          {severityCounts.map(({ severity, count }) => (
            <div key={severity} className="flex items-center gap-2">
              <Checkbox
                id={`severity-${severity}`}
                checked={selectedSeverities.includes(severity)}
                onCheckedChange={() => handleSeverityToggle(severity)}
              />
              <Label
                htmlFor={`severity-${severity}`}
                className="flex flex-1 cursor-pointer items-center gap-2 text-sm"
              >
                <span
                  className={cn('h-2 w-2 shrink-0 rounded-full', getSeverityDotClass(severity))}
                />
                <span className="capitalize">{severity}</span>
                <span className="text-muted-foreground ms-auto text-xs tabular-nums">{count}</span>
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-muted-foreground mb-3 text-xs font-bold tracking-wider uppercase">
          {t('filterByAgent')}
        </h3>
        <div className="relative">
          <Search className="text-muted-foreground absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
          <Input
            value={agentFilter}
            onChange={e => onAgentFilterChange(e.currentTarget.value)}
            placeholder={tCommon('search')}
            className="ps-8 text-sm"
          />
        </div>
      </div>

      <div>
        <h3 className="text-muted-foreground mb-3 text-xs font-bold tracking-wider uppercase">
          {t('ruleGroup')}
        </h3>
        <Input
          value={ruleGroup}
          onChange={e => onRuleGroupChange(e.currentTarget.value)}
          placeholder={tCommon('filter')}
          className="text-sm"
        />
      </div>
    </aside>
  )
}
