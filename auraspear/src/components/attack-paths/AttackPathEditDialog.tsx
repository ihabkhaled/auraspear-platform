'use client'

import { Controller } from 'react-hook-form'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@/components/ui'
import { AttackPathSeverity, AttackPathStatus } from '@/enums'
import { useAttackPathEditDialog } from '@/hooks'
import {
  ATTACK_PATH_SEVERITY_LABEL_KEYS,
  ATTACK_PATH_STATUS_LABEL_KEYS,
} from '@/lib/constants/attack-paths'
import { lookup } from '@/lib/utils'
import type { AttackPathEditDialogProps } from '@/types'
import { AttackPathStageEditor } from './AttackPathStageEditor'

export function AttackPathEditDialog({
  open,
  onOpenChange,
  onSubmit,
  initialValues,
  loading = false,
}: AttackPathEditDialogProps) {
  const {
    t,
    register,
    control,
    errors,
    onFormSubmit,
    handleOpenChange,
    handleAddStage,
    handleRemoveStage,
    handleMoveStageUp,
    handleMoveStageDown,
  } = useAttackPathEditDialog({ open, onOpenChange, onSubmit, initialValues })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[95vw] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('editPath')}</DialogTitle>
          <DialogDescription>{t('editPathDescription')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onFormSubmit} className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-ap-title">{t('fieldTitle')}</Label>
            <Input
              id="edit-ap-title"
              {...register('title')}
              placeholder={t('fieldTitlePlaceholder')}
              aria-invalid={errors.title ? true : undefined}
            />
            {errors.title && <p className="text-destructive text-xs">{t('validationTitleMin')}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-ap-description">{t('fieldDescription')}</Label>
            <Textarea
              id="edit-ap-description"
              {...register('description')}
              placeholder={t('fieldDescriptionPlaceholder')}
              aria-invalid={errors.description ? true : undefined}
              className="resize-none"
            />
            {errors.description && (
              <p className="text-destructive text-xs">{t('validationDescriptionMin')}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>{t('fieldSeverity')}</Label>
              <Controller
                name="severity"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('fieldSeverityPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(AttackPathSeverity).map(severity => (
                        <SelectItem key={severity} value={severity}>
                          {t(lookup(ATTACK_PATH_SEVERITY_LABEL_KEYS, severity))}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.severity && (
                <p className="text-destructive text-xs">{t('validationSeverity')}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label>{t('fieldStatus')}</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('fieldStatusPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(AttackPathStatus).map(status => (
                        <SelectItem key={status} value={status}>
                          {t(lookup(ATTACK_PATH_STATUS_LABEL_KEYS, status))}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.status && <p className="text-destructive text-xs">{t('validationStatus')}</p>}
            </div>
          </div>

          <Controller
            name="stages"
            control={control}
            render={({ field }) => (
              <AttackPathStageEditor
                stages={field.value}
                onAdd={handleAddStage}
                onRemove={handleRemoveStage}
                onMoveUp={handleMoveStageUp}
                onMoveDown={handleMoveStageDown}
                onStageChange={(idx, key, value) => {
                  const updated = [...field.value]
                  const current = updated.at(idx)
                  if (current) {
                    updated.splice(idx, 1, { ...current, [key]: value })
                    field.onChange(updated)
                  }
                }}
                t={t}
              />
            )}
          />
          {errors.stages && <p className="text-destructive text-xs">{t('validationStagesMin')}</p>}

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-ap-affected-assets">{t('fieldAffectedAssets')}</Label>
            <Input
              id="edit-ap-affected-assets"
              type="number"
              min="0"
              max="1000000"
              {...register('affectedAssets', { valueAsNumber: true })}
              aria-invalid={errors.affectedAssets ? true : undefined}
              placeholder={t('fieldAffectedAssetsPlaceholder')}
            />
            {errors.affectedAssets && (
              <p className="text-destructive text-xs">{t('validationAffectedAssets')}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('saving') : t('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
