import { z } from 'zod'

export const AuthRefreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required').max(4096).optional(),
})

export type AuthRefreshDto = z.infer<typeof AuthRefreshSchema>
