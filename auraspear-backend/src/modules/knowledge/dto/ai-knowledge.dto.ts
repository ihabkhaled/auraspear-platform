import { z } from 'zod'

export const AiGenerateRunbookSchema = z.object({
  description: z.string().min(10, 'Description must be at least 10 characters').max(4000),
  connector: z.string().max(200).optional(),
})

export type AiGenerateRunbookDto = z.infer<typeof AiGenerateRunbookSchema>

export const AiSearchKnowledgeSchema = z.object({
  query: z.string().min(2, 'Query must be at least 2 characters').max(2000),
  connector: z.string().max(200).optional(),
})

export type AiSearchKnowledgeDto = z.infer<typeof AiSearchKnowledgeSchema>
