import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useExplorerOverview } from './useExplorer'

export function useExplorerOverviewPage() {
  const t = useTranslations('explorer')
  const router = useRouter()
  const { data, isLoading, error } = useExplorerOverview()

  return { t, router, data, isLoading, error }
}
