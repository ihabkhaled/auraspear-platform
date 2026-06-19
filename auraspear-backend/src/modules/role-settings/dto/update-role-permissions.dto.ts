import { z } from 'zod'

/**
 * Schema for updating the permission matrix.
 * Expects a record of role → permission keys (allowed permissions).
 */
export const UpdateRolePermissionsSchema = z.object({
  matrix: z.record(z.string(), z.array(z.string())),
})

export type UpdateRolePermissionsDto = z.infer<typeof UpdateRolePermissionsSchema>
