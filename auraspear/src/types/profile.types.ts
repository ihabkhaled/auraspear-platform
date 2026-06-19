import type { DashboardDensity, DashboardPanelKey, UserRole } from '@/enums'

export interface UserProfile {
  id: string
  email: string
  name: string
  role: UserRole
  tenantId: string
  tenantSlug: string
  createdAt: string
  updatedAt: string
}

export interface UpdateProfileInput {
  name: string
  currentPassword: string
}

export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export interface PreferencesResponse {
  data: UserPreferences
}

export interface UserPreferences {
  theme: string
  language: string
  dashboardDensity?: DashboardDensity | undefined
  collapsedDashboardPanels?: DashboardPanelKey[] | undefined
  notificationsEmail?: boolean | undefined
  notificationsInApp?: boolean | undefined
  notifyCriticalAlerts?: boolean | undefined
  notifyHighAlerts?: boolean | undefined
  notifyCaseAssignments?: boolean | undefined
  notifyIncidentUpdates?: boolean | undefined
  notifyComplianceAlerts?: boolean | undefined
  notifyCaseUpdates?: boolean | undefined
  notifyCaseComments?: boolean | undefined
  notifyCaseActivity?: boolean | undefined
  notifyUserManagement?: boolean | undefined
  retentionAlerts?: string | undefined
  retentionLogs?: string | undefined
  retentionIncidents?: string | undefined
  retentionAuditLogs?: string | undefined
}

export interface ProfilePersonalInfoProps {
  displayEmail: string
  roleLabelKey: string | undefined
  displayTenant: string
  t: (key: string) => string
  tRoles: (key: string) => string
}

export interface ProfileUpdateNameFormProps {
  name: string
  namePassword: string
  showNamePassword: boolean
  canEditProfile: boolean
  updateProfilePending: boolean
  onNameChange: (value: string) => void
  onNamePasswordChange: (value: string) => void
  onToggleVisibility: () => void
  onSubmit: (e: React.FormEvent) => void
  t: (key: string) => string
}

export interface ProfileChangePasswordFormProps {
  currentPassword: string
  newPassword: string
  confirmPassword: string
  showCurrentPassword: boolean
  showNewPassword: boolean
  showConfirmPassword: boolean
  canEditProfile: boolean
  changePasswordPending: boolean
  onCurrentPasswordChange: (value: string) => void
  onNewPasswordChange: (value: string) => void
  onConfirmPasswordChange: (value: string) => void
  onToggleCurrentVisibility: () => void
  onToggleNewVisibility: () => void
  onToggleConfirmVisibility: () => void
  onSubmit: (e: React.FormEvent) => void
  t: (key: string) => string
}
