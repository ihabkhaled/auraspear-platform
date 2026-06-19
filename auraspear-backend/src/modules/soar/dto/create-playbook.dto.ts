import { z } from 'zod'

export const SoarTriggerTypeEnum = z.enum(['manual', 'alert', 'incident', 'scheduled'])

export const CreatePlaybookSchema = z.object({
  name: z.string().min(1).max(500),
  description: z.string().max(4096).optional(),
  triggerType: SoarTriggerTypeEnum,
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
    .max(100),
})

export type CreatePlaybookDto = z.infer<typeof CreatePlaybookSchema>
