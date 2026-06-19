import type { AiResponse } from './ai.types'

export interface RunbookRecord {
  id: string
  tenantId: string
  title: string
  content: string
  category: string
  tags: string[]
  createdBy: string
  updatedBy: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateRunbookInput {
  title: string
  content: string
  category?: string | undefined
  tags?: string[] | undefined
}

export interface UpdateRunbookInput {
  title?: string
  content?: string
  category?: string | undefined
  tags?: string[] | undefined
}

export interface RunbookSearchParams {
  page?: number
  limit?: number
  q?: string | undefined
  category?: string | undefined
  sortBy?: string
  sortOrder?: string
}

export interface RunbookColumnTranslations {
  title: string
  category: string
  tags: string
  createdBy: string
  actions: string
  updatedAt: string
}

export interface CreateRunbookFormValues {
  title: string
  content: string
  category: string
  tags: string
}

export interface EditRunbookFormValues {
  title: string
  content: string
  category: string
  tags: string
}

export interface RunbookCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: CreateRunbookFormValues) => void
  isPending: boolean
  t: (key: string) => string
}

export interface RunbookEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: EditRunbookFormValues) => void
  isPending: boolean
  runbook: RunbookRecord | null
  t: (key: string) => string
}

export interface RunbookDetailPanelProps {
  runbook: RunbookRecord | null
  onClose: () => void
  t: (key: string) => string
}

export interface UseRunbookCreateDialogParams {
  tenantId: string | undefined
}

export interface UseRunbookEditDialogParams {
  tenantId: string | undefined
}

export interface KnowledgePageDialogsReturn {
  createDialog: {
    open: boolean
    setOpen: (open: boolean) => void
    onSubmit: (values: CreateRunbookFormValues) => void
    isPending: boolean
  }
  editDialog: {
    open: boolean
    setOpen: (open: boolean) => void
    onSubmit: (values: EditRunbookFormValues) => void
    isPending: boolean
    runbook: RunbookRecord | null
    setRunbook: (runbook: RunbookRecord | null) => void
  }
  detailPanel: {
    runbook: RunbookRecord | null
    setRunbook: (runbook: RunbookRecord | null) => void
    onClose: () => void
  }
}

export interface UseAiKnowledgePanelInput {
  aiGenerate: {
    mutate: (description: string) => void
    data: unknown
    isPending: boolean
  }
  aiSearch: {
    mutate: (query: string) => void
    data: unknown
    isPending: boolean
  }
}

export interface UseRunbookCreateDialogInput {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: CreateRunbookFormValues) => void
}

export interface UseRunbookEditDialogInput {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: EditRunbookFormValues) => void
  runbook: RunbookRecord | null
}

export interface AiKnowledgePanelProps {
  aiGenerate: {
    mutate: (description: string) => void
    data: AiResponse | undefined
    isPending: boolean
  }
  aiSearch: {
    mutate: (query: string) => void
    data: AiResponse | undefined
    isPending: boolean
  }
  t: (key: string) => string
}
