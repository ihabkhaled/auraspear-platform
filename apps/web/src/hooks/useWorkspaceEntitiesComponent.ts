import { useTranslations } from 'next-intl'

export function useWorkspaceEntitiesComponent() {
  const t = useTranslations('connectors.workspace')

  return { t }
}
