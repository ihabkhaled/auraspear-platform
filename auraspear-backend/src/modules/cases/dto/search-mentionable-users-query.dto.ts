import { z } from 'zod'

export const SearchMentionableUsersQuerySchema = z.object({
  query: z.string().min(1).max(100),
  limit: z.coerce.number().int().min(1).max(20).default(10),
})

export type SearchMentionableUsersQueryDto = z.infer<typeof SearchMentionableUsersQuerySchema>
