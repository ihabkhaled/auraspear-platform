import { z } from 'zod'

export const ToggleScheduleSchema = z.object({
  enabled: z.boolean(),
})

export type ToggleScheduleDto = z.infer<typeof ToggleScheduleSchema>

export const PauseScheduleSchema = z.object({
  paused: z.boolean(),
})

export type PauseScheduleDto = z.infer<typeof PauseScheduleSchema>
