import { useTranslations } from 'next-intl'

export function useWorkspaceRecentActivityComponent() {
  const t = useTranslations('connectors.workspace')

  return { t }
}
