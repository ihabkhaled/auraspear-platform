import { z } from 'zod'
import { CaseTaskStatus } from '../../../common/enums/case-task-status.enum'

export const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  status: z.nativeEnum(CaseTaskStatus).optional(),
  assignee: z.string().max(320).nullable().optional(),
})

export type UpdateTaskDto = z.infer<typeof UpdateTaskSchema>
