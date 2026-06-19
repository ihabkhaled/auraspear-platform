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
import { useRunbookCreateDialog } from '@/hooks'
import type { RunbookCreateDialogProps } from '@/types'

export function RunbookCreateDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  t: parentT,
}: RunbookCreateDialogProps) {
  const { t, register, errors, onFormSubmit, handleOpenChange } = useRunbookCreateDialog({
    open,
    onOpenChange,
    onSubmit,
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{parentT('createRunbook')}</DialogTitle>
          <DialogDescription>{parentT('description')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onFormSubmit} className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="runbook-title">{t('fieldTitle')}</Label>
            <Input
              id="runbook-title"
              {...register('title')}
              placeholder={t('fieldTitle')}
              aria-invalid={errors.title ? true : undefined}
            />
            {errors.title && (
              <p className="text-destructive text-xs">{errors.title.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="runbook-category">{t('fieldCategory')}</Label>
            <Input
              id="runbook-category"
              {...register('category')}
              placeholder={t('fieldCategory')}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="runbook-tags">{t('fieldTags')}</Label>
            <Input
              id="runbook-tags"
              {...register('tags')}
              placeholder="tag1, tag2, tag3"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="runbook-content">{t('fieldContent')}</Label>
            <Textarea
              id="runbook-content"
              {...register('content')}
              placeholder={t('fieldContent')}
              aria-invalid={errors.content ? true : undefined}
              className="min-h-[200px] resize-none font-mono text-xs"
              rows={10}
            />
            {errors.content && (
              <p className="text-destructive text-xs">{errors.content.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              {parentT('cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t('aiLoading') : parentT('createRunbook')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
