import { useTranslations } from 'next-intl'

export function useCaseKanbanCard() {
  const t = useTranslations('cases')

  return { t }
}
