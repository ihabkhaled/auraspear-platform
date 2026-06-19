import { z } from 'zod'

export const AuthCallbackSchema = z.object({
  code: z.string().min(1, 'Authorization code is required').max(2048),
  state: z.string().min(1, 'State parameter is required for CSRF protection').max(2048),
  redirect_uri: z.string().min(1, 'Redirect URI is required').max(2048),
})

export type AuthCallbackDto = z.infer<typeof AuthCallbackSchema>
