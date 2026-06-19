import { z } from 'zod'
import { TenantEnvironment, UserRole } from '@/enums'

export const assignUserSchema = z.object({
  email: z.string().email(),
  role: z.string().min(1),
  name: z.string().max(255),
  password: z.string().max(128),
})

export const editUserSchema = z.object({
  name: z.string().min(1).max(255),
  role: z.string().min(1),
  password: z.string().max(128).optional().or(z.literal('')),
})

export const userRoleSchema = z.object({
  role: z.nativeEnum(UserRole),
  permissions: z.array(z.string()).min(1),
})

export const tenantProfileSchema = z.object({
  name: z.string().min(2).max(100),
  environment: z.nativeEnum(TenantEnvironment),
  settings: z.string().optional(),
})

export const editTenantSchema = z.object({
  name: z.string().min(1).max(255),
})

export const createTenantSchema = z.object({
  name: z.string().min(2).max(255),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[\da-z-]+$/),
})
