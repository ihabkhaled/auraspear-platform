import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { UserRole } from '@/enums'
import { userRoleSchema } from '@/lib/validation/admin.schema'
import type { UserRoleFormValues, UserRoleFormProps } from '@/types'

export function useUserRoleForm({
  defaultValues,
}: {
  defaultValues: UserRoleFormProps['defaultValues'] | undefined
}) {
  const t = useTranslations('admin')

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<UserRoleFormValues>({
    resolver: zodResolver(userRoleSchema),
    defaultValues: {
      role: defaultValues?.role ?? UserRole.SOC_ANALYST_L1,
      permissions: defaultValues?.permissions ?? [],
    },
  })

  return { t, control, handleSubmit, errors }
}
