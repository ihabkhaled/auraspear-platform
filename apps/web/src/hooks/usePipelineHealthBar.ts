import { useTranslations } from 'next-intl'

export function usePipelineHealthBar() {
  const t = useTranslations('dashboard')

  return { t }
}
