import type { ReactNode } from 'react'
import type {
  AlertSeverity,
  CaseSeverity,
  ServiceStatus,
  SortOrder,
  StatusDotSize,
  SweetAlertIcon,
} from '@/enums'
import type { LucideIcon } from 'lucide-react'

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface ApiResponse<T> {
  data: T
  pagination?: PaginationMeta
  error?: string
}

export interface Column<T> {
  key: keyof T | string
  label: string
  sortable?: boolean
  /** Default sort direction when this column is first clicked. Defaults to ASC. */
  defaultSortOrder?: SortOrder
  className?: string
  render?: (value: unknown, row: T) => React.ReactNode
}

export interface SelectOption {
  label: string
  value: string
}

export interface UsePaginationOptions {
  initialPage?: number
  initialLimit?: number
}

export interface UsePaginationReturn {
  page: number
  setPage: (page: number) => void
  resetPage: () => void
  limit: number
  setLimit: (limit: number) => void
  total: number
  setTotal: (total: number) => void
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface ApiErrorResponse {
  messageKey?: string
  message?: string
  errors?: string[]
}

export interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  total?: number
}

export interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  emptyMessage?: string
  emptyIcon?: React.ReactNode
  emptyDescription?: string
  loading?: boolean
  onRowClick?: ((row: T) => void) | undefined
  selectedIds?: string[] | undefined
  onSelectionChange?: ((ids: string[]) => void) | undefined
  keyField?: keyof T | undefined
  sortBy?: string | undefined
  sortOrder?: SortOrder | undefined
  onSort?: ((key: string, order: SortOrder) => void) | undefined
  rowClassName?: ((row: T) => string) | undefined
}

export interface PortalShellProps {
  children: React.ReactNode
}

export interface ProxyOptions {
  /** Backend path (e.g. '/alerts'). Defaults to the incoming request path minus '/api' prefix. */
  path?: string
  /** Override HTTP method */
  method?: string
  /** Override request body */
  body?: unknown
  /** Additional query params to merge */
  params?: Record<string, string>
  /** Timeout in milliseconds (default: 30000). Increase for AI endpoints. */
  timeoutMs?: number
}

/** Lightweight user embed returned by backend includes (id, name, email) */
export interface EmbeddedUser {
  id: string
  name: string
  email: string
}

export interface DynamicIdRouteContext {
  params: Promise<{ id: string }>
}

export interface DynamicUserIdRouteContext {
  params: Promise<{ userId: string }>
}

export interface DynamicUserSessionIdRouteContext {
  params: Promise<{ userId: string; sessionId: string }>
}

export interface FetchOptions {
  method?: string
  body?: string
}

export interface CopyButtonProps {
  value: string
  label?: string
}

export interface EmptyStateProps {
  icon?: ReactNode | undefined
  title: string
  description?: string | undefined
  className?: string | undefined
  children?: ReactNode | undefined
}

export interface LoadingSpinnerProps {
  className?: string
}

export interface KPICardProps {
  label: string
  value: string | number
  trend?: number | undefined
  trendLabel?: string | undefined
  icon: ReactNode
  accentColor: string | undefined
  onClick?: (() => void) | undefined
}

export interface ErrorMessageProps {
  message?: string
  onRetry?: () => void
  className?: string
}

export interface RoleGuardProps {
  children: React.ReactNode
}

export interface TimeRangeSelectorProps {
  value: string
  onChange: (value: string) => void
}

export interface PageHeaderProps {
  title: string
  description?: string
  action?:
    | {
        label: string
        icon?: ReactNode
        onClick: () => void
      }
    | undefined
  children?: ReactNode
}

export interface MonoTextProps {
  children: React.ReactNode
  className?: string
}

export interface StatusDotProps {
  status: ServiceStatus
  size?: StatusDotSize
}

export interface MITREBadgeProps {
  techniqueId: string
}

export interface SeverityBadgeProps {
  severity: AlertSeverity | CaseSeverity
}

export interface ShowOptions {
  title?: string
  text: string
  icon?: SweetAlertIcon
  confirmButtonText?: string
  cancelButtonText?: string
}

export interface ShowWithInputOptions {
  title: string
  placeholder?: string
  inputValidator?: (value: string) => string | null
  confirmButtonText?: string
  cancelButtonText?: string
}

export interface InputResult {
  confirmed: boolean
  value: string
}

export interface SidebarNavItemProps {
  icon: LucideIcon
  label: string
  href: string
  active?: boolean | undefined
  badge?: number | undefined
  collapsed?: boolean | undefined
  onClick?: (() => void) | undefined
}

export interface BrandLogoProps {
  collapsed?: boolean
}

export interface ProvidersProps {
  children: ReactNode
  messages: Record<string, unknown>
  locale: string
}

export interface AiResultCardResult {
  result?: string
  confidence?: number
  provider?: string
  model?: string
}

export interface AiResultCardProps {
  result?: AiResultCardResult | null
  isLoading?: boolean
  label?: string
  className?: string
}

export interface CollapsibleSectionProps {
  title: string
  icon?: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  className?: string
  badge?: ReactNode
}

export interface UseDeleteWithConfirmationOptions<TId = string> {
  mutationFn: (id: TId) => Promise<unknown>
  queryKeysToInvalidate: string[][]
  confirmText: string
  successMessage: string
}

/** Base translation function prop — use in all component props that accept t() */
export type TranslationFn = (key: string) => string

export interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}
