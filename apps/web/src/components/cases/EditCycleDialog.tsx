'use client'

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
  Textarea,
} from '@/components/ui'
import { useEditCycleDialog } from '@/hooks'
import type { EditCycleDialogProps } from '@/types'

export function EditCycleDialog({
  open,
  onOpenChange,
  onSubmit,
  loading,
  cycle,
}: EditCycleDialogProps) {
  const { t, register, handleSubmit, formState, handleFormSubmit, handleOpenChange } =
    useEditCycleDialog({ open, onOpenChange, onSubmit, cycle })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('editCycle')}</DialogTitle>
          <DialogDescription>{t('editCycleDescription')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-cycle-name">{t('name')}</Label>
            <Input
              id="edit-cycle-name"
              {...register('name', { required: true })}
              placeholder={t('namePlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-cycle-description">{t('description')}</Label>
            <Textarea
              id="edit-cycle-description"
              {...register('description')}
              placeholder={t('descriptionPlaceholder')}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-cycle-start">{t('startDate')}</Label>
              <Input
                id="edit-cycle-start"
                type="date"
                {...register('startDate', { required: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cycle-end">{t('endDate')}</Label>
              <Input id="edit-cycle-end" type="date" {...register('endDate')} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={loading ?? !formState.isValid}>
              {loading ? t('saving') : t('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
