'use client'

import {
  Badge,
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
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@/components/ui'
import { AiFeatureKey } from '@/enums'
import { usePromptDialog } from '@/hooks'
import { AI_FEATURE_KEY_LABEL_KEYS } from '@/lib/constants/ai-config'
import { PROMPT_PLACEHOLDERS } from '@/lib/constants/prompt-placeholders'
import { lookup } from '@/lib/utils'
import type { PromptDialogProps } from '@/types'

export function PromptDialog({
  open,
  onOpenChange,
  prompt,
  onSubmit,
  loading,
  t,
}: PromptDialogProps) {
  const {
    isEdit,
    taskType,
    setTaskType,
    name,
    setName,
    content,
    setContent,
    handleSubmit,
    canSubmit,
  } = usePromptDialog(prompt, onSubmit)

  const placeholders = lookup(PROMPT_PLACEHOLDERS, taskType) ?? ['{{context}}']

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('editPrompt') : t('createPrompt')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!isEdit && (
            <div className="space-y-2">
              <Label>{t('promptTaskType')}</Label>
              <Select value={taskType} onValueChange={setTaskType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(AiFeatureKey).map(key => {
                    const labelKey = lookup(AI_FEATURE_KEY_LABEL_KEYS, key)
                    return (
                      <SelectItem key={key} value={key}>
                        {labelKey ? t(labelKey) : key}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>{t('promptName')}</Label>
            <Input
              value={name}
              onChange={e => setName(e.currentTarget.value)}
              placeholder={t('promptName')}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('promptContent')}</Label>
            <div className="bg-muted/50 border-border space-y-2 rounded-md border p-3">
              <p className="text-muted-foreground text-xs font-medium">
                {t('promptPlaceholdersHint')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(placeholders as string[]).map(placeholder => (
                  <Badge key={placeholder} variant="outline" className="font-mono text-xs">
                    {placeholder}
                  </Badge>
                ))}
              </div>
            </div>
            <Textarea
              value={content}
              onChange={e => setContent(e.currentTarget.value)}
              placeholder={t('promptContentPlaceholder')}
              rows={8}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !canSubmit}>
            {loading ? t('saving') : t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
