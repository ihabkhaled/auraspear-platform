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
import { useCreateCycleDialog } from '@/hooks'
import type { CreateCycleDialogProps } from '@/types'

export function CreateCycleDialog({
  open,
  onOpenChange,
  onSubmit,
  loading,
}: CreateCycleDialogProps) {
  const { t, register, handleSubmit, formState, handleFormSubmit, handleOpenChange } =
    useCreateCycleDialog({ open, onOpenChange, onSubmit })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('createCycle')}</DialogTitle>
          <DialogDescription>{t('createCycleDescription')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cycle-name">{t('name')}</Label>
            <Input
              id="cycle-name"
              {...register('name', { required: true })}
              placeholder={t('namePlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cycle-description">{t('description')}</Label>
            <Textarea
              id="cycle-description"
              {...register('description')}
              placeholder={t('descriptionPlaceholder')}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cycle-start">{t('startDate')}</Label>
              <Input id="cycle-start" type="date" {...register('startDate', { required: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cycle-end">{t('endDate')}</Label>
              <Input id="cycle-end" type="date" {...register('endDate')} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={loading ?? !formState.isValid}>
              {loading ? t('creating') : t('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
