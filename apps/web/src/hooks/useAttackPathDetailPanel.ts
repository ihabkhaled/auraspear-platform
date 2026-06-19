import { useTranslations } from 'next-intl'
import { useAttackPath } from './useAttackPaths'

export function useAttackPathDetailPanel(pathId: string) {
  const t = useTranslations('attackPath')
  const { data, isLoading } = useAttackPath(pathId)

  const path = data?.data ?? null

  return {
    t,
    path,
    isLoading,
  }
}
