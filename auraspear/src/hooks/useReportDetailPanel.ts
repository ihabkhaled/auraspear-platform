import { useTranslations } from 'next-intl'
import { formatFileSize } from '@/lib/utils'
import type { ReportDetailPanelProps } from '@/types'

export function useReportDetailPanel({ report }: Pick<ReportDetailPanelProps, 'report'>) {
  const t = useTranslations('reports')

  const fileSizeDisplay = report?.fileSize ? formatFileSize(report.fileSize) : '-'

  return {
    t,
    fileSizeDisplay,
  }
}
