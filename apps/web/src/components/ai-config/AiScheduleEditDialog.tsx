'use client'

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import type { CronPreset } from '@/enums'
import { useAiScheduleEditDialog } from '@/hooks'
import { CRON_PRESET_GROUPS, CRON_PRESET_LABEL_KEY } from '@/lib/constants/cron-presets'
import { lookup } from '@/lib/utils'
import type { AiScheduleEditDialogProps } from '@/types'

export function AiScheduleEditDialog({
  open,
  onOpenChange,
  schedule,
  onSubmit,
  loading,
  t,
}: AiScheduleEditDialogProps) {
  const {
    cronPreset,
    handlePresetChange,
    customCron,
    setCustomCron,
    isCustom,
    timezone,
    setTimezone,
    executionMode,
    setExecutionMode,
    riskMode,
    setRiskMode,
    approvalMode,
    setApprovalMode,
    maxConcurrency,
    setMaxConcurrency,
    providerPreference,
    setProviderPreference,
    modelPreference,
    setModelPreference,
    handleSubmit,
  } = useAiScheduleEditDialog(schedule, onSubmit)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('schedules.editSchedule')}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>{t('schedules.cron')}</Label>
            <Select value={cronPreset} onValueChange={v => handlePresetChange(v as CronPreset)}>
              <SelectTrigger>
                <SelectValue placeholder={t('cronPresets.selectFrequency')} />
              </SelectTrigger>
              <SelectContent>
                {CRON_PRESET_GROUPS.map(group => (
                  <SelectGroup key={group.labelKey}>
                    <SelectLabel>{t(group.labelKey)}</SelectLabel>
                    {group.presets.map(preset => {
                      const labelKey = lookup(CRON_PRESET_LABEL_KEY, preset)
                      return (
                        <SelectItem key={preset} value={preset}>
                          {labelKey ? t(labelKey) : preset}
                        </SelectItem>
                      )
                    })}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isCustom && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>{t('cronPresets.custom')}</Label>
              <Input
                value={customCron}
                onChange={e => setCustomCron(e.currentTarget.value)}
                placeholder={t('cronPresets.customCronPlaceholder')}
              />
              <p className="text-muted-foreground text-xs">{t('schedules.cronHelp')}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>{t('schedules.timezone')}</Label>
            <Input
              value={timezone}
              onChange={e => setTimezone(e.currentTarget.value)}
              placeholder="UTC"
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t('schedules.executionMode')}</Label>
            <Select value={executionMode} onValueChange={setExecutionMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sequential">Sequential</SelectItem>
                <SelectItem value="parallel">Parallel</SelectItem>
                <SelectItem value="fan_out">Fan Out</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{t('schedules.riskMode')}</Label>
            <Select value={riskMode} onValueChange={setRiskMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="conservative">Conservative</SelectItem>
                <SelectItem value="aggressive">Aggressive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{t('schedules.approvalMode')}</Label>
            <Select value={approvalMode} onValueChange={setApprovalMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="approval_required">Approval Required</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{t('schedules.maxConcurrency')}</Label>
            <Input
              type="number"
              value={maxConcurrency}
              onChange={e => setMaxConcurrency(e.currentTarget.value)}
              min={1}
              max={10}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t('schedules.providerPreference')}</Label>
            <Input
              value={providerPreference}
              onChange={e => setProviderPreference(e.currentTarget.value)}
              placeholder={t('schedules.optionalOverride')}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t('schedules.modelPreference')}</Label>
            <Input
              value={modelPreference}
              onChange={e => setModelPreference(e.currentTarget.value)}
              placeholder={t('schedules.optionalOverride')}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? t('saving') : t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
