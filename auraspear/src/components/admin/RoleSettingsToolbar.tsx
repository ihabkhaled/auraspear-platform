import { RotateCcw, Save } from 'lucide-react'
import { Button } from '@/components/ui'
import type { RoleSettingsToolbarProps } from '@/types'

export function RoleSettingsToolbar({
  isDirty,
  isSaving,
  isResetting,
  showReset = true,
  onSave,
  onReset,
  t,
}: RoleSettingsToolbarProps) {
  return (
    <div className="border-border/70 bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-4 z-20 -mx-2 rounded-xl border px-3 py-3 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        {showReset ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            disabled={isResetting || isSaving}
            className="gap-1.5"
          >
            <RotateCcw className="h-4 w-4" />
            {isResetting ? t('roleSettings.resetting') : t('roleSettings.reset')}
          </Button>
        ) : null}
        <Button
          size="sm"
          onClick={onSave}
          disabled={!isDirty || isSaving || isResetting}
          className="gap-1.5 shadow-sm"
        >
          <Save className="h-4 w-4" />
          {isSaving ? t('roleSettings.saving') : t('roleSettings.save')}
        </Button>
      </div>
    </div>
  )
}
