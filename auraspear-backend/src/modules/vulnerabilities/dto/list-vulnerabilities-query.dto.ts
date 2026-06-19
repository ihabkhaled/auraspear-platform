import { z } from 'zod'

export const ListVulnerabilitiesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z
    .enum(['createdAt', 'cvssScore', 'severity', 'affectedHosts', 'cveId'])
    .default('cvssScore'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  severity: z.string().max(200).optional(),
  patchStatus: z.string().max(200).optional(),
  exploitAvailable: z.string().max(10).optional(),
  query: z.string().max(500).optional(),
})

export type ListVulnerabilitiesQueryDto = z.infer<typeof ListVulnerabilitiesQuerySchema>
