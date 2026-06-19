import { z } from 'zod'
import { CaseTaskStatus } from '../../../common/enums/case-task-status.enum'

export const CreateTaskSchema = z.object({
  title: z.string().min(1).max(500),
  status: z.nativeEnum(CaseTaskStatus).default(CaseTaskStatus.PENDING),
  assignee: z.string().max(320).optional(),
})

export type CreateTaskDto = z.infer<typeof CreateTaskSchema>
