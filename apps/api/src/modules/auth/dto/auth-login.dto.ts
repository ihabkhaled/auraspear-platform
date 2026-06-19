import { z } from 'zod'

export const AuthLoginSchema = z.object({
  email: z.string().email('Valid email is required').max(320),
  password: z.string().min(1, 'Password is required').max(128),
})

export type AuthLoginDto = z.infer<typeof AuthLoginSchema>
