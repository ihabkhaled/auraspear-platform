import { useTranslations } from 'next-intl'

export function useUebaMlModelCard() {
  const t = useTranslations('ueba')

  return {
    t,
  }
}
