import { z } from 'zod'

export const AuthLogoutSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required').max(4096).optional(),
})

export type AuthLogoutDto = z.infer<typeof AuthLogoutSchema>
