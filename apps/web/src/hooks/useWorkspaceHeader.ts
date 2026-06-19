import { useTranslations } from 'next-intl'

export function useWorkspaceHeader() {
  const t = useTranslations('connectors')

  return { t }
}
