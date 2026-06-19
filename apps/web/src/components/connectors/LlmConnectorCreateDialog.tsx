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
import { useLlmConnectorCreateDialog } from '@/hooks'
import type { LlmConnectorCreateDialogProps } from '@/types'

export function LlmConnectorCreateDialog({
  open,
  onOpenChange,
  onSubmit,
  loading = false,
}: LlmConnectorCreateDialogProps) {
  const { t, register, control, errors, onFormSubmit, handleOpenChange } =
    useLlmConnectorCreateDialog({ open, onOpenChange, onSubmit })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-full max-w-[calc(100vw-2rem)] overflow-hidden sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('createConnector')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={onFormSubmit}
          className="flex max-h-[70vh] min-w-0 flex-col gap-4 overflow-y-auto pe-1"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="llm-name">{t('fieldName')}</Label>
            <Input
              id="llm-name"
              {...register('name')}
              placeholder={t('namePlaceholder')}
              aria-invalid={errors.name ? true : undefined}
            />
            {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="llm-description">{t('fieldDescription')}</Label>
            <Textarea
              id="llm-description"
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
            <Label htmlFor="llm-baseUrl">{t('fieldBaseUrl')}</Label>
            <Input
              id="llm-baseUrl"
              {...register('baseUrl')}
              placeholder={t('baseUrlPlaceholder')}
              aria-invalid={errors.baseUrl ? true : undefined}
            />
            {errors.baseUrl && <p className="text-destructive text-xs">{errors.baseUrl.message}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="llm-apiKey">{t('fieldApiKey')}</Label>
            <Input
              id="llm-apiKey"
              type="password"
              {...register('apiKey')}
              placeholder={t('apiKeyPlaceholder')}
              aria-invalid={errors.apiKey ? true : undefined}
            />
            {errors.apiKey && <p className="text-destructive text-xs">{errors.apiKey.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="llm-defaultModel">{t('fieldDefaultModel')}</Label>
              <Input
                id="llm-defaultModel"
                {...register('defaultModel')}
                placeholder={t('modelPlaceholder')}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="llm-organizationId">{t('fieldOrganizationId')}</Label>
              <Input
                id="llm-organizationId"
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
              <Label htmlFor="llm-timeout">{t('fieldTimeout')}</Label>
              <Input
                id="llm-timeout"
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
              {loading ? t('creating') : t('submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
