import { z } from 'zod'
import { UebaEntityType } from '@/enums'

export const createUebaEntitySchema = z.object({
  entityName: z.string().min(2).max(320),
  entityType: z.nativeEnum(UebaEntityType),
})

export const editUebaEntitySchema = z.object({
  entityName: z.string().min(2).max(320),
  entityType: z.nativeEnum(UebaEntityType),
})
