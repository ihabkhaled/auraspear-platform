import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Toast } from '@/components/common'
import { ComplianceControlStatus } from '@/enums'
import type {
  ComplianceControl,
  ComplianceDetailPanelProps,
  EditComplianceControlFormValues,
} from '@/types'
import { useComplianceControls, useUpdateControl } from './useCompliance'

export function useComplianceDetailPanel({
  framework,
}: Pick<ComplianceDetailPanelProps, 'framework'>) {
  const t = useTranslations('compliance')

  const { data: controlsData, isFetching: controlsLoading } = useComplianceControls(
    framework?.id ?? null
  )

  const updateControlMutation = useUpdateControl()

  const [assessOpen, setAssessOpen] = useState(false)
  const [assessControl, setAssessControl] = useState<ComplianceControl | null>(null)

  const controls = controlsData?.data ?? []

  const scoreDisplay =
    framework?.complianceScore !== null && framework?.complianceScore !== undefined
      ? `${Math.round(framework.complianceScore)}%`
      : '-'

  const scorePercent = framework?.complianceScore ?? 0

  const handleAssessOpen = useCallback((control: ComplianceControl) => {
    setAssessControl(control)
    setAssessOpen(true)
  }, [])

  const handleAssessSubmit = useCallback(
    (data: EditComplianceControlFormValues) => {
      if (!framework || !assessControl) {
        return
      }
      updateControlMutation.mutate(
        {
          frameworkId: framework.id,
          controlId: assessControl.id,
          data: data as unknown as Record<string, unknown>,
        },
        {
          onSuccess: () => {
            Toast.success(t('updateSuccess'))
            setAssessOpen(false)
            setAssessControl(null)
          },
          onError: () => {
            Toast.error(t('updateError'))
          },
        }
      )
    },
    [framework, assessControl, updateControlMutation, t]
  )

  const assessInitialValues: EditComplianceControlFormValues = {
    status: assessControl?.status ?? ComplianceControlStatus.NOT_ASSESSED,
    evidence: assessControl?.evidence ?? '',
    notes: '',
  }

  return {
    t,
    controls,
    controlsLoading,
    scoreDisplay,
    scorePercent,
    assessOpen,
    setAssessOpen,
    assessControl,
    assessInitialValues,
    handleAssessOpen,
    handleAssessSubmit,
    assessLoading: updateControlMutation.isPending,
  }
}
