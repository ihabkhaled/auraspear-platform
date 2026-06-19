import { z } from 'zod'

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required').max(128),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters')
      .max(128)
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!#$%&*@^])/,
        'Password must contain uppercase, lowercase, digit, and special character'
      ),
    confirmPassword: z.string().min(1, 'Password confirmation is required').max(128),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: 'errors.validation.confirmPassword.passwordMismatch',
    path: ['confirmPassword'],
  })
  .refine(data => data.newPassword !== data.currentPassword, {
    message: 'errors.validation.newPassword.sameAsOld',
    path: ['newPassword'],
  })

export type ChangePasswordDto = z.infer<typeof ChangePasswordSchema>
