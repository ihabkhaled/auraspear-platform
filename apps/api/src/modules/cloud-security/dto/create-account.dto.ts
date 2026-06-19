import { z } from 'zod'

export const CloudProviderEnum = z.enum(['aws', 'azure', 'gcp', 'oci'])

export const CreateAccountSchema = z.object({
  provider: CloudProviderEnum,
  accountId: z.string().min(1).max(255),
  alias: z.string().max(255).optional(),
  region: z.string().max(100).optional(),
})

export type CreateAccountDto = z.infer<typeof CreateAccountSchema>
