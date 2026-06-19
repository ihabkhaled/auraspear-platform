import { useTranslations } from 'next-intl'
import { usePagination } from './usePagination'
import { useExecutions } from './useSoar'

export function useSoarExecutionHistory(playbookId: string | null) {
  const t = useTranslations('soar')
  const pagination = usePagination({ initialPage: 1, initialLimit: 5 })

  const { data, isFetching } = useExecutions(
    playbookId
      ? {
          playbookId,
          page: pagination.page,
          limit: pagination.limit,
        }
      : undefined
  )

  return {
    t,
    data,
    isFetching,
    pagination,
    executions: data?.data ?? [],
  }
}
