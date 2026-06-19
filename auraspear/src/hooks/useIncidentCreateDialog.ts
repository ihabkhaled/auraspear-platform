import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { IncidentCategory, IncidentSeverity } from '@/enums'
import { createIncidentSchema } from '@/lib/validation/incidents.schema'
import type { CreateIncidentFormValues, IncidentCreateHookParams } from '@/types'

export function useIncidentCreateDialog({
  open,
  onOpenChange,
  onSubmit,
}: IncidentCreateHookParams) {
  const t = useTranslations('incidents')

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateIncidentFormValues>({
    resolver: zodResolver(createIncidentSchema),
    defaultValues: {
      title: '',
      description: '',
      severity: IncidentSeverity.MEDIUM,
      category: IncidentCategory.OTHER,
    },
  })

  useEffect(() => {
    if (!open) {
      reset()
    }
  }, [open, reset])

  const handleFormSubmit = (data: CreateIncidentFormValues) => {
    onSubmit(data)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      reset()
    }
    onOpenChange(nextOpen)
  }

  return {
    t,
    register,
    handleSubmit,
    control,
    errors,
    handleFormSubmit,
    handleOpenChange,
  }
}
