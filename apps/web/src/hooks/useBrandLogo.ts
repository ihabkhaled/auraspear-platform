import { useTranslations } from 'next-intl'

export function useBrandLogo() {
  const t = useTranslations('layout')

  return { t }
}
