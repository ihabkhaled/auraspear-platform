import type {
  CloudAccountStatus,
  CloudFindingSeverity,
  CloudFindingStatus,
  CloudProvider,
  SortOrder,
} from '@/enums'

export interface CloudAccount {
  id: string
  tenantId: string
  provider: CloudProvider
  accountId: string
  alias: string | null
  region: string | null
  status: CloudAccountStatus
  lastScanAt: string | null
  findingsCount: number
  complianceScore: number
  createdAt: string
  updatedAt: string
}

export interface CloudFinding {
  id: string
  tenantId: string
  cloudAccountId: string
  title: string
  description: string | null
  severity: CloudFindingSeverity
  status: CloudFindingStatus
  resourceId: string
  resourceType: string
  remediationSteps: string | null
  detectedAt: string
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CloudSecurityStats {
  totalAccounts: number
  connectedAccounts: number
  disconnectedAccounts: number
  errorAccounts: number
  totalFindings: number
  openFindings: number
  resolvedFindings: number
  suppressedFindings: number
  criticalFindings: number
  highFindings: number
}

export interface CloudAccountSearchParams {
  page?: number
  limit?: number
  provider?: string
  status?: string
  query?: string
  sortBy?: string
  sortOrder?: SortOrder
}

export interface CloudFindingSearchParams {
  page?: number
  limit?: number
  cloudAccountId?: string
  provider?: string
  severity?: string
  status?: string
  query?: string
  sortBy?: string
  sortOrder?: SortOrder
}

export interface CreateCloudAccountFormValues {
  provider: CloudProvider
  accountId: string
  alias: string
  region: string
}

export interface EditCloudAccountFormValues {
  provider: CloudProvider
  accountId: string
  alias: string
  region: string
}

export interface CloudAccountCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateCloudAccountFormValues) => void
  loading?: boolean
}

export interface CloudAccountEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: EditCloudAccountFormValues) => void
  initialValues: EditCloudAccountFormValues
  loading?: boolean
}

export interface CloudAccountDeleteDialogProps {
  accountName: string
  onConfirm: () => void
  loading?: boolean
}

export interface CloudSecurityKpiCardsProps {
  stats: CloudSecurityStats | undefined
  isLoading: boolean
}

export interface CloudSecurityFiltersProps {
  searchQuery: string
  providerFilter: string
  statusFilter: string
  onSearchChange: (value: string) => void
  onProviderChange: (value: string) => void
  onStatusChange: (value: string) => void
}

export interface CloudAccountDetailPanelProps {
  account: CloudAccount | null
  findings: CloudFinding[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export interface CloudFindingCardProps {
  finding: CloudFinding
  onResolve: (id: string) => void
  onSuppress: (id: string) => void
}

export interface CloudSecurityColumnTranslations {
  cloudSecurity: (key: string) => string
  common: (key: string) => string
}

export interface UseCloudAccountCreateDialogParams {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateCloudAccountFormValues) => void
}

export interface UseCloudAccountEditDialogParams {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: EditCloudAccountFormValues) => void
  initialValues: EditCloudAccountFormValues
}

export interface UseCloudAccountDeleteDialogParams {
  accountName: string
  onConfirm: () => void
}

export interface AiCloudTriageResult {
  result: string
  reasoning: string[]
  confidence: number
  model: string
  provider: string
  tokensUsed: {
    input: number
    output: number
  }
}

export interface CloudSecurityPageDialogsReturn {
  readonly createOpen: boolean
  readonly setCreateOpen: React.Dispatch<React.SetStateAction<boolean>>
  readonly editOpen: boolean
  readonly setEditOpen: React.Dispatch<React.SetStateAction<boolean>>
  readonly detailOpen: boolean
  readonly setDetailOpen: React.Dispatch<React.SetStateAction<boolean>>
  readonly selectedAccount: CloudAccount | null
  readonly setSelectedAccount: React.Dispatch<React.SetStateAction<CloudAccount | null>>
  readonly handleRowClick: (account: CloudAccount) => void
  readonly handleOpenEdit: (account: CloudAccount) => void
}
