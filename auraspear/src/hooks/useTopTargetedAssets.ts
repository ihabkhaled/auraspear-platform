import { useTranslations } from 'next-intl'

export function useTopTargetedAssets() {
  const t = useTranslations('dashboard')

  return { t }
}
