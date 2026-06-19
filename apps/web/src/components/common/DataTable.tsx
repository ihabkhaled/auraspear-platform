'use client'

import { Inbox, ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import {
  Checkbox,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui'
import { SortOrder } from '@/enums'
import { useDataTableComponent } from '@/hooks'
import { cn, getNestedValue } from '@/lib/utils'
import type { DataTableProps } from '@/types'

function SortIcon({
  colKey,
  sortBy,
  sortOrder,
}: {
  colKey: string
  sortBy?: string | undefined
  sortOrder?: SortOrder | undefined
}) {
  if (sortBy !== colKey) {
    return <ChevronsUpDown className="ml-1 inline h-3 w-3 opacity-40" />
  }
  if (sortOrder === SortOrder.ASC) {
    return <ArrowUp className="text-foreground ml-1 inline h-3 w-3" />
  }
  return <ArrowDown className="text-foreground ml-1 inline h-3 w-3" />
}

export function DataTable<T>({
  columns,
  data,
  emptyMessage,
  emptyIcon,
  emptyDescription,
  loading = false,
  onRowClick,
  selectedIds,
  onSelectionChange,
  keyField,
  sortBy,
  sortOrder,
  onSort,
  rowClassName,
}: DataTableProps<T>) {
  const { t } = useDataTableComponent()

  const hasSelection = selectedIds !== undefined && onSelectionChange !== undefined

  const allSelected =
    hasSelection &&
    data.length > 0 &&
    data.every(row => {
      const id = String(
        keyField ? Reflect.get(row as object, keyField as string) : Reflect.get(row as object, 'id')
      )
      return selectedIds.includes(id)
    })

  const handleSelectAll = () => {
    if (!onSelectionChange) return
    if (allSelected) {
      onSelectionChange([])
    } else {
      const ids = data.map(row =>
        String(
          keyField
            ? Reflect.get(row as object, keyField as string)
            : Reflect.get(row as object, 'id')
        )
      )
      onSelectionChange(ids)
    }
  }

  const handleSelectRow = (id: string) => {
    if (!onSelectionChange || !selectedIds) return
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(sid => sid !== id))
    } else {
      onSelectionChange([...selectedIds, id])
    }
  }

  const handleSortClick = (colKey: string) => {
    if (!onSort) return
    if (sortBy === colKey) {
      onSort(colKey, sortOrder === SortOrder.ASC ? SortOrder.DESC : SortOrder.ASC)
    } else {
      const col = columns.find(c => String(c.key) === colKey)
      onSort(colKey, col?.defaultSortOrder === 'asc' ? SortOrder.ASC : SortOrder.DESC)
    }
  }

  if (loading) {
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {hasSelection && <TableHead className="w-10" />}
              {columns.map(col => (
                <TableHead key={String(col.key)} className={col.className}>
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={`skeleton-${String(i)}`}>
                {hasSelection && (
                  <TableCell>
                    <Skeleton className="h-4 w-4" />
                  </TableCell>
                )}
                {columns.map(col => (
                  <TableCell key={`skeleton-${String(i)}-${String(col.key)}`}>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon ?? <Inbox className="h-6 w-6" />}
        title={emptyMessage ?? t('noData')}
        description={emptyDescription}
      />
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {hasSelection && (
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label={t('all')}
                />
              </TableHead>
            )}
            {columns.map(col => {
              const key = String(col.key)
              const isSortable = col.sortable === true && Boolean(onSort)
              return (
                <TableHead
                  key={key}
                  className={cn(col.className, isSortable && 'cursor-pointer select-none')}
                  onClick={isSortable ? () => handleSortClick(key) : undefined}
                >
                  <span className="inline-flex items-center">
                    {col.label}
                    {isSortable && <SortIcon colKey={key} sortBy={sortBy} sortOrder={sortOrder} />}
                  </span>
                </TableHead>
              )
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, rowIndex) => {
            const rowId = String(
              keyField
                ? Reflect.get(row as object, keyField as string)
                : (Reflect.get(row as object, 'id') ?? rowIndex)
            )
            const isSelected = hasSelection && selectedIds.includes(rowId)

            return (
              <TableRow
                key={rowId}
                data-state={isSelected ? 'selected' : undefined}
                className={cn(onRowClick ? 'cursor-pointer' : undefined, rowClassName?.(row))}
                onClick={() => onRowClick?.(row)}
              >
                {hasSelection && (
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleSelectRow(rowId)}
                      onClick={e => e.stopPropagation()}
                      aria-label={`${t('all')} ${rowId}`}
                    />
                  </TableCell>
                )}
                {columns.map(col => {
                  const value = getNestedValue(row, String(col.key))
                  return (
                    <TableCell key={`${rowId}-${String(col.key)}`} className={col.className}>
                      {col.render ? col.render(value, row) : String(value ?? '')}
                    </TableCell>
                  )
                })}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
