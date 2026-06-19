import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useLogout } from '@/hooks'
import { getInitials } from '@/lib/case.utils'
import { useAuthStore } from '@/stores'

export function useUserMenu() {
  const t = useTranslations('layout')
  const router = useRouter()
  const { user } = useAuthStore()
  const handleLogout = useLogout()

  const displayName = user?.email?.split('@')[0] ?? t('socAnalyst')
  const displayEmail = user?.email ?? ''
  const initials = displayName ? getInitials(displayName) : 'U'

  return { t, router, displayName, displayEmail, initials, handleLogout }
}
