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
import { IncidentCategory, IncidentSeverity, type IncidentStatus } from '@/enums'
import { useIncidentEditDialog } from '@/hooks'
import {
  INCIDENT_CATEGORY_LABEL_KEYS,
  INCIDENT_SEVERITY_LABEL_KEYS,
  INCIDENT_STATUS_LABEL_KEYS,
  INCIDENT_VALID_TRANSITIONS,
} from '@/lib/constants/incidents'
import { lookup } from '@/lib/utils'
import type { IncidentEditDialogProps } from '@/types'

export function IncidentEditDialog({
  open,
  onOpenChange,
  onSubmit,
  initialValues,
  assigneeOptions,
  loading = false,
}: IncidentEditDialogProps) {
  const {
    t,
    register,
    handleSubmit,
    control,
    errors,
    handleFormSubmit,
    handleOpenChange,
    currentStatus,
  } = useIncidentEditDialog({ open, onOpenChange, onSubmit, initialValues })

  const validTransitions = INCIDENT_VALID_TRANSITIONS[currentStatus as IncidentStatus] ?? []
  const statusOptions = [currentStatus, ...validTransitions] as IncidentStatus[]

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-full max-w-[95vw] overflow-hidden sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('editTitle')}</DialogTitle>
          <DialogDescription>{t('editDescription')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-incident-title">{t('formTitle')}</Label>
            <Input
              id="edit-incident-title"
              {...register('title')}
              placeholder={t('formTitlePlaceholder')}
              aria-invalid={errors.title ? true : undefined}
            />
            {errors.title && <p className="text-destructive text-xs">{t('validationTitleMin')}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-incident-description">{t('formDescription')}</Label>
            <Textarea
              id="edit-incident-description"
              {...register('description')}
              placeholder={t('formDescriptionPlaceholder')}
              aria-invalid={errors.description ? true : undefined}
              rows={4}
            />
            {errors.description && (
              <p className="text-destructive text-xs">{t('validationDescriptionMin')}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>{t('formSeverity')}</Label>
              <Controller
                name="severity"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('formSeverityPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(IncidentSeverity).map(sev => (
                        <SelectItem key={sev} value={sev}>
                          {t(lookup(INCIDENT_SEVERITY_LABEL_KEYS, sev))}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>{t('formCategory')}</Label>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('formCategoryPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(IncidentCategory).map(cat => (
                        <SelectItem key={cat} value={cat}>
                          {t(lookup(INCIDENT_CATEGORY_LABEL_KEYS, cat))}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t('formStatus')}</Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
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
              )}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t('formAssignee')}</Label>
            <Controller
              name="assigneeId"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full overflow-hidden *:data-[slot=select-value]:!block *:data-[slot=select-value]:truncate">
                    <SelectValue placeholder={t('formAssigneePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {assigneeOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-incident-mitre">{t('formMitreTechniques')}</Label>
            <Input
              id="edit-incident-mitre"
              {...register('mitreTechniques')}
              placeholder={t('formMitrePlaceholder')}
            />
            <p className="text-muted-foreground text-xs">{t('formMitreHint')}</p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              {t('cancelButton')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('saving') : t('editSubmit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
