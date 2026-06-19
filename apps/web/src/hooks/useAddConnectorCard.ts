import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Permission } from '@/enums'
import { hasPermission } from '@/lib/permissions'
import { useAuthStore } from '@/stores'

export function useAddConnectorCard() {
  const router = useRouter()
  const t = useTranslations('connectors')
  const permissions = useAuthStore(s => s.permissions)
  const canAdd = hasPermission(permissions, Permission.CONNECTORS_CREATE)

  return { router, t, canAdd }
}
