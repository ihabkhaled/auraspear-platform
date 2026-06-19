'use client'

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import {
  Button,
  Input,
  Label,
  Textarea,
} from '@/components/ui'
import type { AttackPathStageEditorProps } from '@/types'

export function AttackPathStageEditor({
  stages,
  onAdd,
  onRemove,
  onMoveUp,
  onMoveDown,
  onStageChange,
  t,
}: AttackPathStageEditorProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{t('stagesLabel')}</Label>
        <Button type="button" variant="outline" size="sm" onClick={onAdd} className="gap-1">
          <Plus className="h-3.5 w-3.5" />
          {t('addStage')}
        </Button>
      </div>

      {stages.map((stage, index) => (
        <div
          key={`stage-${String(index)}`}
          className="border-border bg-muted/50 flex flex-col gap-2 rounded-lg border p-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium">
              {t('stageNumber', { number: index + 1 })}
            </span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onMoveUp(index)}
                disabled={index === 0}
                className="h-7 w-7 p-0"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onMoveDown(index)}
                disabled={index === stages.length - 1}
                className="h-7 w-7 p-0"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemove(index)}
                disabled={stages.length <= 1}
                className="text-destructive h-7 w-7 p-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">{t('stageName')}</Label>
              <Input
                value={stage.name}
                onChange={e => onStageChange(index, 'name', e.currentTarget.value)}
                placeholder={t('stageNamePlaceholder')}
                className="h-8 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">{t('stageMitreId')}</Label>
              <Input
                value={stage.mitreId}
                onChange={e => onStageChange(index, 'mitreId', e.currentTarget.value)}
                placeholder={t('stageMitreIdPlaceholder')}
                className="h-8 text-sm"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-xs">{t('stageDescription')}</Label>
            <Textarea
              value={stage.description}
              onChange={e => onStageChange(index, 'description', e.currentTarget.value)}
              placeholder={t('stageDescriptionPlaceholder')}
              className="min-h-[60px] resize-none text-sm"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-xs">{t('stageAssets')}</Label>
            <Input
              value={(stage.assets ?? []).join(', ')}
              onChange={e =>
                onStageChange(
                  index,
                  'assets',
                  e.currentTarget.value
                    .split(',')
                    .map((s: string) => s.trim())
                    .filter((s: string) => s.length > 0)
                )
              }
              placeholder={t('stageAssetsPlaceholder')}
              className="h-8 text-sm"
            />
          </div>
        </div>
      ))}
    </div>
  )
}
