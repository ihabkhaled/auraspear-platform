/**
 * Shared query-building utilities for Prisma-based list endpoints.
 *
 * Eliminates repeated inline sort-order coercion and optional-filter
 * spreading that appears across 30+ module utility / service files.
 */

import { SortOrder } from '../enums'
import type { SortDirection } from './query.types'

export type { SortDirection } from './query.types'

/**
 * Coerce an arbitrary string into a Prisma-compatible sort direction.
 * Returns `SortOrder.ASC` only when the input is literally `'asc'`; every
 * other value (including `undefined`) falls back to `SortOrder.DESC`.
 */
export function toSortOrder(sortOrder?: string): SortDirection {
  return sortOrder === SortOrder.ASC ? SortOrder.ASC : SortOrder.DESC
}

/**
 * Generic order-by builder that replaces 30+ near-identical switch-based
 * `buildXxxOrderBy()` functions across modules.
 *
 * @param fieldMap     Maps DTO sortBy values to Prisma column names.
 *                     When the DTO name matches the column, use the same string
 *                     for both key and value. Use a different value for aliases
 *                     (e.g. `{ complianceScore: 'overallScore' }`).
 * @param defaultField The Prisma column to sort by when `sortBy` is not in `fieldMap`.
 * @param sortBy       The DTO sortBy value (may be `undefined`).
 * @param sortOrder    The DTO sortOrder value (coerced via `toSortOrder`).
 * @param defaultOrder The fallback direction when `sortBy` misses (defaults to DESC).
 *
 * @example
 * ```ts
 * const CASE_SORT_FIELDS: Record<string, string> = {
 *   createdAt: 'createdAt',
 *   updatedAt: 'updatedAt',
 *   severity: 'severity',
 *   status: 'status',
 *   caseNumber: 'caseNumber',
 *   title: 'title',
 * }
 *
 * export function buildCaseOrderBy(sortBy?: string, sortOrder?: string) {
 *   return buildOrderBy(CASE_SORT_FIELDS, 'createdAt', sortBy, sortOrder)
 * }
 * ```
 */
export function buildOrderBy<T extends Record<string, string>>(
  fieldMap: T,
  defaultField: string,
  sortBy?: string,
  sortOrder?: string,
  defaultOrder: SortDirection = SortOrder.DESC
): Record<string, SortDirection> {
  const column = (sortBy && fieldMap[sortBy]) ?? defaultField
  const isDefaultFallback = !sortBy || !fieldMap[sortBy]
  const order = isDefaultFallback ? defaultOrder : toSortOrder(sortOrder)
  return { [column]: order }
}

/**
 * Append a set of optional scalar filters to an existing `where` object.
 *
 * Each entry in `filters` is only applied when its value is **truthy**.
 * This replaces the repetitive `if (x) { where.x = x }` blocks that
 * appear in nearly every `build*ListWhere` helper.
 *
 * @example
 * ```ts
 * const where: Prisma.IncidentWhereInput = { tenantId }
 * applyOptionalFilters(where, {
 *   status: filters.status,
 *   severity: filters.severity,
 *   category: filters.category,
 * })
 * ```
 */
export function applyOptionalFilters<W extends Record<string, unknown>>(
  where: W,
  filters: Record<string, unknown>
): void {
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      Reflect.set(where, key, value)
    }
  }
}
