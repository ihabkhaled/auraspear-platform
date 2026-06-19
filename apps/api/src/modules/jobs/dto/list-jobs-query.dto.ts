import { z } from 'zod'
import { SortOrder } from '../../../common/enums'
import { JobStatus, JobType } from '../enums/job.enums'

export const ListJobsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.nativeEnum(JobType).optional(),
  status: z.nativeEnum(JobStatus).optional(),
  sortBy: z
    .enum([
      'createdAt',
      'updatedAt',
      'type',
      'status',
      'attempts',
      'scheduledAt',
      'completedAt',
      'createdBy',
    ])
    .default('createdAt'),
  sortOrder: z.nativeEnum(SortOrder).default(SortOrder.DESC),
})

export type ListJobsQueryDto = z.infer<typeof ListJobsQuerySchema>
