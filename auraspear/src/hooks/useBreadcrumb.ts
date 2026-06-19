import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'

export function useBreadcrumb() {
  const pathname = usePathname()
  const t = useTranslations()

  const segments = pathname.split('/').filter(Boolean)

  return { segments, t }
}
