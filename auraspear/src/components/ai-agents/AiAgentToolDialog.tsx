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
import { useAiAgentToolDialog } from '@/hooks'
import type { AiAgentToolDialogProps } from '@/types'

export function AiAgentToolDialog({
  open,
  onOpenChange,
  onSubmit,
  initialValues,
  loading = false,
}: AiAgentToolDialogProps) {
  const { t, register, handleSubmit, errors, isEditing, handleFormSubmit, handleOpenChange } =
    useAiAgentToolDialog({ open, onOpenChange, onSubmit, initialValues })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-full max-w-[calc(100vw-2rem)] overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? t('editTool') : t('addTool')}</DialogTitle>
          <DialogDescription>{t('toolDialogDescription')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="tool-name">{t('toolName')}</Label>
            <Input
              id="tool-name"
              {...register('name')}
              placeholder={t('toolNamePlaceholder')}
              aria-invalid={errors.name ? true : undefined}
            />
            {errors.name && (
              <p className="text-destructive text-xs">{t('validationToolNameMin')}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="tool-description">{t('toolDescription')}</Label>
            <Textarea
              id="tool-description"
              {...register('description')}
              placeholder={t('toolDescriptionPlaceholder')}
              aria-invalid={errors.description ? true : undefined}
              className="resize-none"
            />
            {errors.description && (
              <p className="text-destructive text-xs">{t('validationToolDescriptionMin')}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="tool-schema">{t('toolSchema')}</Label>
            <Textarea
              id="tool-schema"
              {...register('schema')}
              placeholder={t('toolSchemaPlaceholder')}
              aria-invalid={errors.schema ? true : undefined}
              className="h-40 resize-none font-mono text-sm"
            />
            {errors.schema && (
              <p className="text-destructive text-xs">{t('validationToolSchemaMin')}</p>
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
              {loading && t('saving')}
              {!loading && isEditing && t('save')}
              {!loading && !isEditing && t('submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
