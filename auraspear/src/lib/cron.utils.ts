import { CronPreset } from '@/enums'
import { CRON_PRESET_EXPRESSION, CRON_PRESET_LABEL_KEY } from '@/lib/constants/cron-presets'
import { lookup } from '@/lib/utils'

/**
 * Reverse-lookup: given a cron expression, find the matching CronPreset.
 * Returns CronPreset.CUSTOM if no preset matches.
 */
export function cronPresetFromExpression(expression: string): CronPreset {
  const trimmed = expression.trim()

  for (const preset of Object.values(CronPreset)) {
    if (preset === CronPreset.CUSTOM) {
      continue
    }
    const presetExpr = lookup(CRON_PRESET_EXPRESSION, preset)
    if (presetExpr === trimmed) {
      return preset
    }
  }

  return CronPreset.CUSTOM
}

/**
 * Resolve a CronPreset to its cron expression string.
 * For CUSTOM, returns the provided fallback expression.
 */
export function cronExpressionFromPreset(preset: CronPreset, customExpression?: string): string {
  if (preset === CronPreset.CUSTOM) {
    return customExpression ?? ''
  }
  return lookup(CRON_PRESET_EXPRESSION, preset) ?? ''
}

/**
 * Get the human-readable i18n label key for a cron expression.
 * Uses preset lookup first; falls back to 'cronPresets.custom'.
 */
export function cronLabelKeyFromExpression(expression: string): string {
  const preset = cronPresetFromExpression(expression)
  return lookup(CRON_PRESET_LABEL_KEY, preset) ?? 'cronPresets.custom'
}
