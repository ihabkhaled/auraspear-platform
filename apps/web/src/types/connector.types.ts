import type { ConnectorAuthType, ConnectorCategory, ConnectorStatus, ConnectorType } from '@/enums'
import type { ConnectorFormValues } from '@/lib/validation/connectors.schema'
import type {
  WorkspaceEntity,
  WorkspaceQuickAction,
  WorkspaceRecentItem,
  WorkspaceSearchRequest,
  WorkspaceSearchResponse,
  WorkspaceSummaryCard,
} from './connector-workspace.types'
import type { LucideIcon } from 'lucide-react'
import type { useTranslations } from 'next-intl'
import type { FieldErrors, UseFormRegister } from 'react-hook-form'

/** Backend connector response shape */
export interface ConnectorRecord {
  type: ConnectorType
  name: string
  enabled: boolean
  authType: ConnectorAuthType
  config: Record<string, unknown>
  lastTestAt: string | null
  lastTestOk: boolean | null
  lastError: string | null
}

export interface ConnectorTestResult {
  type: ConnectorType
  ok: boolean
  latencyMs: number
  details: string
  testedAt: string
}

export interface ConnectorStats {
  totalConnectors: number
  enabledConnectors: number
  healthyConnectors: number
  failingConnectors: number
  untestedConnectors: number
}

export interface CreateConnectorInput {
  type: ConnectorType
  name: string
  enabled: boolean
  authType: ConnectorAuthType
  config: Record<string, unknown>
}

export interface ToggleConnectorInput {
  type: ConnectorType
  enabled: boolean
}

export interface DeleteConnectorResult {
  deleted: boolean
}

export interface ConnectorSyncResult {
  success: boolean
  message: string
  ingested?: number | undefined
}

export interface ConnectorSyncStatusRecord {
  type: ConnectorType
  lastSyncAt: string | null
  syncEnabled: boolean
  enabled: boolean
}

export interface ConnectorMeta {
  label: string
  descriptionKey: string
  category: ConnectorCategory
}

export interface SecurityPosture {
  mTLS: boolean
  iam: boolean
  encryption: boolean
}

export interface ConnectorIcon {
  type: ConnectorType
  icon: LucideIcon
}

export interface SecretFieldProps extends Omit<React.ComponentProps<'input'>, 'id'> {
  id: keyof ConnectorFormValues
  fieldDisabled: boolean
  isVisible: boolean
  onToggle: () => void
  isRedacted: boolean
  secretSavedLabel: string
  registerFn: UseFormRegister<ConnectorFormValues>
}

export interface WorkspaceEntitiesProps {
  entities: WorkspaceEntity[]
  total: number
  page: number
  pageSize: number
  loading?: boolean
  onPageChange?: (page: number) => void
}

export interface ConnectorCardProps {
  connector: ConnectorRecord
}

export interface AddConnectorCardProps {
  connectorType: ConnectorType
}

export interface StatusBadgeProps {
  status: ConnectorStatus
}

export interface SecurityIndicatorsProps {
  type: ConnectorType
}

export interface ConnectorFormProps {
  type: ConnectorType
  connector: ConnectorRecord | undefined
  readOnly?: boolean
  onCreateSubmit?: (data: ConnectorFormValues) => void
  createPending?: boolean
}

export interface FieldErrorProps {
  name: keyof ConnectorFormValues
  errors: FieldErrors<ConnectorFormValues>
  tValidation: ReturnType<typeof useTranslations>
}

export interface WorkspaceSummaryGridProps {
  cards: WorkspaceSummaryCard[]
  loading?: boolean
}

export interface WorkspaceSearchPanelProps {
  onSearch: (request: WorkspaceSearchRequest) => void
  results: WorkspaceSearchResponse | undefined
  loading: boolean
}

export interface WorkspaceRecentActivityProps {
  items: WorkspaceRecentItem[]
  loading?: boolean
  title?: string
}

export interface WorkspaceHeaderProps {
  name: string
  description: string
  status: string
  lastTestedAt: string | null
  Icon?: LucideIcon
  onBack: () => void
}

export interface WorkspaceActionsPanelProps {
  actions: WorkspaceQuickAction[]
  onExecute: (action: string, params?: Record<string, unknown>) => void
  loading?: boolean
  isEditor?: boolean
}

export interface UseWorkspaceSearchPanelParams {
  onSearch: (request: WorkspaceSearchRequest) => void
}

export interface UseConnectorFormParams {
  type: ConnectorFormProps['type']
  connector: ConnectorFormProps['connector']
  readOnly: ConnectorFormProps['readOnly'] | undefined
  onCreateSubmit: ConnectorFormProps['onCreateSubmit'] | undefined
}

export interface ConnectorDetailPageProps {
  params: Promise<{ type: string }>
}
