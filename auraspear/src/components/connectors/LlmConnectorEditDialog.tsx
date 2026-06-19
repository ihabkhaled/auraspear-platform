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
import { useLlmConnectorEditDialog } from '@/hooks'
import type { LlmConnectorEditDialogProps } from '@/types'

export function LlmConnectorEditDialog({
  open,
  onOpenChange,
  onSubmit,
  initialValues,
  loading = false,
}: LlmConnectorEditDialogProps) {
  const { t, register, control, errors, onFormSubmit, handleOpenChange } =
    useLlmConnectorEditDialog({ open, onOpenChange, onSubmit, initialValues })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-full max-w-[calc(100vw-2rem)] overflow-hidden sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('editConnector')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={onFormSubmit}
          className="flex max-h-[70vh] min-w-0 flex-col gap-4 overflow-y-auto pe-1"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="llm-edit-name">{t('fieldName')}</Label>
            <Input
              id="llm-edit-name"
              {...register('name')}
              placeholder={t('namePlaceholder')}
              aria-invalid={errors.name ? true : undefined}
            />
            {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="llm-edit-description">{t('fieldDescription')}</Label>
            <Textarea
              id="llm-edit-description"
              {...register('description')}
              placeholder={t('descriptionPlaceholder')}
              className="resize-none"
              aria-invalid={errors.description ? true : undefined}
            />
            {errors.description && (
              <p className="text-destructive text-xs">{errors.description.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="llm-edit-baseUrl">{t('fieldBaseUrl')}</Label>
            <Input
              id="llm-edit-baseUrl"
              {...register('baseUrl')}
              placeholder={t('baseUrlPlaceholder')}
              aria-invalid={errors.baseUrl ? true : undefined}
            />
            {errors.baseUrl && <p className="text-destructive text-xs">{errors.baseUrl.message}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="llm-edit-apiKey">{t('fieldApiKey')}</Label>
            <Input
              id="llm-edit-apiKey"
              type="password"
              {...register('apiKey')}
              placeholder={t('apiKeyPlaceholderEdit')}
              aria-invalid={errors.apiKey ? true : undefined}
            />
            {errors.apiKey && <p className="text-destructive text-xs">{errors.apiKey.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="llm-edit-defaultModel">{t('fieldDefaultModel')}</Label>
              <Input
                id="llm-edit-defaultModel"
                {...register('defaultModel')}
                placeholder={t('modelPlaceholder')}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="llm-edit-organizationId">{t('fieldOrganizationId')}</Label>
              <Input
                id="llm-edit-organizationId"
                {...register('organizationId')}
                placeholder="org-..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>{t('fieldMaxTokensParam')}</Label>
              <Controller
                name="maxTokensParam"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="max_tokens">max_tokens</SelectItem>
                      <SelectItem value="max_completion_tokens">max_completion_tokens</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="llm-edit-timeout">{t('fieldTimeout')}</Label>
              <Input
                id="llm-edit-timeout"
                type="number"
                {...register('timeout', { valueAsNumber: true })}
                placeholder="30000"
              />
              {errors.timeout && (
                <p className="text-destructive text-xs">{errors.timeout.message}</p>
              )}
            </div>
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
