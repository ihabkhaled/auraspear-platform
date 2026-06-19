import { z } from 'zod'
import { ApprovalStatus } from '../../../common/enums'

export const ResolveApprovalSchema = z.object({
  status: z.enum([ApprovalStatus.APPROVED, ApprovalStatus.REJECTED]),
  comment: z.string().max(2000).nullable().optional(),
})

export type ResolveApprovalDto = z.infer<typeof ResolveApprovalSchema>
