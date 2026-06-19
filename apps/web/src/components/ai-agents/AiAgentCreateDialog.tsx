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
import { AiAgentTier } from '@/enums'
import { useAiAgentCreateDialog } from '@/hooks'
import { AI_AGENT_TIER_LABEL_KEYS } from '@/lib/constants/ai-agents'
import { lookup } from '@/lib/utils'
import type { AiAgentCreateDialogProps } from '@/types'

export function AiAgentCreateDialog({
  open,
  onOpenChange,
  onSubmit,
  loading = false,
}: AiAgentCreateDialogProps) {
  const { t, register, handleSubmit, control, errors, handleFormSubmit, handleOpenChange } =
    useAiAgentCreateDialog({ open, onOpenChange, onSubmit })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-full max-w-[calc(100vw-2rem)] overflow-hidden sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('createAgent')}</DialogTitle>
          <DialogDescription>{t('createAgentDescription')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="agent-name">{t('fieldName')}</Label>
            <Input
              id="agent-name"
              {...register('name')}
              placeholder={t('fieldNamePlaceholder')}
              aria-invalid={errors.name ? true : undefined}
            />
            {errors.name && <p className="text-destructive text-xs">{t('validationNameMin')}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="agent-description">{t('fieldDescription')}</Label>
            <Textarea
              id="agent-description"
              {...register('description')}
              placeholder={t('fieldDescriptionPlaceholder')}
              aria-invalid={errors.description ? true : undefined}
              className="resize-none"
            />
            {errors.description && (
              <p className="text-destructive text-xs">{t('validationDescriptionMin')}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="agent-model">{t('fieldModel')}</Label>
            <Input
              id="agent-model"
              {...register('model')}
              placeholder={t('fieldModelPlaceholder')}
              aria-invalid={errors.model ? true : undefined}
            />
            {errors.model && <p className="text-destructive text-xs">{t('validationModelMin')}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t('fieldTier')}</Label>
            <Controller
              name="tier"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('fieldTierPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(AiAgentTier).map(tier => (
                      <SelectItem key={tier} value={tier}>
                        {t(lookup(AI_AGENT_TIER_LABEL_KEYS, tier))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.tier && <p className="text-destructive text-xs">{t('validationTier')}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="agent-soul">{t('fieldSoulMd')}</Label>
            <Textarea
              id="agent-soul"
              {...register('soulMd')}
              placeholder={t('fieldSoulMdPlaceholder')}
              className="h-32 resize-none font-mono text-sm"
            />
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
