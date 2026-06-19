import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Toast, SweetAlertDialog, SweetAlertIcon } from '@/components/common'
import { Permission, SortOrder } from '@/enums'
import { hasPermission } from '@/lib/permissions'
import { buildErrorToastHandler } from '@/lib/toast.utils'
import { useAuthStore } from '@/stores'
import type { CaseCycle, CreateCycleFormValues, EditCycleFormValues } from '@/types'
import {
  useCaseCycles,
  useCreateCaseCycle,
  useCloseCaseCycle,
  useUpdateCaseCycle,
  useActivateCaseCycle,
  useDeleteCaseCycle,
  useOrphanedCaseStats,
} from './useCaseCycles'
import { usePagination } from './usePagination'

export function useCycleHistoryPage() {
  const t = useTranslations('cases.cycles')
  const tErrors = useTranslations('errors')
  const router = useRouter()

  const permissions = useAuthStore(s => s.permissions)
  const isAdmin = hasPermission(permissions, Permission.CASES_CHANGE_STATUS)

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingCycle, setEditingCycle] = useState<CaseCycle | null>(null)
  const [sortBy, setSortBy] = useState<string | undefined>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder | undefined>(SortOrder.DESC)
  const pagination = usePagination({ initialLimit: 10 })

  const {
    data: cyclesData,
    isLoading,
    isFetching,
  } = useCaseCycles({
    page: pagination.page,
    limit: pagination.limit,
    ...(sortBy ? { sortBy } : {}),
    ...(sortOrder ? { sortOrder } : {}),
  })

  useEffect(() => {
    if (cyclesData?.pagination) {
      pagination.setTotal(cyclesData.pagination.total)
    }
  }, [cyclesData?.pagination, pagination])

  const createCycle = useCreateCaseCycle()
  const closeCycle = useCloseCaseCycle()
  const updateCycle = useUpdateCaseCycle()
  const activateCycle = useActivateCaseCycle()
  const deleteCycle = useDeleteCaseCycle()

  const handleSort = useCallback(
    (key: string, order: SortOrder) => {
      setSortBy(key)
      setSortOrder(order)
      pagination.setPage(1)
    },
    [pagination]
  )

  const handleCycleClick = useCallback(
    (cycle: CaseCycle) => {
      router.push(`/cases/cycles/${cycle.id}`)
    },
    [router]
  )

  const handleCreateCycle = useCallback(
    (formData: CreateCycleFormValues) => {
      createCycle.mutate(
        {
          name: formData.name,
          ...(formData.description.length > 0 ? { description: formData.description } : {}),
          startDate: formData.startDate,
          ...(formData.endDate.length > 0 ? { endDate: formData.endDate } : {}),
        },
        {
          onSuccess: () => {
            setCreateDialogOpen(false)
            Toast.success(t('cycleCreated'))
          },
          onError: buildErrorToastHandler(tErrors),
        }
      )
    },
    [createCycle, t, tErrors]
  )

  const handleCloseCycle = useCallback(
    async (cycle: CaseCycle) => {
      const confirmed = await SweetAlertDialog.show({
        title: t('closeCycle'),
        text: t('confirmCloseCycle'),
        icon: SweetAlertIcon.WARNING,
      })

      if (!confirmed) {
        return
      }

      closeCycle.mutate(
        { id: cycle.id, data: {} },
        {
          onSuccess: () => {
            Toast.success(t('cycleClosed'))
          },
          onError: buildErrorToastHandler(tErrors),
        }
      )
    },
    [closeCycle, t, tErrors]
  )

  const handleEditClick = useCallback((cycle: CaseCycle) => {
    setEditingCycle(cycle)
    setEditDialogOpen(true)
  }, [])

  const handleEditCycle = useCallback(
    (formData: EditCycleFormValues) => {
      if (!editingCycle) {
        return
      }

      updateCycle.mutate(
        {
          id: editingCycle.id,
          data: {
            name: formData.name,
            ...(formData.description.length > 0 ? { description: formData.description } : {}),
            startDate: formData.startDate,
            ...(formData.endDate.length > 0 ? { endDate: formData.endDate } : {}),
          },
        },
        {
          onSuccess: () => {
            setEditDialogOpen(false)
            setEditingCycle(null)
            Toast.success(t('cycleUpdated'))
          },
          onError: buildErrorToastHandler(tErrors),
        }
      )
    },
    [editingCycle, updateCycle, t, tErrors]
  )

  const handleActivateCycle = useCallback(
    async (cycle: CaseCycle) => {
      const confirmed = await SweetAlertDialog.show({
        title: t('activateCycle'),
        text: t('confirmActivateCycle'),
        icon: SweetAlertIcon.QUESTION,
      })

      if (!confirmed) {
        return
      }

      activateCycle.mutate(cycle.id, {
        onSuccess: () => {
          Toast.success(t('cycleActivated'))
        },
        onError: buildErrorToastHandler(tErrors),
      })
    },
    [activateCycle, t, tErrors]
  )

  const handleDeleteCycle = useCallback(
    async (cycle: CaseCycle) => {
      const confirmed = await SweetAlertDialog.show({
        title: t('deleteCycle'),
        text: t('confirmDeleteCycle'),
        icon: SweetAlertIcon.WARNING,
      })

      if (!confirmed) {
        return
      }

      deleteCycle.mutate(cycle.id, {
        onSuccess: () => {
          Toast.success(t('cycleDeleted'))
        },
        onError: buildErrorToastHandler(tErrors),
      })
    },
    [deleteCycle, t, tErrors]
  )

  const { data: orphanedData } = useOrphanedCaseStats()
  const orphanedStats = orphanedData?.data

  return {
    t,
    router,
    isAdmin,
    orphanedStats,
    cycles: cyclesData?.data ?? [],
    isLoading,
    isFetching,
    createDialogOpen,
    setCreateDialogOpen,
    createCyclePending: createCycle.isPending,
    editDialogOpen,
    setEditDialogOpen,
    editingCycle,
    editCyclePending: updateCycle.isPending,
    sortBy,
    sortOrder,
    handleSort,
    handleCycleClick,
    handleCreateCycle,
    handleCloseCycle,
    handleEditClick,
    handleEditCycle,
    handleActivateCycle,
    handleDeleteCycle,
    pagination,
  }
}
