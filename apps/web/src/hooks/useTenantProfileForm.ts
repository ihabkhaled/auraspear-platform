import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm, useWatch } from 'react-hook-form'
import { TenantEnvironment } from '@/enums'
import { tenantProfileSchema } from '@/lib/validation/admin.schema'
import type { TenantProfileFormValues, TenantProfileFormProps } from '@/types'

export function useTenantProfileForm({
  defaultValues,
}: {
  defaultValues: TenantProfileFormProps['defaultValues'] | undefined
}) {
  const t = useTranslations('admin')

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<TenantProfileFormValues>({
    resolver: zodResolver(tenantProfileSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      environment: defaultValues?.environment ?? TenantEnvironment.PRODUCTION,
      settings: defaultValues?.settings ?? '',
    },
  })

  const currentEnvironment = useWatch({ control, name: 'environment' })

  return { t, register, handleSubmit, setValue, errors, currentEnvironment }
}
