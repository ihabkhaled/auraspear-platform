export interface LlmConnectorRecord {
  id: string
  tenantId: string
  name: string
  description: string | null
  enabled: boolean
  baseUrl: string
  apiKey: string
  defaultModel: string | null
  organizationId: string | null
  maxTokensParam: string
  timeout: number
  lastTestAt: string | null
  lastTestOk: boolean | null
  lastError: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateLlmConnectorInput {
  name: string
  description?: string
  baseUrl: string
  apiKey: string
  defaultModel?: string
  organizationId?: string
  maxTokensParam?: string
  timeout?: number
}

export interface UpdateLlmConnectorInput {
  name?: string
  description?: string
  baseUrl?: string
  apiKey?: string
  defaultModel?: string | null
  organizationId?: string | null
  maxTokensParam?: string
  timeout?: number
  enabled?: boolean
}

export interface CreateLlmConnectorFormValues {
  name: string
  description: string
  baseUrl: string
  apiKey: string
  defaultModel: string
  organizationId: string
  maxTokensParam: string
  timeout: number
}

export interface EditLlmConnectorFormValues {
  name: string
  description: string
  baseUrl: string
  apiKey: string
  defaultModel: string
  organizationId: string
  maxTokensParam: string
  timeout: number
}

export interface LlmConnectorCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateLlmConnectorFormValues) => void
  loading?: boolean
}

export interface LlmConnectorEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: EditLlmConnectorFormValues) => void
  initialValues: EditLlmConnectorFormValues
  loading?: boolean
}

export interface LlmConnectorColumnTranslations {
  llmConnectors: (key: string) => string
}

export interface UseLlmConnectorCreateDialogParams {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateLlmConnectorFormValues) => void
}

export interface UseLlmConnectorEditDialogParams {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: EditLlmConnectorFormValues) => void
  initialValues: EditLlmConnectorFormValues
}

export interface LlmConnectorsPageDialogsReturn {
  selectedConnectorId: string | null
  setSelectedConnectorId: (id: string | null) => void
  createDialogOpen: boolean
  setCreateDialogOpen: (open: boolean) => void
  editDialogOpen: boolean
  setEditDialogOpen: (open: boolean) => void
  editConnector: LlmConnectorRecord | null
  setEditConnector: (connector: LlmConnectorRecord | null) => void
  editInitialValues: EditLlmConnectorFormValues | null
  handleEditOpen: (connector: LlmConnectorRecord) => void
  findSelectedConnector: (connectors: LlmConnectorRecord[] | undefined) => LlmConnectorRecord | null
}

import type { AiConnectorType } from '@/enums'

export interface AvailableAiConnector {
  key: string
  label: string
  type: AiConnectorType
  enabled: boolean
}

export interface LlmConnectorCardProps {
  connector: LlmConnectorRecord
  t: (key: string) => string
}
