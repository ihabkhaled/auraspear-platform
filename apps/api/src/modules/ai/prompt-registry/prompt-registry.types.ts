export interface PromptTemplateResponse {
  id: string
  tenantId: string
  taskType: string
  version: number
  name: string
  content: string
  isActive: boolean
  createdBy: string
  reviewedBy: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
}
