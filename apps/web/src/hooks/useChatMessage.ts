import { useTranslations } from 'next-intl'

export function useChatMessage() {
  const t = useTranslations('hunt')

  return { t }
}
