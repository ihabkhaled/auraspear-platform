import { z } from 'zod'
import { SoarTriggerTypeEnum } from './create-playbook.dto'

export const SoarPlaybookStatusEnum = z.enum(['active', 'inactive', 'draft'])

export const UpdatePlaybookSchema = z.object({
  name: z.string().min(1).max(500).optional(),
  description: z.string().max(4096).optional(),
  triggerType: SoarTriggerTypeEnum.optional(),
  triggerConditions: z
    .record(z.unknown())
    .refine(value => JSON.stringify(value).length <= 65536, {
      message: 'Trigger conditions too large (max 64KB)',
    })
    .optional(),
  steps: z
    .array(
      z.record(z.unknown()).refine(value => JSON.stringify(value).length <= 16384, {
        message: 'Individual step too large (max 16KB)',
      })
    )
    .min(1)
    .max(100)
    .optional(),
  status: SoarPlaybookStatusEnum.optional(),
})

export type UpdatePlaybookDto = z.infer<typeof UpdatePlaybookSchema>
