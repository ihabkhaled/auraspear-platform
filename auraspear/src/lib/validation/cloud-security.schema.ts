import { z } from 'zod'
import { CloudProvider } from '@/enums'

export const createCloudAccountSchema = z.object({
  provider: z.nativeEnum(CloudProvider),
  accountId: z.string().min(3),
  alias: z.string().min(2),
  region: z.string().min(2),
})

export const editCloudAccountSchema = z.object({
  provider: z.nativeEnum(CloudProvider),
  accountId: z.string().min(3),
  alias: z.string().min(2),
  region: z.string().min(2),
})
