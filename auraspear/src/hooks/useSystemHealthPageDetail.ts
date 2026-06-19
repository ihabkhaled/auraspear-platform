'use client'

import { useState, useCallback } from 'react'
import type { SystemHealthCheck, SystemMetric, UseSystemHealthPageDetailOptions } from '@/types'

export function useSystemHealthPageDetail({ metricsData }: UseSystemHealthPageDetailOptions) {
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedCheck, setSelectedCheck] = useState<SystemHealthCheck | null>(null)
  const [detailMetrics, setDetailMetrics] = useState<SystemMetric[]>([])

  const handleOpenDetail = useCallback(
    (check: SystemHealthCheck) => {
      setSelectedCheck(check)
      const checkMetrics =
        metricsData?.data?.filter((m: SystemMetric) => m.serviceType === check.serviceType) ?? []
      setDetailMetrics(checkMetrics)
      setDetailOpen(true)
    },
    [metricsData]
  )

  return {
    detailOpen,
    setDetailOpen,
    selectedCheck,
    detailMetrics,
    handleOpenDetail,
  }
}
