import { useTranslations } from 'next-intl'

export function useErrorMessage() {
  const t = useTranslations()

  return { t }
}
