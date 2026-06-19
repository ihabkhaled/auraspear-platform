import { z } from 'zod'
import { CloudProviderEnum } from './create-account.dto'

export const CloudAccountStatusEnum = z.enum(['connected', 'disconnected', 'error'])

export const UpdateAccountSchema = z.object({
  provider: CloudProviderEnum.optional(),
  accountId: z.string().min(1).max(255).optional(),
  alias: z.string().max(255).nullable().optional(),
  region: z.string().max(100).nullable().optional(),
  status: CloudAccountStatusEnum.optional(),
})

export type UpdateAccountDto = z.infer<typeof UpdateAccountSchema>
