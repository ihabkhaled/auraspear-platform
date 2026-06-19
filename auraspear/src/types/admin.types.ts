import type {
  IntegrationStatus,
  TenantEnvironment,
  UserRole,
  UserStatus,
  ServiceStatus,
  SortOrder,
} from '@/enums'

export interface ServiceHealthGridProps {
  services: ServiceHealth[]
}

export interface IntegrationConfigPanelProps {
  integrations: IntegrationConfig[]
  onTestConnection: (integrationId: string) => void
  onConfigure: (integrationId: string) => void
  testingId?: string
}

export interface ServiceHealthCardProps {
  service: ServiceHealth
}

export interface TenantUserTableProps {
  users: TenantUser[]
  loading?: boolean
  onUserClick?: (user: TenantUser) => void
  onEditUser?: (user: TenantUser) => void
  onRemoveUser?: (user: TenantUser) => void
  onBlockUser?: (user: TenantUser) => void
  onUnblockUser?: (user: TenantUser) => void
  onRestoreUser?: (user: TenantUser) => void
  onImpersonateUser?: (user: TenantUser) => void
  showActions?: boolean
  callerRole?: UserRole | undefined
  currentUserId?: string | undefined
  sortBy?: string | undefined
  sortOrder?: SortOrder | undefined
  onSort?: ((key: string, order: SortOrder) => void) | undefined
}

export interface Tenant {
  id: string
  name: string
  slug: string
  userCount: number
  alertCount: number
  caseCount: number
  createdAt: string
}

export interface TenantUser {
  id: string
  name: string
  email: string
  role: UserRole
  status: UserStatus
  lastLoginAt: string | null
  mfaEnabled: boolean
  isProtected: boolean
  avatar?: string
}

export interface ServiceHealth {
  name: string
  type: string
  status: ServiceStatus
  latencyMs: number
}

export interface AuditLogEntry {
  id: string
  createdAt: string
  actor: string
  action: string
  resource: string
  resourceId: string | null
  ipAddress: string | null
  details?: string | null
}

export interface AuditLogTableProps {
  logs: AuditLogEntry[]
  loading?: boolean
  sortBy?: string | undefined
  sortOrder?: SortOrder | undefined
  onSort?: ((key: string, order: SortOrder) => void) | undefined
}

export interface IntegrationConfig {
  id: string
  name: string
  description: string
  status: IntegrationStatus
  configFields?: Record<string, string>
}

export interface AuditLogParams {
  page?: number
  limit?: number
  actor?: string
  action?: string
  sortBy?: string
  sortOrder?: SortOrder
}

export interface TenantUserListParams {
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  sortOrder?: SortOrder
  role?: string
  status?: string
}

export interface CreateTenantInput {
  name: string
  slug: string
}

export interface AddUserInput {
  email: string
  name: string
  password: string
  role: string
}

export interface AssignUserInput {
  email: string
  role: string
  name?: string
  password?: string
}

export interface CheckEmailResult {
  exists: boolean
  user: { id: string; name: string; email: string } | null
  alreadyInTenant: boolean
}

export interface TenantListParams {
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  sortOrder?: SortOrder
}

/** Lightweight user info returned by GET /members for assignee pickers. */
export interface TenantMember {
  id: string
  name: string
  email: string
}

export interface AddUserFormValues {
  name: string
  email: string
  password: string
  role: string
}

export interface AddUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: AddUserFormValues) => void
  loading: boolean
  callerRole?: UserRole | undefined
}

export interface UseAddUserDialogParams {
  onSubmit: AddUserDialogProps['onSubmit']
  onOpenChange: AddUserDialogProps['onOpenChange']
  callerRole: AddUserDialogProps['callerRole']
}

export interface EditUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: TenantUser | null
  onSubmit: (data: { name: string; role: string; password?: string }) => void
  loading: boolean
  callerRole?: UserRole | undefined
}

export interface AssignUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: AssignUserInput) => void
  loading: boolean
  tenantId: string
  callerRole?: UserRole | undefined
}

export interface CreateTenantDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: CreateTenantFormValues) => void
  loading: boolean
}

export interface CreateTenantFormValues {
  name: string
  slug: string
}

export interface EditTenantDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenant: Tenant | null
  onSubmit: (data: EditTenantFormValues) => void
  loading: boolean
}

export interface EditTenantFormValues {
  name: string
}

export interface AssignUserFormValues {
  email: string
  role: string
  name: string
  password: string
}

export interface EditUserFormValues {
  name: string
  role: string
  password?: string | undefined
}

export interface UserRoleFormValues {
  role: UserRole
  permissions: string[]
}

export interface UserRoleFormProps {
  defaultValues?: Partial<UserRoleFormValues>
  availablePermissions: string[]
  onSubmit: (values: UserRoleFormValues) => void
  onCancel: () => void
  loading?: boolean
}

export interface TenantProfileFormValues {
  name: string
  environment: TenantEnvironment
  settings?: string | undefined
}

export interface TenantProfileFormProps {
  defaultValues?: Partial<TenantProfileFormValues>
  onSubmit: (values: TenantProfileFormValues) => void
  onCancel: () => void
  loading?: boolean
}

export interface TenantListTableProps {
  tenants: Tenant[]
  loading: boolean
  onTenantClick: ((tenant: Tenant) => void) | undefined
  onEditTenant?: (tenant: Tenant) => void
  onDeleteTenant?: (tenant: Tenant) => void
  userRole?: UserRole
  sortBy?: string | undefined
  sortOrder?: SortOrder | undefined
  onSort?: ((key: string, order: SortOrder) => void) | undefined
}
