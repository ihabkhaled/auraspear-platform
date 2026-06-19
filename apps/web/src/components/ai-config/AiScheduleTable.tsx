'use client'

import { Pause, Pen, Play, RotateCcw } from 'lucide-react'
import { DataTable } from '@/components/common'
import {
  Badge,
  Button,
  Switch,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui'
import { CronPreset } from '@/enums'
import { CRON_PRESET_LABEL_KEY } from '@/lib/constants/cron-presets'
import { cronPresetFromExpression } from '@/lib/cron.utils'
import { formatDate, lookup } from '@/lib/utils'
import type { AiAgentSchedule, AiScheduleTableProps, Column } from '@/types'

export function AiScheduleTable({
  schedules,
  isLoading,
  onToggle,
  onPause,
  onRunNow,
  onEdit,
  onReset,
  t,
}: AiScheduleTableProps) {
  // Columns contain JSX render functions — acceptable inline per CLAUDE.md rule 33
  const columns: Column<AiAgentSchedule>[] = [
    { key: 'module', label: t('schedules.module') },
    { key: 'agentId', label: t('schedules.agent') },
    {
      key: 'cronExpression',
      label: t('schedules.cron'),
      render: (value: unknown) => {
        const expr = value as string
        const preset = cronPresetFromExpression(expr)
        if (preset === CronPreset.CUSTOM) {
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-muted-foreground font-mono text-xs">{expr}</span>
                </TooltipTrigger>
                <TooltipContent>{t('cronPresets.custom')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        }
        const labelKey = lookup(CRON_PRESET_LABEL_KEY, preset)
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs">{labelKey ? t(labelKey) : expr}</span>
              </TooltipTrigger>
              <TooltipContent className="font-mono">{expr}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      },
    },
    { key: 'timezone', label: t('schedules.timezone') },
    {
      key: 'isEnabled',
      label: t('schedules.enabled'),
      render: (value: unknown, row: AiAgentSchedule) => {
        if (!value) {
          return <Badge variant="secondary">{t('disabled')}</Badge>
        }
        if (row.isPaused) {
          return <Badge variant="warning">{t('schedules.paused')}</Badge>
        }
        return <Badge variant="success">{t('enabled')}</Badge>
      },
    },
    {
      key: 'lastRunAt',
      label: t('schedules.lastRun'),
      render: (value: unknown) => <span>{value ? formatDate(value as string) : '-'}</span>,
    },
    {
      key: 'nextRunAt',
      label: t('schedules.nextRun'),
      render: (value: unknown) => <span>{value ? formatDate(value as string) : '-'}</span>,
    },
    {
      key: 'lastStatus',
      label: t('schedules.lastStatus'),
      render: (value: unknown) => {
        if (!value) {
          return <span>-</span>
        }
        const status = value as string
        if (status === 'success' || status === 'completed') {
          return <Badge variant="success">{status}</Badge>
        }
        if (status === 'failed') {
          return <Badge variant="destructive">{status}</Badge>
        }
        if (status === 'no_context' || status === 'skipped') {
          return <Badge variant="warning">{status.replaceAll('_', ' ')}</Badge>
        }
        if (status === 'dispatched') {
          return <Badge variant="info">{status}</Badge>
        }
        return <Badge variant="secondary">{status}</Badge>
      },
    },
    {
      key: 'failureStreak',
      label: t('schedules.failureStreak'),
      render: (value: unknown) => {
        const streak = value as number
        if (streak > 0) {
          return <span className="text-status-error font-medium">{streak}</span>
        }
        return <span className="text-muted-foreground">{streak}</span>
      },
    },
    {
      key: 'actions',
      label: '',
      render: (_value: unknown, row: AiAgentSchedule) => (
        <TooltipProvider>
          <div className="flex items-center gap-1">
            <Switch
              checked={row.isEnabled}
              onCheckedChange={checked => onToggle(row.id, checked)}
              aria-label={t('schedules.toggleEnable')}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onPause(row.id, !row.isPaused)}
                  disabled={!row.isEnabled}
                >
                  {row.isPaused ? (
                    <Play className="h-3.5 w-3.5" />
                  ) : (
                    <Pause className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('schedules.togglePause')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={() => onEdit(row)}>
                  <Pen className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('schedules.edit')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRunNow(row.id)}
                  disabled={!row.isEnabled}
                >
                  <Play className="text-status-success h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('schedules.runNow')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={() => onReset(row.id)}>
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('schedules.reset')}</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={schedules}
      emptyMessage={t('schedules.noSchedules')}
      loading={isLoading}
    />
  )
}
