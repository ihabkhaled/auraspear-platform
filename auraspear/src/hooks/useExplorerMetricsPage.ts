'use client'

import { useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Toast } from '@/components/common'
import { SortOrder } from '@/enums'
import { useInfluxDBBuckets, useInfluxDBQuery } from '@/hooks'
import { METRICS_ROWS_PER_PAGE } from '@/lib/constants/explorer'
import { parseFluxCSV } from '@/lib/utils'

export function useExplorerMetricsPage() {
  const t = useTranslations('explorer')
  const tErrors = useTranslations('errors')

  const [bucket, setBucket] = useState('')
  const [measurement, setMeasurement] = useState('')
  const [range, setRange] = useState('-1h')
  const [limit, setLimit] = useState(1000)
  const [queryEnabled, setQueryEnabled] = useState(false)

  // Table state
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<string | undefined>()
  const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.DESC)
  const [currentPage, setCurrentPage] = useState(1)

  const { data: bucketsData, isLoading: bucketsLoading, error: bucketsError } = useInfluxDBBuckets()
  const {
    data: queryData,
    isFetching: queryFetching,
    error: queryError,
  } = useInfluxDBQuery(
    { bucket, measurement: measurement || undefined, range, limit },
    queryEnabled && bucket.length > 0
  )

  const handleQuery = useCallback(() => {
    if (!bucket) {
      Toast.warning(t('metrics.selectBucket'))
      return
    }
    setCurrentPage(1)
    setSearch('')
    setSortBy(undefined)
    setQueryEnabled(true)
  }, [bucket, t])

  // Parse CSV data into rows/columns
  const parsed = useMemo(() => {
    const csvData = queryData?.data?.data
    if (!csvData || csvData.trim().length === 0) return { columns: [], rows: [] }
    return parseFluxCSV(csvData)
  }, [queryData])

  // Filter rows by search
  const filteredRows = useMemo(() => {
    if (!search) return parsed.rows
    const lowerSearch = search.toLowerCase()
    return parsed.rows.filter(row =>
      Object.values(row).some(v => v.toLowerCase().includes(lowerSearch))
    )
  }, [parsed.rows, search])

  // Sort rows
  const sortedRows = useMemo(() => {
    if (!sortBy) return filteredRows
    const sorted = [...filteredRows]
    sorted.sort((a, b) => {
      const aVal = (Reflect.get(a, sortBy) as string) ?? ''
      const bVal = (Reflect.get(b, sortBy) as string) ?? ''
      // Try numeric comparison first
      const aNum = Number(aVal)
      const bNum = Number(bVal)
      if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
        return sortOrder === SortOrder.ASC ? aNum - bNum : bNum - aNum
      }
      const cmp = aVal.localeCompare(bVal)
      return sortOrder === SortOrder.ASC ? cmp : -cmp
    })
    return sorted
  }, [filteredRows, sortBy, sortOrder])

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / METRICS_ROWS_PER_PAGE))
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * METRICS_ROWS_PER_PAGE
    return sortedRows.slice(start, start + METRICS_ROWS_PER_PAGE)
  }, [sortedRows, currentPage])

  const handleSort = useCallback((key: string, order: SortOrder) => {
    setSortBy(key)
    setSortOrder(order)
    setCurrentPage(1)
  }, [])

  const handleBucketChange = useCallback((v: string) => {
    setBucket(v)
    setQueryEnabled(false)
  }, [])

  const handleMeasurementChange = useCallback((value: string) => {
    setMeasurement(value)
    setQueryEnabled(false)
  }, [])

  const handleRangeChange = useCallback((v: string) => {
    setRange(v)
    setQueryEnabled(false)
  }, [])

  const handleLimitChange = useCallback((value: number) => {
    setLimit(value || 100)
    setQueryEnabled(false)
  }, [])

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    setCurrentPage(1)
  }, [])

  const buckets = (bucketsData?.data ?? []) as Array<{ name: string }>

  return {
    t,
    tErrors,
    bucket,
    measurement,
    range,
    limit,
    search,
    sortBy,
    sortOrder,
    currentPage,
    setCurrentPage,
    bucketsLoading,
    bucketsError,
    queryData,
    queryFetching,
    queryError,
    handleQuery,
    parsed,
    filteredRows,
    sortedRows,
    totalPages,
    paginatedRows,
    handleSort,
    handleBucketChange,
    handleMeasurementChange,
    handleRangeChange,
    handleLimitChange,
    handleSearchChange,
    buckets,
  }
}
