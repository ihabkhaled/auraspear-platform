import { useTranslations } from 'next-intl'

export function useHuntStatusBar() {
  const t = useTranslations('hunt')

  return { t }
}
