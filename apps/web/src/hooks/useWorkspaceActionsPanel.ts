import { useTranslations } from 'next-intl'

export function useWorkspaceActionsPanel() {
  const t = useTranslations('connectors.workspace')

  return { t }
}
